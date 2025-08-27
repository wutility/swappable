(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, global.Swappable = factory());
})(this, function() {
  "use strict";
  const defaults = {
    dragEnabled: true,
    dragHandle: ".grid-item",
    layoutDuration: 300,
    swapDuration: 300,
    layoutEasing: "ease",
    itemsPerRow: 4,
    longPressDelay: 100,
    classNames: {
      item: "grid-item",
      drag: "dragging",
      placeholder: "placeholder",
      ghost: "ghost",
      hidden: "hidden"
    }
  };
  class Swappable {
    container;
    options;
    itemsData = [];
    isPotentialDrag = false;
    isDragging = false;
    isMoving = false;
    startEvent = null;
    longPressTimeout = null;
    draggedItem = null;
    targetItem = null;
    ghostElement = null;
    dragRAF = null;
    eventListeners = {};
    itemRects = /* @__PURE__ */ new Map();
    ghostOffset = { x: 0, y: 0 };
    animatingElements = /* @__PURE__ */ new Set();
    layoutAnimationCounter = 0;
    boundHandleDragStart = this._handleDragStart.bind(this);
    boundThrottledDragMove = this._throttledDragMove.bind(this);
    boundHandleDragEnd = this._handleDragEnd.bind(this);
    constructor(containerOrSelector, options = {}) {
      if (typeof containerOrSelector === "string") {
        this.container = document.querySelector(containerOrSelector);
      } else if (containerOrSelector instanceof HTMLElement) {
        this.container = containerOrSelector;
      } else {
        throw new Error("Swappable: Invalid container provided. Must be a selector string or an HTMLElement.");
      }
      if (!this.container) {
        throw new Error("Swappable: Container not found.");
      }
      this.options = { ...defaults, ...options };
      this.options.classNames = { ...defaults.classNames, ...options.classNames };
      this._setCSSVar("--items-per-row", String(this.options.itemsPerRow));
      this._setCSSVar("--layout-duration", `${this.options.layoutDuration}ms`);
      this._setCSSVar("--layout-easing", this.options.layoutEasing);
      this.container.classList.add("swappable-grid");
      this._initItems();
      this._bindEvents();
    }
    _setCSSVar(name, value) {
      this.container.style.setProperty(name, value);
    }
    _initItems() {
      this.itemsData = [];
      const children = Array.from(this.container.children);
      children.forEach((el, idx) => {
        if (!el.classList.contains(this.options.classNames.item)) {
          el.classList.add(this.options.classNames.item);
        }
        this.itemsData.push({ index: idx, element: el });
      });
    }
    _getEventCoords(e) {
      return { clientX: e.clientX, clientY: e.clientY };
    }
    _bindEvents() {
      this.container.addEventListener("pointerdown", this.boundHandleDragStart, { passive: true });
    }
    _handleDragStart(e) {
      if (e.button !== 0 || !this.options.dragEnabled || this.isDragging) return;
      const target = e.target;
      const handle = this.options.dragHandle ? target.closest(this.options.dragHandle) : target;
      if (!handle) return;
      const itemSelector = `.${this.options.classNames.item}`;
      const clickedItem = handle.closest(itemSelector);
      if (clickedItem) {
        this.isPotentialDrag = true;
        this.startEvent = e;
        this.draggedItem = clickedItem;
        this.longPressTimeout = window.setTimeout(() => {
          if (this.isPotentialDrag) {
            this._initializeDrag(this.startEvent);
          }
          this.longPressTimeout = null;
        }, this.options.longPressDelay);
        window.addEventListener("pointermove", this.boundThrottledDragMove, { passive: false });
        window.addEventListener("pointerup", this.boundHandleDragEnd, { once: true });
        window.addEventListener("pointercancel", this.boundHandleDragEnd, { once: true });
      }
    }
    _initializeDrag(e) {
      if (!this.draggedItem) return;
      this.isDragging = true;
      this.isPotentialDrag = false;
      this.draggedItem.style.willChange = "transform";
      this.draggedItem.classList.add(this.options.classNames.hidden);
      this.itemRects.clear();
      this.itemsData.forEach(({ element }) => {
        if (element !== this.draggedItem) {
          this.itemRects.set(element, element.getBoundingClientRect());
        }
      });
      this._createGhost(e);
      this._triggerEvent("dragStart", { item: this.draggedItem, event: e });
    }
    _throttledDragMove(e) {
      if (this.isDragging) {
        e.preventDefault();
      }
      if (!this.isMoving) {
        if (this.dragRAF) cancelAnimationFrame(this.dragRAF);
        this.dragRAF = requestAnimationFrame(() => {
          this._handleDragMove(e);
          this.isMoving = false;
          this.dragRAF = null;
        });
        this.isMoving = true;
      }
    }
    _handleDragMove(e) {
      if (this.isPotentialDrag) {
        this._cleanupDragState();
        return;
      }
      if (!this.isDragging || !this.draggedItem) return;
      this._moveGhost(e);
      this._findAndHighlightTarget(e);
      this._triggerEvent("dragMove", { item: this.draggedItem, event: e });
    }
    _handleDragEnd(e) {
      if (this.dragRAF) {
        cancelAnimationFrame(this.dragRAF);
        this.dragRAF = null;
      }
      if (this.isDragging && this.draggedItem && this.targetItem && this.targetItem !== this.draggedItem) {
        this._sortItems(this.draggedItem, this.targetItem);
      }
      const draggedItem = this.draggedItem;
      const wasDragging = this.isDragging;
      this._cleanupDragState();
      if (wasDragging && draggedItem) {
        this._triggerEvent("dragEnd", { item: draggedItem, event: e });
      }
    }
    _cleanupDragState() {
      if (this.longPressTimeout) {
        clearTimeout(this.longPressTimeout);
        this.longPressTimeout = null;
      }
      if (this.ghostElement) this.ghostElement.remove();
      if (this.draggedItem) {
        this.draggedItem.style.willChange = "initial";
        this.draggedItem.classList.remove(this.options.classNames.drag);
        this.draggedItem.classList.remove(this.options.classNames.hidden);
      }
      if (this.targetItem) {
        this.targetItem.style.willChange = "initial";
        this.targetItem.classList.remove(this.options.classNames.placeholder);
      }
      this.isPotentialDrag = false;
      this.isDragging = false;
      this.isMoving = false;
      this.draggedItem = null;
      this.targetItem = null;
      this.ghostElement = null;
      this.startEvent = null;
      this.itemRects.clear();
      window.removeEventListener("pointermove", this.boundThrottledDragMove);
      window.removeEventListener("pointerup", this.boundHandleDragEnd);
      window.removeEventListener("pointercancel", this.boundHandleDragEnd);
    }
    _createGhost(e) {
      if (!this.draggedItem) return;
      const coords = this._getEventCoords(e);
      const rect = this.draggedItem.getBoundingClientRect();
      this.ghostElement = this.draggedItem.cloneNode(true);
      this.ghostElement.classList.add(this.options.classNames.drag, this.options.classNames.ghost);
      this.draggedItem.classList.add(this.options.classNames.drag);
      this.ghostElement.classList.remove(this.options.classNames.hidden);
      Object.assign(this.ghostElement.style, {
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        top: `${rect.top}px`,
        left: `${rect.left}px`
      });
      this.ghostOffset = { x: coords.clientX - rect.left, y: coords.clientY - rect.top };
      document.body.appendChild(this.ghostElement);
      this._moveGhost(e);
    }
    _moveGhost(e) {
      if (!this.ghostElement) return;
      const coords = this._getEventCoords(e);
      this.ghostElement.style.left = `${coords.clientX - this.ghostOffset.x}px`;
      this.ghostElement.style.top = `${coords.clientY - this.ghostOffset.y}px`;
    }
    _findAndHighlightTarget(e) {
      if (this.targetItem) {
        this.targetItem.style.willChange = "initial";
        this.targetItem.classList.remove(this.options.classNames.placeholder);
        this.targetItem = null;
      }
      const { clientX, clientY } = this._getEventCoords(e);
      let newTarget = null;
      for (const [element, rect] of this.itemRects.entries()) {
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
          newTarget = element;
          break;
        }
      }
      if (newTarget) {
        this.targetItem = newTarget;
        this.targetItem.style.willChange = "transform";
        this.targetItem.classList.add(this.options.classNames.placeholder);
      }
    }
    _sortItems(fromEl, toEl) {
      const oldIndex = this.itemsData.findIndex((d) => d.element === fromEl);
      const newIndex = this.itemsData.findIndex((d) => d.element === toEl);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      this.swap(oldIndex, newIndex);
      this._triggerEvent("sort", { oldIndex, newIndex, items: this.itemsData });
    }
    _triggerEvent(event, data) {
      const listener = this.eventListeners[event];
      if (typeof listener === "function") listener(data);
    }
    on(event, callback) {
      if (typeof callback === "function") this.eventListeners[event] = callback;
      return this;
    }
    off(event) {
      this.eventListeners[event] = void 0;
      return this;
    }
    layout(duration) {
      this._triggerEvent("layoutStart", void 0);
      const animDuration = typeof duration === "number" ? duration : this.options.layoutDuration;
      this._setCSSVar("--layout-duration", `${animDuration}ms`);
      const items = this.itemsData.map((d) => d.element);
      const firstRects = items.map((el) => el.getBoundingClientRect());
      this.animatingElements.clear();
      this.layoutAnimationCounter = 0;
      this.itemsData.forEach((itemData, index) => {
        const expected = this.container.children[index];
        if (expected !== itemData.element) {
          this.container.insertBefore(itemData.element, expected || null);
        }
      });
      requestAnimationFrame(() => {
        const elementsToAnimate = [];
        items.forEach((el, idx) => {
          el.style.willChange = "transform";
          const first = firstRects[idx];
          const last = el.getBoundingClientRect();
          const dx = first.left - last.left;
          const dy = first.top - last.top;
          if (dx || dy) {
            elementsToAnimate.push(el);
            el.classList.remove("animating");
            el.style.transform = `translate(${dx}px, ${dy}px)`;
          } else {
            el.style.transform = "translate(0, 0)";
          }
        });
        if (elementsToAnimate.length === 0) {
          this._triggerEvent("layoutEnd", void 0);
          return;
        }
        this.layoutAnimationCounter = elementsToAnimate.length;
        requestAnimationFrame(() => {
          elementsToAnimate.forEach((el) => {
            this.animatingElements.add(el);
            el.classList.add("animating");
            el.style.transform = "translate(0, 0)";
            const cleanup = () => {
              el.style.willChange = "initial";
              el.classList.remove("animating");
              this.animatingElements.delete(el);
              el.removeEventListener("transitionend", cleanup);
              this.layoutAnimationCounter--;
              if (this.layoutAnimationCounter <= 0) {
                this._triggerEvent("layoutEnd", void 0);
              }
            };
            el.addEventListener("transitionend", cleanup, { once: true });
          });
        });
      });
    }
    add(element, index) {
      element.classList.add(this.options.classNames.item);
      let newItem;
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
      this._triggerEvent("add", { items: this.itemsData.map((d) => d.element) });
      return newItem;
    }
    remove(target) {
      let index;
      if (target instanceof HTMLElement) {
        index = this.itemsData.findIndex((d) => d.element === target);
      } else {
        index = target;
      }
      if (index < 0 || index >= this.itemsData.length) return null;
      const [removed] = this.itemsData.splice(index, 1);
      removed.element.classList.remove("animating");
      this.animatingElements.delete(removed.element);
      removed.element.remove();
      for (let i = index; i < this.itemsData.length; i++) {
        this.itemsData[i].index = i;
      }
      this._triggerEvent("remove", { items: this.itemsData.map((d) => d.element) });
      return removed;
    }
    select(target) {
      if (typeof target === "number") {
        return this.itemsData[target] || null;
      }
      const found = this.itemsData.find((d) => d.element === target);
      return found || null;
    }
    swap(fromIndex, toIndex) {
      if (fromIndex < 0 || fromIndex >= this.itemsData.length || toIndex < 0 || toIndex >= this.itemsData.length || fromIndex === toIndex) return this;
      [this.itemsData[fromIndex], this.itemsData[toIndex]] = [this.itemsData[toIndex], this.itemsData[fromIndex]];
      this.itemsData[fromIndex].index = fromIndex;
      this.itemsData[toIndex].index = toIndex;
      this.layout(this.options.swapDuration);
      this._triggerEvent("swap", {
        fromIndex,
        toIndex,
        fromElement: this.itemsData[toIndex].element,
        toElement: this.itemsData[fromIndex].element
      });
      return this;
    }
    refresh() {
      this._initItems();
      this.itemsData.forEach((item, idx) => {
        const expected = this.container.children[idx];
        if (expected !== item.element) {
          this.container.insertBefore(item.element, expected || null);
        }
      });
      this.layout(this.options.layoutDuration);
    }
    destroy() {
      this.detach();
      this.itemsData.forEach(({ element }) => element.classList.remove("animating"));
      this.container.innerHTML = "";
      this.itemsData = [];
      this.eventListeners = {};
      this.animatingElements.clear();
      this.layoutAnimationCounter = 0;
    }
    detach() {
      this.container.removeEventListener("pointerdown", this.boundHandleDragStart);
      if (this.dragRAF) {
        cancelAnimationFrame(this.dragRAF);
        this.dragRAF = null;
      }
      this._cleanupDragState();
    }
    enable() {
      if (this.options.dragEnabled) return;
      this.options.dragEnabled = true;
      this._bindEvents();
    }
    disable() {
      if (!this.options.dragEnabled) return;
      this.options.dragEnabled = false;
      this.detach();
    }
  }
  return Swappable;
});
