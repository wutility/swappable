export interface SwappableItemData {
  index: number;
  element: HTMLElement;
  [key: string]: any; // allows extra metadata if needed
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
}

export interface SwappableEvents {
  add?: (data: { items: HTMLElement[] }) => void;
  remove?: (data: { items: HTMLElement[] }) => void;
  dragStart?: (data: { item: HTMLElement; event: PointerEvent }) => void;
  dragMove?: (data: { item: HTMLElement; event: PointerEvent }) => void;
  swap?: (data: { fromIndex: number; toIndex: number; item: HTMLElement }) => void;
  sort?: (data: { fromIndex: number; toIndex: number; items: SwappableItemData[] }) => void;
  dragEnd?: (data: { item: HTMLElement; event: PointerEvent }) => void;
  layoutStart?: () => void;
  layoutEnd?: () => void;
}
