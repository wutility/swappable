import './index.css';
import { SwappableEvents, SwappableItemData, SwappableOptions } from './types';

const defaults: Required<SwappableOptions> = {
  dragEnabled: true,
  dragHandle: ".grid-item",
  layoutDuration: 300,
  swapDuration: 300,
  layoutEasing: 'ease',
  itemsPerRow: 4,
  longPressDelay: 100,
  dragSlop: 5,
  ghostFactory: undefined,
  classNames: {
    item: 'grid-item',
    drag: 'dragging',
    placeholder: 'placeholder',
    ghost: 'ghost',
    hidden: 'hidden',
  },
};

export default class Swappable {
  private container: HTMLElement;
  private options: Required<SwappableOptions>;
  private itemsData: SwappableItemData[] = [];

  private isPotentialDrag = false;
  private isDragging = false;
  private isMoving = false;
  private startEvent: PointerEvent | null = null;
  private longPressTimeout: number | null = null;

  private draggedItem: HTMLElement | null = null;
  private targetItem: HTMLElement | null = null;
  private ghostElement: HTMLElement | null = null;
  private dragRAF: number | null = null;

  private eventListeners: Partial<SwappableEvents> = {};
  private ghostOffset = { x: 0, y: 0 };
  private layoutId = 0;

  private boundHandleDragStart = this._handleDragStart.bind(this);
  private boundThrottledDragMove = this._throttledDragMove.bind(this);
  private boundHandleDragEnd = this._handleDragEnd.bind(this);

  constructor(containerOrSelector: string | HTMLElement, options: SwappableOptions = {}) {
    const el = containerOrSelector instanceof HTMLElement
        ? containerOrSelector
        : document.querySelector(containerOrSelector);

    if (!el) {
      throw new Error('Swappable: Container not found.');
    }
    this.container = el as HTMLElement;

    this.options = { ...defaults, ...options };
    this.options.classNames = { ...defaults.classNames, ...options.classNames };

    this.container.style.setProperty('--items-per-row', String(this.options.itemsPerRow));
    this.container.style.setProperty('--layout-duration', `${this.options.layoutDuration}ms`);
    this.container.style.setProperty('--layout-easing', this.options.layoutEasing);

    this.container.classList.add('swappable-grid');
    this._initItems();
    this._bindEvents();
  }

  private _initItems(): void {
    this.itemsData = [];
    const children = Array.from(this.container.children) as HTMLElement[];
    children.forEach((el, idx) => {
      el.classList.add(this.options.classNames.item!);
      this.itemsData.push({ index: idx, element: el });
    });
  }

  private _getEventCoords(e: PointerEvent) {
    return { clientX: e.clientX, clientY: e.clientY };
  }

  private _bindEvents(): void {
    this.container.addEventListener('pointerdown', this.boundHandleDragStart, { passive: true });
  }

  private _handleDragStart(e: PointerEvent): void {
    if (e.button !== 0 || !this.options.dragEnabled || this.isDragging) return;

    const handle = (e.target as HTMLElement).closest(this.options.dragHandle!);
    if (!handle) return;

    const clickedItem = handle.closest(`.${this.options.classNames.item!}`) as HTMLElement | null;
    if (!clickedItem) return;

    this.isPotentialDrag = true;
    this.startEvent = e;
    this.draggedItem = clickedItem;

    this.longPressTimeout = window.setTimeout(() => {
      if (this.isPotentialDrag) this._initializeDrag(this.startEvent!);
    }, this.options.longPressDelay);

    window.addEventListener('pointermove', this.boundThrottledDragMove, { passive: false });
    window.addEventListener('pointerup', this.boundHandleDragEnd, { once: true });
    window.addEventListener('pointercancel', this.boundHandleDragEnd, { once: true });
  }

  private _initializeDrag(e: PointerEvent): void {
    if (!this.draggedItem) return;
    this.isDragging = true;
    this.isPotentialDrag = false;
    this.draggedItem.style.willChange = 'transform';
    this.draggedItem.classList.add(this.options.classNames.hidden!);
    this._createGhost(e);
    this._triggerEvent('dragStart', { item: this.draggedItem, event: e });
  }

  private _throttledDragMove(e: PointerEvent): void {
    if (this.isPotentialDrag) {
      const start = this._getEventCoords(this.startEvent!);
      const current = this._getEventCoords(e);
      const distance = Math.hypot(current.clientX - start.clientX, current.clientY - start.clientY);
      if (distance > this.options.dragSlop!) {
        this._cleanupDragState();
        return;
      }
    }

    if (this.isDragging) e.preventDefault();
    if (!this.isMoving && this.isDragging) {
      this.dragRAF = requestAnimationFrame(() => {
        this._handleDragMove(e);
        this.isMoving = false;
      });
      this.isMoving = true;
    }
  }

  private _handleDragMove(e: PointerEvent): void {
    if (!this.draggedItem) return;
    this._moveGhost(e);
    this._findAndHighlightTarget(e);
    this._triggerEvent('dragMove', { item: this.draggedItem, event: e });
  }

  private _handleDragEnd(e: PointerEvent): void {
    if (this.dragRAF) cancelAnimationFrame(this.dragRAF);

    if (this.isDragging && this.draggedItem && this.targetItem && this.targetItem !== this.draggedItem) {
      const fromIndex = this.itemsData.findIndex(d => d.element === this.draggedItem);
      const toIndex = this.itemsData.findIndex(d => d.element === this.targetItem);
      if (fromIndex !== -1 && toIndex !== -1) {
        this.swap(fromIndex, toIndex);
        this._triggerEvent('sort', { oldIndex: fromIndex, newIndex: toIndex, items: this.itemsData });
      }
    }

    const draggedItem = this.draggedItem;
    const wasDragging = this.isDragging;
    this._cleanupDragState();

    if (wasDragging && draggedItem) {
      this._triggerEvent('dragEnd', { item: draggedItem, event: e });
    }
  }

  private _cleanupDragState(): void {
    if (this.longPressTimeout) clearTimeout(this.longPressTimeout);
    this.ghostElement?.remove();
    if (this.draggedItem) {
      this.draggedItem.style.willChange = '';
      this.draggedItem.classList.remove(this.options.classNames.drag!, this.options.classNames.hidden!);
    }
    if (this.targetItem) {
      this.targetItem.classList.remove(this.options.classNames.placeholder!);
    }
    
    this.isPotentialDrag = this.isDragging = this.isMoving = false;
    this.draggedItem = this.targetItem = this.ghostElement = this.startEvent = this.longPressTimeout = this.dragRAF = null;

    window.removeEventListener('pointermove', this.boundThrottledDragMove);
    window.removeEventListener('pointerup', this.boundHandleDragEnd);
    window.removeEventListener('pointercancel', this.boundHandleDragEnd);
  }

  private _createGhost(e: PointerEvent): void {
    if (!this.draggedItem) return;
    
    const rect = this.draggedItem.getBoundingClientRect();
    const coords = this._getEventCoords(e);
    
    this.ghostElement = this.options.ghostFactory
      ? this.options.ghostFactory(this.draggedItem)
      : (this.draggedItem.cloneNode(true) as HTMLElement);
      
    const style = this.ghostElement.style;
    style.position = 'fixed';
    style.boxSizing = 'border-box';
    style.width = `${rect.width}px`;
    style.height = `${rect.height}px`;
    style.top = `${rect.top}px`;
    style.left = `${rect.left}px`;
    style.pointerEvents = 'none';
    style.zIndex = '1000';
    
    this.ghostElement.classList.add(this.options.classNames.ghost!, this.options.classNames.drag!);
    this.draggedItem.classList.add(this.options.classNames.drag!);
    this.ghostElement.classList.remove('hidden')

    this.ghostOffset = { x: coords.clientX - rect.left, y: coords.clientY - rect.top };
    document.body.appendChild(this.ghostElement);
  }

  private _moveGhost(e: PointerEvent): void {
    if (!this.ghostElement) return;
    const coords = this._getEventCoords(e);
    this.ghostElement.style.transform = `translate(${coords.clientX - this.ghostOffset.x - this.ghostElement.offsetLeft}px, ${coords.clientY - this.ghostOffset.y - this.ghostElement.offsetTop}px)`;
  }

  private _findAndHighlightTarget(e: PointerEvent): void {
    if (this.targetItem) {
      this.targetItem.classList.remove(this.options.classNames.placeholder!);
    }

    const { clientX, clientY } = this._getEventCoords(e);
    const containerRect = this.container.getBoundingClientRect();
    const x = clientX - containerRect.left;
    const y = clientY - containerRect.top;

    let newTarget: HTMLElement | null = null;
    if (x >= 0 && x <= containerRect.width && y >= 0 && y <= containerRect.height) {
      const firstItemRect = this.itemsData[0]?.element.getBoundingClientRect();
      if (!firstItemRect || firstItemRect.height === 0) return;

      const col = Math.min(Math.floor(x / (containerRect.width / this.options.itemsPerRow!)), this.options.itemsPerRow! - 1);
      const row = Math.floor(y / firstItemRect.height);
      const targetIndex = Math.min(row * this.options.itemsPerRow! + col, this.itemsData.length - 1);
      newTarget = this.itemsData[targetIndex]?.element;
    }

    if (newTarget && newTarget !== this.draggedItem) {
      this.targetItem = newTarget;
      this.targetItem.classList.add(this.options.classNames.placeholder!);
    } else {
      this.targetItem = null;
    }
  }

  private _triggerEvent(event: keyof SwappableEvents, data: any): void {
    this.eventListeners[event]?.(data);
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
    const currentLayoutId = ++this.layoutId;
    this.container.style.setProperty('--layout-duration', `${duration ?? this.options.layoutDuration}ms`);

    const items = this.itemsData.map(d => d.element);
    const firstRects = items.map(el => el.getBoundingClientRect());
    
    this.itemsData.forEach((itemData, index) => {
      const expected = this.container.children[index];
      if (expected !== itemData.element) {
        this.container.insertBefore(itemData.element, expected || null);
      }
    });

    requestAnimationFrame(() => {
      const elementsToAnimate = items.filter((el, idx) => {
        const last = el.getBoundingClientRect();
        const dx = firstRects[idx].left - last.left;
        const dy = firstRects[idx].top - last.top;
        if (dx || dy) {
          el.style.transform = `translate(${dx}px, ${dy}px)`;
          return true;
        }
        return false;
      });

      if (elementsToAnimate.length === 0) {
        this._triggerEvent('layoutEnd', undefined);
        return;
      }

      requestAnimationFrame(() => {
        let animatedCount = 0;
        elementsToAnimate.forEach(el => {
          const onTransitionEnd = () => {
            if (this.layoutId !== currentLayoutId) return;
            el.style.willChange = '';
            el.classList.remove('animating');
            el.removeEventListener('transitionend', onTransitionEnd);
            if (++animatedCount === elementsToAnimate.length) {
              this._triggerEvent('layoutEnd', undefined);
            }
          };
          el.addEventListener('transitionend', onTransitionEnd);
          el.style.willChange = 'transform';
          el.classList.add('animating');
          el.style.transform = '';
        });
      });
    });
  }
  
  public swap(fromIndex: number, toIndex: number): this {
    if (fromIndex === toIndex || Math.min(fromIndex, toIndex) < 0 || Math.max(fromIndex, toIndex) >= this.itemsData.length) return this;
    [this.itemsData[fromIndex], this.itemsData[toIndex]] = [this.itemsData[toIndex], this.itemsData[fromIndex]];
    this.itemsData[fromIndex].index = fromIndex;
    this.itemsData[toIndex].index = toIndex;
    this.layout(this.options.swapDuration);
    this._triggerEvent('swap', { fromIndex, toIndex, fromElement: this.itemsData[toIndex].element, toElement: this.itemsData[fromIndex].element });
    return this;
  }

  public destroy(): void {
    this.detach();
    this.container.innerHTML = '';
    this.itemsData = [];
    this.eventListeners = {};
  }

  public detach(): void {
    this.container.removeEventListener('pointerdown', this.boundHandleDragStart);
    this._cleanupDragState();
  }

  public refresh(): void {
    this._initItems();
    this.itemsData.forEach((item, idx) => {
      const expected = this.container.children[idx];
      if (expected !== item.element) {
        this.container.insertBefore(item.element, expected || null);
      }
    });
    this.layout();
  }

  public select(target: number | HTMLElement): SwappableItemData | null {
    if (typeof target === 'number') {
      return this.itemsData[target] || null;
    }
    return this.itemsData.find(d => d.element === target) || null;
  }

  public add(element: HTMLElement, index?: number): SwappableItemData {
    element.classList.add(this.options.classNames.item!);
    let newItem: SwappableItemData;
    if (index != null && index >= 0 && index < this.itemsData.length) {
      this.itemsData.splice(index, 0, { index, element });
      this.container.insertBefore(element, this.container.children[index]);
      for (let i = index; i < this.itemsData.length; i++) { this.itemsData[i].index = i; }
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
    removed.element.remove();
    for (let i = index; i < this.itemsData.length; i++) { this.itemsData[i].index = i; }
    this._triggerEvent('remove', { items: this.itemsData.map(d => d.element) });
    return removed;
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