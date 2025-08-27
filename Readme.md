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

## Usage

### Basic Setup

Create a container with grid items and initialize Swappable:

```html
<div id="grid" class="swappable-grid">
  <div class="grid-item">Item 1</div>
  <div class="grid-item">Item 2</div>
  <div class="grid-item">Item 3</div>
  <div class="grid-item">Item 4</div>
</div>

<script type="module">
  import Swappable from 'swappable';

  const grid = new Swappable('#grid', {
    itemsPerRow: 4,
    dragHandle: '.grid-item',
    layoutDuration: 300,
    swapDuration: 300,
    longPressDelay: 100,
  });
</script>
```

### Options

Customize Swappable with the following options:

| Option            | Type              | Default             | Description                                      |
|-------------------|-------------------|---------------------|--------------------------------------------------|
| `dragEnabled`     | `boolean`         | `true`              | Enable or disable dragging.                      |
| `dragHandle`      | `string \| null`  | `".grid-item"`      | Selector for drag handle (null for entire item).  |
| `classNames`      | `ClassNames`      | See below           | Custom class names for grid items and states.    |
| `layoutDuration`  | `number`          | `300`               | Duration of layout animations (ms).              |
| `swapDuration`    | `number`          | `300`               | Duration of swap animations (ms).                |
| `layoutEasing`    | `string`          | `"ease"`            | Easing function for animations.                  |
| `itemsPerRow`     | `number`          | `4`                 | Number of items per row in the grid.             |
| `longPressDelay`  | `number`          | `100`               | Delay (ms) for initiating drag on touch devices. |

**Default `classNames`**:

```json
{
  item: "grid-item",
  drag: "dragging",
  placeholder: "placeholder",
  ghost: "ghost",
  hidden: "hidden"
}
```

### Events

Swappable supports the following events:

| Event         | Data Type                                                                 | Description                                      |
|---------------|---------------------------------------------------------------------------|--------------------------------------------------|
| `add`         | `{ items: HTMLElement[] }`                                                | Fired when items are added.                      |
| `remove`      | `{ items: HTMLElement[] }`                                                | Fired when items are removed.                    |
| `dragStart`   | `{ item: HTMLElement, event: PointerEvent }`                              | Fired when dragging starts.                      |
| `dragMove`    | `{ item: HTMLElement, event: PointerEvent }`                              | Fired during dragging.                           |
| `swap`        | `{ fromIndex: number, toIndex: number, fromElement: HTMLElement, toElement: HTMLElement }` | Fired when items are swapped.                    |
| `sort`        | `{ oldIndex: number, newIndex: number, items: SwappableItemData[] }`      | Fired after sorting items.                       |
| `dragEnd`     | `{ item: HTMLElement, event: PointerEvent }`                              | Fired when dragging ends.                        |
| `layoutStart` | `void`                                                                    | Fired before layout animation starts.            |
| `layoutEnd`   | `void`                                                                    | Fired after layout animation ends.               |

Example of event handling:

```javascript
grid.on('dragStart', ({ item, event }) => {
  console.log('Dragging started on', item);
});

grid.on('swap', ({ fromIndex, toIndex }) => {
  console.log(`Swapped item from ${fromIndex} to ${toIndex}`);
});
```

### Methods

| Method            | Parameters                          | Description                                      |
|-------------------|-------------------------------------|--------------------------------------------------|
| `on`              | `event: keyof SwappableEvents, callback` | Attach an event listener.                     |
| `off`             | `event: keyof SwappableEvents`       | Remove an event listener.                       |
| `layout`          | `duration?: number`                  | Recompute and animate layout.                    |
| `add`             | `element: HTMLElement, index?: number` | Add a new item to the grid.                     |
| `remove`          | `target: HTMLElement \| number`      | Remove an item by element or index.              |
| `select`          | `target: HTMLElement \| number`      | Select an item by element or index.              |
| `swap`            | `fromIndex: number, toIndex: number` | Swap two items by index.                         |
| `refresh`         | None                                 | Refresh the grid layout.                         |
| `destroy`         | None                                 | Destroy the instance and clean up.               |
| `detach`          | None                                 | Detach event listeners.                          |
| `enable`          | None                                 | Enable dragging.                                 |
| `disable`         | None                                 | Disable dragging.                                |

## Example

A complete example with a 4x2 grid and event logging:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/swappable/dist/index.css">
  <style>
    .grid-item {
      background: #f0f0f0;
      padding: 20px;
      border: 1px solid #ccc;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="grid" class="swappable-grid">
    <div class="grid-item">Item 1</div>
    <div class="grid-item">Item 2</div>
    <div class="grid-item">Item 3</div>
    <div class="grid-item">Item 4</div>
    <div class="grid-item">Item 5</div>
    <div class="grid-item">Item 6</div>
    <div class="grid-item">Item 7</div>
    <div class="grid-item">Item 8</div>
  </div>

  <script type="module">
    import Swappable from 'https://unpkg.com/swappable';

    const grid = new Swappable('#grid', {
      itemsPerRow: 4,
      longPressDelay: 200,
    });

    grid.on('swap', ({ fromIndex, toIndex }) => {
      console.log(`Swapped item from ${fromIndex} to ${toIndex}`);
    });

    grid.on('layoutEnd', () => {
      console.log('Layout animation completed');
    });
  </script>
</body>
</html>
```

---

## Contributing

We welcome contributions\! Feel free to open issues or pull requests on the
GitHub repository.

---

## License

This project is licensed under the MIT License.
