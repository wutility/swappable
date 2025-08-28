export interface SwappableItemData {
  index: number;
  element: HTMLElement;
  [key: string]: any;
}

export interface ClassNames {
  item?: string;
  drag?: string;
  placeholder?: string;
  ghost?: string;
  hidden?: string;
}

export interface SwappableOptions {
  dragEnabled?: boolean;
  dragHandle?: string | null;
  classNames?: ClassNames;
  layoutDuration?: number;
  swapDuration?: number;
  layoutEasing?: string;
  itemsPerRow?: number;
  longPressDelay?: number;
  dragSlop?: number;
  ghostFactory?: (draggedElement: HTMLElement) => HTMLElement;
}

export interface SwappableEvents {
  add?: (data: { items: HTMLElement[] }) => void;
  remove?: (data: { items: HTMLElement[] }) => void;
  dragStart?: (data: { item: HTMLElement; event: PointerEvent }) => void;
  dragMove?: (data: { item: HTMLElement; event: PointerEvent }) => void;
  swap?: (data: { fromIndex: number; toIndex: number; fromElement: HTMLElement, toElement: HTMLElement }) => void;
  sort?: (data: { oldIndex: number; newIndex: number; items: SwappableItemData[] }) => void;
  dragEnd?: (data: { item: HTMLElement; event: PointerEvent }) => void;
  layoutStart?: () => void;
  layoutEnd?: () => void;
}