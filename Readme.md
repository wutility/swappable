## Swappable

Swappable is a lightweight and performant JavaScript library for creating
interactive, draggable, and swappable grid layouts. Built with modern web APIs,
it offers smooth animations and a simple API for common use cases.

## Features

- **Touch-first Draggable Items**: Seamless drag-and-drop functionality on both
  desktop and mobile devices.
- **Smooth Animations**: Utilizes the FLIP (First, Last, Invert, Play) animation
  technique for fluid layout transitions after a swap or item change.
- **CSS-driven Layout**: Leverages CSS Grid for a flexible and responsive
  layout.
- **Lightweight & Performant**: No external dependencies, ensuring a small
  footprint.
- **Customizable**: Easily configure class names, animation durations, and drag
  behavior.\
  [codepen](https://codepen.io/haikelfazzani-the-bold/pen/GgpMpzE)\
  [demo](https://wutility.github.io/swappable)

<hr />

<div align="center" style="width:100%; text-align:center;">
  <img src="https://badgen.net/bundlephobia/min/swappable" alt="swappable" />
  <img src="https://badgen.net/bundlephobia/dependency-count/swappable" alt="swappable" />
  <img src="https://badgen.net/npm/v/swappable" alt="swappable" />
  <img src="https://badgen.net/npm/dt/swappable" alt="swappable" />
  <img src="https://data.jsdelivr.com/v1/package/npm/swappable/badge" alt="swappable"/>
</div>

## Installation

```bash
$ npm i swappable
```

```js
import swappable from "swappable";
import "./node_modules/swappable/dist/swappable.css";
```

---

## Usage

### HTML

Start with a container element and a set of children. The library will
automatically detect and manage the child elements.

```html
<div id="my-grid">
  <div class="grid-item">Item 1</div>
  <div class="grid-item">Item 2</div>
  <div class="grid-item">Item 3</div>
  <div class="grid-item">Item 4</div>
  <div class="grid-item">Item 5</div>
</div>
```

### JavaScript

Initialize a new `Swappable` instance by passing the container element or a CSS
selector.

```javascript
import Swappable from "swappable-js";

const swappable = new Swappable("#my-grid", {
  itemsPerRow: 4,
  dragHandle: ".grid-item",
});
```

---

## API

### `new Swappable(container, [options])`

Creates a new `Swappable` instance.

- `container`: An `HTMLElement` or CSS selector string for the grid container.
- `options`: An optional object for customizing behavior.

#### Options (`SwappableOptions`)

| Option           | Type         | Default   | Description                                                         |
| ---------------- | ------------ | --------- | ------------------------------------------------------------------- |
| `dragEnabled`    | `boolean`    | `true`    | Enables or disables dragging of items.                              |
| `dragHandle`     | `string`     | `null`    | `null`                                                              |
| `classNames`     | `ClassNames` | See below | An object to override default CSS class names.                      |
| `layoutDuration` | `number`     | `300`     | The duration in milliseconds for the layout animation.              |
| `swapDuration`   | `number`     | `300`     | The duration in milliseconds for the swap animation.                |
| `layoutEasing`   | `string`     | `'ease'`  | A CSS `transition-timing-function` for the layout animation.        |
| `itemsPerRow`    | `number`     | `4`       | The number of items per row in the grid, used for CSS Grid styling. |

#### Default Class Names

```typescript
{
  item: 'grid-item',
  drag: 'dragging',
  placeholder: 'placeholder',
  ghost: 'ghost',
  hidden: 'hidden',
}
```

---

## Methods

### `on(event, callback)`

Attaches an event listener to the instance. Returns the `Swappable` instance.

- `event`: A string representing the event name.
- `callback`: The function to be executed when the event is triggered.

### `off(event)`

Removes an event listener. Returns the `Swappable` instance.

- `event`: The name of the event to remove.

### `swap(fromIndex, toIndex)`

Swaps the items at two given indices programmatically. Returns the `Swappable`
instance.

- `fromIndex`: The index of the item to move.
- `toIndex`: The index where the item should be moved.

### `add(element, [index])`

Adds a new `HTMLElement` to the grid at an optional index. Returns the new
`SwappableItemData`.

- `element`: The `HTMLElement` to add.
- `index`: An optional number to specify the insertion position.

### `remove(target)`

Removes an item from the grid. Returns the removed `SwappableItemData` or
`null`.

- `target`: The `HTMLElement` or index of the item to remove.

### `select(target)`

Finds and returns the `SwappableItemData` for a given element or index.

- `target`: The `HTMLElement` or index of the item to select.

### `layout([duration])`

Triggers a layout animation to re-position all items to their correct grid
positions.

- `duration`: An optional number to override the default `layoutDuration`.

### `refresh()`

Re-initializes the internal item data and triggers a layout. Useful if the
container's children have changed without using `add()` or `remove()`.

### `enable()`

Enables dragging functionality.

### `disable()`

Disables dragging functionality.

### `destroy()`

Removes all event listeners, clears the container, and disposes of the instance.

---

## Events

You can listen for a variety of events using the `on()` method.

| Event         | Data                                                                 | Description                                            |
| ------------- | -------------------------------------------------------------------- | ------------------------------------------------------ |
| `add`         | `{ items: HTMLElement[] }`                                           | Fired when an item is added.                           |
| `remove`      | `{ items: HTMLElement[] }`                                           | Fired when an item is removed.                         |
| `dragStart`   | `{ item: HTMLElement; event: PointerEvent }`                         | Fired when an item drag operation begins.              |
| `dragMove`    | `{ item: HTMLElement; event: PointerEvent }`                         | Fired continuously while an item is being dragged.     |
| `swap`        | `{ fromIndex: number; toIndex: number; item: HTMLElement }`          | Fired when two items are programmatically swapped.     |
| `sort`        | `{ fromIndex: number; toIndex: number; items: SwappableItemData[] }` | Fired after a successful drag-and-drop sort operation. |
| `dragEnd`     | `{ item: HTMLElement; event: PointerEvent }`                         | Fired when an item drag operation ends.                |
| `layoutStart` | `undefined`                                                          | Fired at the beginning of a layout animation.          |
| `layoutEnd`   | `undefined`                                                          | Fired at the end of a layout animation.                |

### Example Event Usage

```javascript
swappable.on("sort", ({ fromIndex, toIndex, items }) => {
  console.log(`Item moved from index ${fromIndex} to ${toIndex}.`);
  // `items` is the new sorted array of item data.
});

swappable.on("dragEnd", ({ item }) => {
  console.log("Dragging finished for item:", item);
});
```

---

## Contributing

We welcome contributions\! Feel free to open issues or pull requests on the
GitHub repository.

---

## License

This project is licensed under the MIT License.
