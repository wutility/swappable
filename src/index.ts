import './index.css';
import { SwappableEvents, SwappableItemData, SwappableOptions } from './types';

export default class Swappable {
  private container: HTMLElement;
  private options: Required<SwappableOptions>;
  private itemsData: SwappableItemData[] = [];

  private isDragging = false;
  private isMoving = false;
  private draggedItem: HTMLElement | null = null;
  private targetItem: HTMLElement | null = null;
  private ghostElement: HTMLElement | null = null;
  private dragRAF: number | null = null;

  private eventListeners: Partial<SwappableEvents> = {};
  private itemRects: Map<HTMLElement, DOMRect> = new Map();
  private ghostOffset = { x: 0, y: 0 };

  private animatingElements = new Set<HTMLElement>();
  private layoutAnimationCounter = 0;

  private boundHandleDragStart = this._handleDragStart.bind(this);
  private boundThrottledDragMove = this._throttledDragMove.bind(this);
  private boundHandleDragEnd = this._handleDragEnd.bind(this);

  constructor(containerOrSelector: string | HTMLElement, options: SwappableOptions = {}) {
    if (typeof containerOrSelector === 'string') {
      this.container = document.querySelector(containerOrSelector) as HTMLElement;
    } else if (containerOrSelector instanceof HTMLElement) {
      this.container = containerOrSelector;
    } else {
      throw new Error('Swappable: Invalid container provided. Must be a selector string or an HTMLElement.');
    }

    if (!this.container) {
      throw new Error('Swappable: Container not found.');
    }

    const defaults: Required<SwappableOptions> = {
      dragEnabled: true,
      dragHandle: null,
      layoutDuration: 300,
      swapDuration: 300,
      layoutEasing: 'ease',
      itemsPerRow: 4,
      classNames: {
        item: 'grid-item',
        drag: 'dragging',
        placeholder: 'placeholder',
        ghost: 'ghost',
        hidden: 'hidden',
      },
    };

    this.options = { ...defaults, ...options };
    this.options.classNames = { ...defaults.classNames, ...options.classNames };

    this._setCSSVar('--items-per-row', String(this.options.itemsPerRow));
    this._setCSSVar('--layout-duration', `${this.options.layoutDuration}ms`);
    this._setCSSVar('--layout-easing', this.options.layoutEasing);

    this.container.classList.add('swappable-grid');

    this._initItems();
    this._bindEvents();
  }

  private _setCSSVar(name: string, value: string) {
    this.container.style.setProperty(name, value);
  }



  private _initItems(): void {
    this.itemsData = [];
    const children = Array.from(this.container.children) as HTMLElement[];

    children.forEach((el, idx) => {
      if (!el.classList.contains(this.options.classNames.item!)) {
        el.classList.add(this.options.classNames.item!);
      }
      this.itemsData.push({ index: idx, element: el });
    });
  }

  private _getEventCoords(e: PointerEvent): { clientX: number; clientY: number } {
    return { clientX: e.clientX, clientY: e.clientY };
  }

  private _bindEvents(): void {
    this.container.addEventListener('pointerdown', this.boundHandleDragStart, { passive: false });
  }

  private _handleDragStart(e: PointerEvent): void {
    if (e.button !== 0 || !this.options.dragEnabled) return;

    const target = e.target as HTMLElement;
    const handle = this.options.dragHandle ? target.closest(this.options.dragHandle) : target;
    if (!handle) return;

    const itemSelector = `.${this.options.classNames.item}`;
    const clickedItem = (handle as HTMLElement).closest(itemSelector) as HTMLElement | null;
    if (clickedItem) {
      e.preventDefault();
      this.isDragging = true;
      this.draggedItem = clickedItem;
      this.draggedItem.style.willChange = 'transform';
      this.draggedItem.classList.add(this.options.classNames.hidden!);
      this.itemRects.clear();
      this.itemsData.forEach(({ element }) => {
        if (element !== this.draggedItem) {
          this.itemRects.set(element, element.getBoundingClientRect());
        }
      });

      this._createGhost(e);

      window.addEventListener('pointermove', this.boundThrottledDragMove, { passive: false });
      window.addEventListener('pointerup', this.boundHandleDragEnd);
      window.addEventListener('pointercancel', this.boundHandleDragEnd);

      this._triggerEvent('dragStart', { item: this.draggedItem, event: e });
    }
  }

  private _throttledDragMove(e: PointerEvent): void {
    if (!this.isMoving) {
      // Cancel previous RAF if it exists
      if (this.dragRAF) {
        cancelAnimationFrame(this.dragRAF);
      }

      this.dragRAF = requestAnimationFrame(() => {
        this._handleDragMove(e);
        this.isMoving = false;
        this.dragRAF = null;
      });
      this.isMoving = true;
    }
  }

  private _handleDragMove(e: PointerEvent): void {
    if (!this.isDragging || !this.draggedItem) return;
    e.preventDefault();
    this._moveGhost(e);
    this._findAndHighlightTarget(e);
    this._triggerEvent('dragMove', { item: this.draggedItem, event: e });
  }

  private _handleDragEnd(e: PointerEvent): void {
    if (!this.isDragging || !this.draggedItem) return;

    if (this.targetItem && this.targetItem !== this.draggedItem) {
      // this.draggedItem.classList.add('hidden');
      this._sortItems(this.draggedItem, this.targetItem);
      // this.draggedItem.classList.remove('hidden');
    }

    this._finalizeDragEnd(e);
  }

  private _createGhost(e: PointerEvent): void {
    if (!this.draggedItem) return;
    const coords = this._getEventCoords(e);

    const rect = this.draggedItem.getBoundingClientRect();
    this.ghostElement = this.draggedItem.cloneNode(true) as HTMLElement;

    this.ghostElement.classList.add(this.options.classNames.drag!, this.options.classNames.ghost!);
    this.draggedItem.classList.add(this.options.classNames.drag!);
    this.ghostElement.classList.remove(this.options.classNames.hidden)

    Object.assign(this.ghostElement.style, {
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      top: `${rect.top}px`,
      left: `${rect.left}px`,
    });

    this.ghostOffset = { x: coords.clientX - rect.left, y: coords.clientY - rect.top };

    document.body.appendChild(this.ghostElement);
    this._moveGhost(e);
  }

  private _moveGhost(e: PointerEvent): void {
    if (!this.ghostElement) return;
    const coords = this._getEventCoords(e);
    this.ghostElement.style.left = `${coords.clientX - this.ghostOffset.x}px`;
    this.ghostElement.style.top = `${coords.clientY - this.ghostOffset.y}px`;
  }

  private _findAndHighlightTarget(e: PointerEvent): void {
    if (this.targetItem) {
      this.targetItem.style.willChange = 'initial';
      this.targetItem.classList.remove(this.options.classNames.placeholder!);
      this.targetItem = null;
    }

    const { clientX, clientY } = this._getEventCoords(e);
    let newTarget: HTMLElement | null = null;

    for (const [element, rect] of this.itemRects.entries()) {
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        newTarget = element;
        break;
      }
    }

    if (newTarget) {
      this.targetItem = newTarget;
      this.targetItem.style.willChange = 'transform';
      this.targetItem.classList.add(this.options.classNames.placeholder!);
    }
  }

  private _sortItems(fromEl: HTMLElement, toEl: HTMLElement): void {
    const fromIndex = this.itemsData.findIndex(d => d.element === fromEl);
    const toIndex = this.itemsData.findIndex(d => d.element === toEl);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    this.swap(fromIndex, toIndex);
    this._triggerEvent('sort', { fromIndex, toIndex, items: this.itemsData });
  }

  private _finalizeDragEnd(e: PointerEvent): void {
    const draggedItem = this.draggedItem;
    if (this.dragRAF) {
      cancelAnimationFrame(this.dragRAF);
      this.dragRAF = null;
    }

    this._cleanupDragState();
    if (draggedItem) {
      this._triggerEvent('dragEnd', { item: draggedItem, event: e });
    }
  }

  private _cleanupDragState(): void {
    if (this.ghostElement) this.ghostElement.remove();
    if (this.draggedItem) {
      this.draggedItem.style.willChange = 'initial';
      this.draggedItem.classList.remove(this.options.classNames.drag!);
      // Remove the 'hidden' class when drag ends
      this.draggedItem.classList.remove(this.options.classNames.hidden!);
    }
    if (this.targetItem) {
      this.targetItem.style.willChange = 'initial';
      this.targetItem.classList.remove(this.options.classNames.placeholder!);
    }

    this.isDragging = false;
    this.isMoving = false;
    this.draggedItem = null;
    this.targetItem = null;
    this.ghostElement = null;
    this.itemRects.clear();

    window.removeEventListener('pointermove', this.boundThrottledDragMove);
    window.removeEventListener('pointerup', this.boundHandleDragEnd);
    window.removeEventListener('pointercancel', this.boundHandleDragEnd);
  }

  private _triggerEvent(event: keyof SwappableEvents, data: any): void {
    const listener = this.eventListeners[event];
    if (typeof listener === 'function') listener(data);
  }

  public on(event: keyof SwappableEvents, callback: SwappableEvents[typeof event]): this {
    if (typeof callback === 'function') (this as any).eventListeners[event] = callback;
    return this;
  }

  public off(event: keyof SwappableEvents): this {
    this.eventListeners[event] = undefined;
    return this;
  }

  public layout(duration?: number): void {
    this._triggerEvent('layoutStart', undefined);

    const animDuration = typeof duration === 'number' ? duration : this.options.layoutDuration;
    this._setCSSVar('--layout-duration', `${animDuration}ms`);

    const items = this.itemsData.map(d => d.element);
    const firstRects = items.map(el => el.getBoundingClientRect());

    // Clear any existing animations
    this.animatingElements.clear();
    this.layoutAnimationCounter = 0;

    this.itemsData.forEach((itemData, index) => {
      const expected = this.container.children[index];
      if (expected !== itemData.element) {
        this.container.insertBefore(itemData.element, expected || null);
      }
    });

    requestAnimationFrame(() => {
      const elementsToAnimate: HTMLElement[] = [];

      items.forEach((el, idx) => {
        el.style.willChange = 'transform';
        const first = firstRects[idx];
        const last = el.getBoundingClientRect();
        const dx = first.left - last.left;
        const dy = first.top - last.top;

        if (dx || dy) {
          elementsToAnimate.push(el);
          el.classList.remove('animating');
          el.style.transform = `translate(${dx}px, ${dy}px)`;
        } else {
          // Remove any existing transform
          el.style.transform = 'translate(0, 0)';
        }
      });

      if (elementsToAnimate.length === 0) {
        // No animations needed
        this._triggerEvent('layoutEnd', undefined);
        return;
      }

      this.layoutAnimationCounter = elementsToAnimate.length;

      requestAnimationFrame(() => {
        elementsToAnimate.forEach((el) => {
          this.animatingElements.add(el);
          el.classList.add('animating');
          el.style.transform = 'translate(0, 0)';

          // Cleanup on transition end
          const cleanup = () => {
            el.style.willChange = 'initial';
            el.classList.remove('animating');
            this.animatingElements.delete(el);
            el.removeEventListener('transitionend', cleanup);

            this.layoutAnimationCounter--;
            if (this.layoutAnimationCounter <= 0) {
              this._triggerEvent('layoutEnd', undefined);
            }
          };

          el.addEventListener('transitionend', cleanup, { once: true });
        });
      });
    });
  }

  public add(element: HTMLElement, index?: number): SwappableItemData {
    element.classList.add(this.options.classNames.item!);

    let newItem: SwappableItemData;

    if (index != null && index >= 0 && index < this.itemsData.length) {
      this.itemsData.splice(index, 0, { index, element });
      this.container.insertBefore(element, this.container.children[index]);
      for (let i = index; i < this.itemsData.length; i++) {
        this.itemsData[i].index = i;
      }
      newItem = this.itemsData[index];
    } else {
      const newIndex = this.itemsData.length;
      newItem = { index: newIndex, element };
      this.itemsData.push(newItem);
      this.container.appendChild(element);
    }

    this._triggerEvent('add', { items: this.itemsData.map(d => d.element) });
    return newItem;
  }

  public remove(target: HTMLElement | number): SwappableItemData | null {
    let index: number;

    if (target instanceof HTMLElement) {
      index = this.itemsData.findIndex(d => d.element === target);
    } else {
      index = target;
    }

    if (index < 0 || index >= this.itemsData.length) return null;

    const [removed] = this.itemsData.splice(index, 1);

    // Clean up any animations
    removed.element.classList.remove('animating');
    this.animatingElements.delete(removed.element);

    removed.element.remove();

    for (let i = index; i < this.itemsData.length; i++) {
      this.itemsData[i].index = i;
    }

    this._triggerEvent('remove', { items: this.itemsData.map(d => d.element) });
    return removed;
  }

  public select(target: number | HTMLElement): SwappableItemData | null {
    if (typeof target === 'number') {
      return this.itemsData[target] || null;
    }
    const found = this.itemsData.find(d => d.element === target);
    return found || null;
  }

  public swap(fromIndex: number, toIndex: number): this {
    if (
      fromIndex < 0 || fromIndex >= this.itemsData.length ||
      toIndex < 0 || toIndex >= this.itemsData.length ||
      fromIndex === toIndex
    ) return this;

    [this.itemsData[fromIndex], this.itemsData[toIndex]] =
      [this.itemsData[toIndex], this.itemsData[fromIndex]];

    this.itemsData[fromIndex].index = fromIndex;
    this.itemsData[toIndex].index = toIndex;

    this.layout(this.options.swapDuration);
    this._triggerEvent('swap', { fromIndex, toIndex, item: this.itemsData[toIndex].element });
    return this;
  }

  public refresh(): void {
    this._initItems();
    this.itemsData.forEach((item, idx) => {
      const expected = this.container.children[idx];
      if (expected !== item.element) {
        this.container.insertBefore(item.element, expected || null);
      }
    });
    this.layout(this.options.layoutDuration);
  }

  public destroy(): void {
    this.detach();

    this.itemsData.forEach(({ element }) => {
      element.classList.remove('animating');
    });

    this.container.innerHTML = '';
    this.itemsData = [];
    this.eventListeners = {};
    this.animatingElements.clear();
    this.layoutAnimationCounter = 0;
  }

  public detach(): void {
    this.container.removeEventListener('pointerdown', this.boundHandleDragStart);
    if (this.dragRAF) {
      cancelAnimationFrame(this.dragRAF);
      this.dragRAF = null;
    }
    this._cleanupDragState();
  }

  public enable(): void {
    if (this.options.dragEnabled) return;
    this.options.dragEnabled = true;
    this._bindEvents();
  }

  public disable(): void {
    if (!this.options.dragEnabled) return;
    this.options.dragEnabled = false;
    this.detach();
  }
}