import './index.css';
import { SwappableEvents, SwappableItemData, SwappableOptions } from './types';

const defaults: Required<Omit<SwappableOptions, 'ghostFactory'>> = {
  dragEnabled: true,
  dragHandle: ".grid-item",
  layoutDuration: 300,
  swapDuration: 300,
  layoutEasing: 'ease',
  itemsPerRow: 4,
  longPressDelay: 100,
  dragSlop: 5,
  classNames: {
    item: 'grid-item',
    drag: 'dragging',
    placeholder: 'placeholder',
    ghost: 'ghost',
    hidden: 'hidden',
  },
};

export default class Swappable {
  // Public properties for plugin access
  public container: HTMLElement;
  public itemsData: SwappableItemData[] = [];
  public options: Required<SwappableOptions>;

  // Private state
  private isPotentialDrag = false;
  private isDragging = false;
  private startEvent: PointerEvent | null = null;
  private longPressTimeout: number | null = null;
  private draggedItem: HTMLElement | null = null;
  private targetItem: HTMLElement | null = null;
  private ghostElement: HTMLElement | null = null;
  private dragRAF: number | null = null;
  private eventListeners: Partial<SwappableEvents> = {};
  private ghostOffset = { x: 0, y: 0 };
  private containerRectCache: DOMRect | null = null;
  private itemHeightCache: number = 0;

  constructor(containerOrSelector: string | HTMLElement, options: SwappableOptions = {}) {
    const el = containerOrSelector instanceof HTMLElement
      ? containerOrSelector
      : document.querySelector(containerOrSelector);

    if (!el) {
      throw new Error('Swappable: Container not found.');
    }

    this.container = el as HTMLElement;
    this.options = { ...defaults, ...options, ghostFactory: options.ghostFactory };
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

  private _getEventCoords = (e: PointerEvent) => ({ clientX: e.clientX, clientY: e.clientY });
  private _bindEvents = () => this.container.addEventListener('pointerdown', this._handleDragStart, { passive: true });

  private _handleDragStart = (e: PointerEvent): void => {
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

    window.addEventListener('pointermove', this._throttledDragMove, { passive: false });
    window.addEventListener('pointerup', this._handleDragEnd, { once: true });
    window.addEventListener('pointercancel', this._handleDragEnd, { once: true });
  }

  private _initializeDrag = (e: PointerEvent): void => {
    if (!this.draggedItem) return;

    this.isDragging = true;
    this.isPotentialDrag = false;
    this.draggedItem.style.willChange = 'transform';
    this.draggedItem.classList.add(this.options.classNames.hidden!);

    this.containerRectCache = this.container.getBoundingClientRect();
    this.itemHeightCache = this.itemsData[0]?.element.offsetHeight || 0;

    this._createGhost(e);
    this._triggerEvent('dragStart', { item: this.draggedItem, event: e });
  }

  private _throttledDragMove = (e: PointerEvent): void => {
    if (this.isPotentialDrag) {
      const start = this._getEventCoords(this.startEvent!);
      const current = this._getEventCoords(e);
      const distance = Math.hypot(current.clientX - start.clientX, current.clientY - start.clientY);
      if (distance > this.options.dragSlop!) {
        this._cleanupDragState();
        return;
      }
    }
    if (!this.isDragging) return;
    e.preventDefault();
    if (this.dragRAF) cancelAnimationFrame(this.dragRAF);
    this.dragRAF = requestAnimationFrame(() => this._handleDragMove(e));
  }

  private _handleDragMove = (e: PointerEvent): void => {
    if (!this.draggedItem) return;
    this._moveGhost(e);
    this._findAndHighlightTarget(e);
    this._triggerEvent('dragMove', { item: this.draggedItem, event: e });
  }

  private _handleDragEnd = (e: PointerEvent): void => {
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

  private _cleanupDragState = (): void => {
    if (this.longPressTimeout) clearTimeout(this.longPressTimeout);
    this.ghostElement?.remove();
    if (this.draggedItem) {
      this.draggedItem.style.willChange = '';
      this.draggedItem.classList.remove(this.options.classNames.drag!, this.options.classNames.hidden!);
    }
    if (this.targetItem) this.targetItem.classList.remove(this.options.classNames.placeholder!);

    this.isPotentialDrag = this.isDragging = false;
    this.draggedItem = this.targetItem = this.ghostElement = this.startEvent = this.longPressTimeout = this.dragRAF = null;
    this.containerRectCache = null;
    this.itemHeightCache = 0;

    window.removeEventListener('pointermove', this._throttledDragMove);
    window.removeEventListener('pointerup', this._handleDragEnd);
    window.removeEventListener('pointercancel', this._handleDragEnd);
  }

  private _createGhost = (e: PointerEvent): void => {
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
    this.ghostElement.classList.remove('hidden');
    this.ghostOffset = { x: coords.clientX - rect.left, y: coords.clientY - rect.top };
    document.body.appendChild(this.ghostElement);
  }

  private _moveGhost = (e: PointerEvent): void => {
    if (!this.ghostElement) return;
    const coords = this._getEventCoords(e);
    this.ghostElement.style.transform = `translate(${coords.clientX - this.ghostOffset.x - this.ghostElement.offsetLeft}px, ${coords.clientY - this.ghostOffset.y - this.ghostElement.offsetTop}px)`;
  }

  private _findAndHighlightTarget = (e: PointerEvent): void => {
    if (this.targetItem) this.targetItem.classList.remove(this.options.classNames.placeholder!);

    const { clientX, clientY } = this._getEventCoords(e);
    const containerRect = this.containerRectCache;
    const itemHeight = this.itemHeightCache;
    if (!containerRect || itemHeight === 0) return;

    const x = clientX - containerRect.left;
    const y = clientY - containerRect.top;
    let newTarget: HTMLElement | null = null;

    if (x >= 0 && x <= containerRect.width && y >= 0 && y <= containerRect.height) {
      const col = Math.min(Math.floor(x / (containerRect.width / this.options.itemsPerRow!)), this.options.itemsPerRow! - 1);
      const row = Math.floor(y / itemHeight);
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

  public _triggerEvent(event: keyof SwappableEvents, data: any): void {
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
    const effectiveDuration = duration ?? this.options.layoutDuration;
    const items = this.itemsData.map(d => d.element);
    const firstRects = items.map(el => el.getBoundingClientRect());

    this.itemsData.forEach((itemData, index) => {
      const expected = this.container.children[index];
      if (expected !== itemData.element) this.container.insertBefore(itemData.element, expected || null);
    });

    const lastRects = items.map(el => el.getBoundingClientRect());

    requestAnimationFrame(() => {
      let animatedCount = 0;
      const elementsToAnimate: HTMLElement[] = [];
      items.forEach((el, idx) => {
        const dx = firstRects[idx].left - lastRects[idx].left;
        const dy = firstRects[idx].top - lastRects[idx].top;
        if (dx || dy) {
          el.style.transform = `translate(${dx}px, ${dy}px)`;
          el.style.transition = 'none';
          elementsToAnimate.push(el);
        }
      });
      if (elementsToAnimate.length === 0) {
        this._triggerEvent('layoutEnd', undefined);
        return;
      }
      requestAnimationFrame(() => {
        elementsToAnimate.forEach(el => {
          const onTransitionEnd = (event: TransitionEvent) => {
            if (event.propertyName !== 'transform') return;

            const el = event.target as HTMLElement;
            el.style.willChange = '';
            el.style.transition = '';

            el.removeEventListener('transitionend', onTransitionEnd);
            if (++animatedCount === elementsToAnimate.length) {
              this._triggerEvent('layoutEnd', undefined);
            }
          };
          el.addEventListener('transitionend', onTransitionEnd, { once: true });
          el.style.willChange = 'transform';
          el.style.transition = `transform ${effectiveDuration}ms ${this.options.layoutEasing}`;
          el.style.transform = '';
        });

        const fallbackTimeout = setTimeout(() => {
          // cleanup all elements here
          this._triggerEvent('layoutEnd', undefined);
        }, effectiveDuration + 50);

        if (++animatedCount === elementsToAnimate.length) {
          clearTimeout(fallbackTimeout);
          this._triggerEvent('layoutEnd', undefined);
        }

      });
    });
  }

  // These are the core, unwrapped methods for the plugin to use.
  public _internalSwap = (fromIndex: number, toIndex: number): this => {
    [this.itemsData[fromIndex], this.itemsData[toIndex]] = [this.itemsData[toIndex], this.itemsData[fromIndex]];
    this.itemsData[fromIndex].index = fromIndex;
    this.itemsData[toIndex].index = toIndex;
    this.layout(this.options.swapDuration);
    return this;
  }

  public _internalAdd = (element: HTMLElement, index?: number): SwappableItemData => {
    element.classList.add(this.options.classNames.item!);
    const effectiveIndex = index ?? this.itemsData.length;

    const newItem: SwappableItemData = { index: effectiveIndex, element };
    this.itemsData.splice(effectiveIndex, 0, newItem);
    this.container.insertBefore(element, this.container.children[effectiveIndex] || null);

    for (let i = effectiveIndex; i < this.itemsData.length; i++) {
      this.itemsData[i].index = i;
    }

    this._triggerEvent('add', { items: this.itemsData.map(d => d.element) });
    return newItem;
  }

  public _internalRemove = (target: HTMLElement | number): SwappableItemData | null => {
    const index = target instanceof HTMLElement ? this.itemsData.findIndex(d => d.element === target) : target;
    if (index < 0 || index >= this.itemsData.length) return null;

    const [removed] = this.itemsData.splice(index, 1);
    removed.element.remove();

    for (let i = index; i < this.itemsData.length; i++) {
      this.itemsData[i].index = i;
    }

    this._triggerEvent('remove', { items: this.itemsData.map(d => d.element) });
    return removed;
  }

  // Public-facing methods that will be wrapped by plugins.
  public swap = this._internalSwap;
  public add = this._internalAdd;
  public remove = this._internalRemove;

  public enable = (): void => { if (!this.options.dragEnabled) { this.options.dragEnabled = true; this._bindEvents(); } }
  public disable = (): void => { if (this.options.dragEnabled) { this.options.dragEnabled = false; this.detach(); } }
  public detach = (): void => { this.container.removeEventListener('pointerdown', this._handleDragStart); this._cleanupDragState(); }
  public destroy = (): void => { this.detach(); this.container.innerHTML = ''; this.itemsData = []; this.eventListeners = {}; }
  public refresh = (): void => { this._initItems(); this.layout(0); }
  public select = (target: number | HTMLElement): SwappableItemData | null => typeof target === 'number' ? this.itemsData[target] || null : this.itemsData.find(d => d.element === target) || null;
  public getSize = (): number => this.itemsData.length;
}