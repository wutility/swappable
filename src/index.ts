import './index.css'

interface GridItemData {
  id: number;
  element: HTMLElement;
  [key: string]: any;
}

interface ClassNames {
  item?: string;
  drag?: string;
  placeholder?: string;
  ghost?: string;
  entering?: string;
  exiting?: string;
}

interface GridOptions {
  data?: { id: number; content?: string;[key: string]: any }[];
  renderItem?: (item: { id: number; content?: string;[key: string]: any }) => string;
  dragEnabled?: boolean;
  dragHandle?: string | null;
  classNames?: ClassNames;
  layoutDuration?: number;
  swapDuration?: number;
  layoutEasing?: string;
  itemsPerRow?: number;
}

interface GridEvents {
  add?: (data: { items: HTMLElement[] }) => void;
  remove?: (data: { items: HTMLElement[] }) => void;
  dragStart?: (data: { item: HTMLElement; event: MouseEvent | TouchEvent }) => void;
  dragMove?: (data: { item: HTMLElement; event: MouseEvent | TouchEvent }) => void;
  swap?: (data: { fromId: number; toId: number; item: HTMLElement }) => void;
  sort?: (data: { fromId: number; toId: number; items: GridItemData[] }) => void;
  dragEnd?: (data: { item: HTMLElement; event: MouseEvent | TouchEvent }) => void;
  layoutStart?: () => void;
  layoutEnd?: () => void;
}

export default class Swappable {
  private container: HTMLElement;
  private options: Required<GridOptions>;
  private itemsData: GridItemData[] = [];
  private itemsMap: Map<number, GridItemData> = new Map();
  private indexMap: Map<number, number> = new Map();
  private isDragging = false;
  private draggedItem: HTMLElement | null = null;
  private targetItem: HTMLElement | null = null;
  private ghostElement: HTMLElement | null = null;
  private eventListeners: Partial<GridEvents> = {};

  private _onDragStartHandler!: (e: MouseEvent | TouchEvent) => void;
  private _onDragMoveHandler!: (e: MouseEvent | TouchEvent) => void;
  private _onDragEndHandler!: (e: MouseEvent | TouchEvent) => void;

  constructor(containerSelector: string | HTMLElement, options: GridOptions = {}) {
    this.container = typeof containerSelector === "string"
      ? (document.querySelector(containerSelector) as HTMLElement)
      : containerSelector;
    if (!this.container) {
      throw new Error("Swappable: Container not found.");
    }

    const defaults: Omit<Required<GridOptions>, 'items'> = {
      data: [],
      renderItem: (item) => `<div class="grid-item-content">${item.content || ""}</div>`,
      dragEnabled: true,
      dragHandle: null,
      layoutDuration: 300,
      swapDuration: 150,
      layoutEasing: "ease",
      itemsPerRow: 4,
      classNames: {
        item: "grid-item",
        drag: "dragging",
        placeholder: "placeholder",
        ghost: "ghost",
        entering: "item-entering",
        exiting: "item-exiting",
      },
    };

    this.options = { ...defaults, ...options } as Required<GridOptions>;
    this.options.classNames = { ...defaults.classNames, ...options.classNames };

    this.container.style.setProperty("--items-per-row", String(this.options.itemsPerRow));
    this.container.classList.add("swappable-grid");

    this._initItems();
    this._bindEvents();
  }

  /* --------------------------
     Init & index map
     -------------------------- */
  private _initItems(): void {
    this.itemsData = [];
    this.itemsMap.clear();
    this.indexMap.clear();
    const addItem = (itemData: { id: number; content?: string;[k: string]: any }, index: number) => {
      const el = this._createItemElement(itemData);
      const dataObj: GridItemData = { id: itemData.id, element: el, ...itemData };
      this.itemsData.push(dataObj);
      this.itemsMap.set(itemData.id, dataObj);
      this.indexMap.set(itemData.id, index);
      this.container.appendChild(el);
    };

    if (this.options.data?.length) {
      this.container.innerHTML = "";
      this.options.data.forEach((itemData, i) => {
        if (typeof itemData.id !== "number" || this.itemsMap.has(itemData.id)) {
          throw new Error(`Swappable: Invalid or duplicate id '${itemData.id}'`);
        }
        addItem(itemData, i);
      });
    } else {
      const itemSelector = `.${this.options.classNames.item}`;
      const elements = Array.from(this.container.querySelectorAll(itemSelector)) as HTMLElement[];
      let idCounter = 0;
      elements.forEach((el, i) => {
        let id = Number(el.dataset.id);
        if (!Number.isFinite(id) || this.itemsMap.has(id)) {
          while (this.itemsMap.has(idCounter)) idCounter++;
          id = idCounter++;
          el.dataset.id = String(id);
        }
        const dataObj: GridItemData = { id, element: el };
        this.itemsData.push(dataObj);
        this.itemsMap.set(id, dataObj);
        this.indexMap.set(id, i);
      });
    }
  }

  private _updateIndexMap(): void {
    this.indexMap.clear();
    this.itemsData.forEach((item, idx) => this.indexMap.set(item.id, idx));
  }

  /* --------------------------
     Public API
     -------------------------- */
  public add(item: { id: number; content?: string;[k: string]: any }, { index = -1 } = {}): void {
    if (typeof item.id !== "number" || this.itemsMap.has(item.id)) return;
    const el = this._createItemElement(item);
    const dataObj: GridItemData = { id: item.id, element: el, ...item };

    if (index >= 0 && index < this.itemsData.length) {
      this.itemsData.splice(index, 0, dataObj);
      this.container.insertBefore(el, this.container.children[index]);
    } else {
      this.itemsData.push(dataObj);
      this.container.appendChild(el);
    }

    this.itemsMap.set(item.id, dataObj);
    this._updateIndexMap();
    this._animateIn(el);
    this._triggerEvent("add", { items: [el] });
  }

  public remove(id: number): void {
    const idx = this.indexMap.get(id);
    if (idx == null) return;

    const [removed] = this.itemsData.splice(idx, 1);
    this.itemsMap.delete(id);
    this.indexMap.delete(id);
    this._updateIndexMap();

    this._animateOut(removed.element, () => {
      removed.element.remove();
      this.layout();
    });
    this._triggerEvent("remove", { items: [removed.element] });
  }

  public swap(fromId: number, toId: number): void {
    const fromIndex = this.indexMap.get(fromId);
    const toIndex = this.indexMap.get(toId);
    if (fromIndex == null || toIndex == null || fromId === toId) return;

    [this.itemsData[fromIndex], this.itemsData[toIndex]] = [this.itemsData[toIndex], this.itemsData[fromIndex]];
    this._updateIndexMap();
    this.layout(this.options.swapDuration);
    this._triggerEvent("swap", { fromId, toId, item: this.itemsMap.get(fromId)!.element });
  }

  /* --------------------------
     Layout with batched reads/writes (FLIP)
     -------------------------- */
  public layout(duration?: number): void {
    this._triggerEvent("layoutStart", undefined);
    const animDuration = typeof duration === 'number' ? duration : this.options.layoutDuration;
    const allItems = this.itemsData.map(d => d.element);
    const firstRects = new Map(allItems.map(el => [el.dataset.id!, el.getBoundingClientRect()]));

    this.itemsData.forEach((itemData, index) => {
      const expected = this.container.children[index];
      if (expected !== itemData.element) {
        this.container.insertBefore(itemData.element, expected || null);
      }
    });

    requestAnimationFrame(() => {
      allItems.forEach(el => {
        el.style.willChange = "transform";
      });

      allItems.forEach(el => {
        const key = el.dataset.id!;
        const first = firstRects.get(key);
        if (!first) return;
        const last = el.getBoundingClientRect();
        const dx = first.left - last.left;
        const dy = first.top - last.top;

        if (dx || dy) {
          el.style.transform = `translate(${dx}px, ${dy}px)`;
          el.style.transition = "transform 0s";
          requestAnimationFrame(() => {
            el.style.transition = `transform ${animDuration / 1000}s ${this.options.layoutEasing}`;
            el.style.transform = "translate(0,0)";
          });
        }
      });

      setTimeout(() => {
        allItems.forEach(el => {
          el.style.willChange = "initial";
        });
        this._triggerEvent("layoutEnd", undefined);
      }, animDuration);
    });
  }

  /* --------------------------
     Internal helpers
     -------------------------- */
  private _createItemElement(itemData: { id: number; content?: string }): HTMLElement {
    const el = document.createElement("div");
    el.className = this.options.classNames.item;
    el.dataset.id = String(itemData.id);
    el.innerHTML = this.options.renderItem(itemData);
    return el;
  }

  private _animateIn(el: HTMLElement): void {
    el.classList.add(this.options.classNames.entering);
    el.getBoundingClientRect();
    requestAnimationFrame(() => {
      el.classList.remove(this.options.classNames.entering);
      this.layout();
    });
  }

  private _animateOut(el: HTMLElement, cb: () => void): void {
    el.classList.add(this.options.classNames.exiting);
    setTimeout(cb, this.options.layoutDuration);
  }

  private _getEventCoords(e: MouseEvent | TouchEvent): { clientX: number, clientY: number } | null {
    if (e instanceof MouseEvent) {
      return { clientX: e.clientX, clientY: e.clientY };
    }
    if (e.touches && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
    }
    return null;
  }

  /* --------------------------
     Drag & Drop (Unified for Mouse and Touch)
     -------------------------- */
  private _bindEvents(): void {
    this._onDragStartHandler = this._handleDragStart.bind(this);
    this._onDragMoveHandler = this._handleDragMove.bind(this);
    this._onDragEndHandler = this._handleDragEnd.bind(this);

    this.container.addEventListener("mousedown", this._onDragStartHandler);
    this.container.addEventListener("touchstart", this._onDragStartHandler, { passive: false });
  }

  private _handleDragStart(e: MouseEvent | TouchEvent): void {
    if (e instanceof MouseEvent && e.button !== 0) return;
    if (!this.options.dragEnabled) return;

    const target = e.target as HTMLElement;
    const handle = this.options.dragHandle ? target.closest(this.options.dragHandle) : target;
    if (!handle) return;

    const itemSelector = `.${this.options.classNames.item}`;
    const clickedItem = (handle as HTMLElement).closest(itemSelector) as HTMLElement | null;
    if (clickedItem) {
      e.preventDefault();
      this.isDragging = true;
      this.draggedItem = clickedItem;
      this.draggedItem.style.willChange = "transform";

      this._createGhost(e);

      document.addEventListener("mousemove", this._onDragMoveHandler);
      document.addEventListener("touchmove", this._onDragMoveHandler, { passive: false });
      document.addEventListener("mouseup", this._onDragEndHandler);
      document.addEventListener("touchend", this._onDragEndHandler);

      this._triggerEvent("dragStart", { item: this.draggedItem, event: e });
    }
  }

  private _handleDragMove(e: MouseEvent | TouchEvent): void {
    if (!this.isDragging || !this.draggedItem) return;
    if (e instanceof TouchEvent) {
      e.preventDefault();
    }
    this._moveGhost(e);
    this._findAndHighlightTarget(e);
    this._triggerEvent("dragMove", { item: this.draggedItem, event: e });
  }

  private _handleDragEnd(e: MouseEvent | TouchEvent): void {
    if (!this.isDragging || !this.draggedItem) return;

    if (this.targetItem && this.targetItem !== this.draggedItem) {
      this._sortItems(this.draggedItem, this.targetItem);
    }
    this._finalizeDragEnd(e);
  }

  private _createGhost(e: MouseEvent | TouchEvent): void {
    if (!this.draggedItem) return;
    const coords = this._getEventCoords(e);
    if (!coords) return;

    const rect = this.draggedItem.getBoundingClientRect();
    this.ghostElement = this.draggedItem.cloneNode(true) as HTMLElement;

    this.ghostElement.classList.add(this.options.classNames.drag, this.options.classNames.ghost);
    this.draggedItem.classList.add(this.options.classNames.drag);

    Object.assign(this.ghostElement.style, {
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      top: `${rect.top}px`,
      left: `${rect.left}px`,
    });

    (this.ghostElement as any).offsetX = coords.clientX - rect.left;
    (this.ghostElement as any).offsetY = coords.clientY - rect.top;

    document.body.appendChild(this.ghostElement);
    this._moveGhost(e);
  }

  private _moveGhost(e: MouseEvent | TouchEvent): void {
    if (!this.ghostElement) return;
    const coords = this._getEventCoords(e);
    if (!coords) return;

    const offsetX = (this.ghostElement as any).offsetX;
    const offsetY = (this.ghostElement as any).offsetY;

    this.ghostElement.style.left = `${coords.clientX - offsetX}px`;
    this.ghostElement.style.top = `${coords.clientY - offsetY}px`;
  }

  private _findAndHighlightTarget(e: MouseEvent | TouchEvent): void {
    if (this.targetItem) {
      this.targetItem.style.willChange = "initial";
      this.targetItem.classList.remove(this.options.classNames.placeholder);
      this.targetItem = null;
    }

    const coords = this._getEventCoords(e);
    if (!coords) return;

    if (this.ghostElement) this.ghostElement.style.display = "none";
    const itemSelector = `.${this.options.classNames.item}`;
    const elementUnderPointer = document.elementFromPoint(coords.clientX, coords.clientY);
    if (this.ghostElement) this.ghostElement.style.display = "";

    const potentialTarget = elementUnderPointer?.closest(itemSelector) as HTMLElement | null;

    if (potentialTarget && potentialTarget !== this.draggedItem && this.container.contains(potentialTarget)) {
      this.targetItem = potentialTarget;
      this.targetItem.style.willChange = "transform";
      this.targetItem.classList.add(this.options.classNames.placeholder);
    }
  }

  private _sortItems(fromEl: HTMLElement, toEl: HTMLElement): void {
    const fromId = Number(fromEl.dataset.id);
    const toId = Number(toEl.dataset.id);

    if (!Number.isFinite(fromId) || !Number.isFinite(toId)) return;

    this.swap(fromId, toId);
    this._triggerEvent("sort", { fromId, toId, items: this.itemsData });
  }

  private _finalizeDragEnd(e: MouseEvent | TouchEvent): void {
    const draggedItem = this.draggedItem;
    this._cleanupDragState();
    if (draggedItem) {
      this._triggerEvent("dragEnd", { item: draggedItem, event: e });
    }
  }

  private _cleanupDragState(): void {
    if (this.ghostElement) this.ghostElement.remove();
    if (this.draggedItem) {
      this.draggedItem.style.willChange = "initial";
      this.draggedItem.classList.remove(this.options.classNames.drag);
    }
    if (this.targetItem) {
      this.targetItem.style.willChange = "initial";
      this.targetItem.classList.remove(this.options.classNames.placeholder);
    }

    this.isDragging = false;
    this.draggedItem = null;
    this.targetItem = null;
    this.ghostElement = null;

    document.removeEventListener("mousemove", this._onDragMoveHandler);
    document.removeEventListener("touchmove", this._onDragMoveHandler);
    document.removeEventListener("mouseup", this._onDragEndHandler);
    document.removeEventListener("touchend", this._onDragEndHandler);
  }

  private _triggerEvent(event: keyof GridEvents, data: any): void {
    const listener = this.eventListeners[event];
    if (typeof listener === "function") listener(data);
  }

  public on(event: keyof GridEvents, callback: GridEvents[typeof event]): this {
    if (typeof callback === "function") (this as any).eventListeners[event] = callback;
    return this;
  }

  public off(event: keyof GridEvents): this {
    this.eventListeners[event] = undefined;
    return this;
  }

  public destroy(): void {
    this.container.removeEventListener("mousedown", this._onDragStartHandler);
    this.container.removeEventListener("touchstart", this._onDragStartHandler);

    this._cleanupDragState();

    this.container.innerHTML = "";
    this.itemsData = [];
    this.itemsMap.clear();
    this.indexMap.clear();
    this.eventListeners = {};
  }
}
