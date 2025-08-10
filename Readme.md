# Swappable Grid drag and drop

Lightweight, high-performance drag and drop grid library with smooth animations
and touch support. Create interactive, swappable grids with minimal overhead and
maximum responsiveness.\
[codepen](https://codepen.io/haikelfazzani-the-bold/pen/GgpMpzE)\
[demo](/public/index.html)

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
// you must import css file
```

---
## Basic Usage

1. **HTML Structure:** Create a container element. Items can be pre-defined in
   the HTML or passed as a data array during initialization.

   ```html
   <div id="my-grid">
     <div class="grid-item" data-id="1">Item 1</div>
     <div class="grid-item" data-id="2">Item 2</div>
     <div class="grid-item" data-id="3">Item 3</div>
     <!-- ... more items -->
   </div>
   ```

2. **CSS:** Add some basic styling for the grid and items.

   ```css
   #my-grid {
     display: grid;
     grid-template-columns: repeat(var(--items-per-row, 4), 1fr);
     gap: 16px;
   }

   .grid-item {
     width: 100%;
     aspect-ratio: 1 / 1;
     background-color: #eee;
     border-radius: 8px;
     display: flex;
     align-items: center;
     justify-content: center;
     cursor: grab;
   }
   ```

3. **JavaScript Initialization:**

   ```javascript
   const grid = new Swappable("#my-grid", {
     itemsPerRow: 4,
     // ... other options
   });

   // Listen to events
   grid.on("sort", (data) => {
     console.log("Items were sorted!", data.items);
   });
   ```
---

## API Reference

### Constructor

`new Swappable(container, options)`

- `container` (String | HTMLElement): A CSS selector string or a direct
  reference to the grid container element.
- `options` (Object): Configuration options for the grid.

### Options

| Option           | Type       | Default                      | Description                                                                                              |
| ---------------- | ---------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `data`           | `Array`    | `[]`                         | An array of objects to create grid items from. Each object needs a unique `id`. Overrides existing HTML. |
| `renderItem`     | `Function` | A simple `div` renderer      | A function that returns an HTML string for each item in the `data` array.                                |
| `dragEnabled`    | `Boolean`  | `true`                       | Enables or disables drag-and-drop functionality.                                                         |
| `dragHandle`     | `String`   | `null`                       | A CSS selector for a drag handle within an item. If `null`, the whole item is the handle.                |
| `itemsPerRow`    | `Number`   | `4`                          | Sets the CSS custom property `--items-per-row` for responsive grid columns.                              |
| `layoutDuration` | `Number`   | `300`                        | Default animation duration in milliseconds for layout changes (add, remove, swap).                       |
| `swapDuration`   | `Number`   | `150`                        | Animation duration in milliseconds for the swap animation during drag-and-drop.                          |
| `layoutEasing`   | `String`   | `"ease"`                     | A CSS easing function for animations.                                                                    |
| `classNames`     | `Object`   | `{ item: 'grid-item', ... }` | An object to override the default CSS class names used by the library.                                   |

### Methods

- `add(item, { index })`: Adds a new item to the grid.
  - `item` (Object): The item data object (must include a unique `id`).
  - `index` (Number, optional): The index at which to add the item. Appends to
    the end if not provided.
- `remove(id)`: Removes an item from the grid by its ID.
  - `id` (Number): The unique ID of the item to remove.
- `swap(fromId, toId)`: Programmatically swaps two items by their IDs. Triggers
  a `swap` event.
  - `fromId` (Number): The ID of the first item.
  - `toId` (Number): The ID of the second item.
- `layout(duration)`: Manually triggers a re-layout and animation of the grid.
  - `duration` (Number, optional): A specific duration for this animation,
    overriding the default.
- `on(event, callback)`: Subscribes to a grid event.
  - `event` (String): The name of the event to listen for.
  - `callback` (Function): The function to execute when the event fires.
- `off(event)`: Unsubscribes from a grid event.
  - `event` (String): The name of the event to unsubscribe from.
- `destroy()`: Removes all event listeners and clears the grid container.

### Events

| Event         | Payload Data                                              | Description                                                         |
| ------------- | --------------------------------------------------------- | ------------------------------------------------------------------- |
| `add`         | `{ items: HTMLElement[] }`                                | Fired after one or more items have been added.                      |
| `remove`      | `{ items: HTMLElement[] }`                                | Fired after one or more items have been removed.                    |
| `dragStart`   | `{ item: HTMLElement, event: Event }`                     | Fired when a user starts dragging an item.                          |
| `dragMove`    | `{ item: HTMLElement, event: Event }`                     | Fired continuously while the user is dragging an item.              |
| `dragEnd`     | `{ item: HTMLElement, event: Event }`                     | Fired when a user drops an item.                                    |
| `swap`        | `{ fromId: number, toId: number, item: HTMLElement }`     | Fired when two items are swapped, either by drag-and-drop           |
| `sort`        | `{ fromId: number, toId: number, items: GridItemData[] }` | Fired after a `swap` event, containing the newly sorted data array. |
| `layoutStart` | `undefined`                                               | Fired at the beginning of any layout animation.                     |
| `layoutEnd`   | `undefined`                                               | Fired at the end of any layout animation.                           |

---

## CSS Customization

You can customize the look and feel by overriding the default CSS classes.

- `.grid-item`: The base class for all grid items.
- `.dragging`: Added to an item being actively dragged (the original item, which
  is hidden).
- `.placeholder`: Added to the target item that the dragged item will swap with.
- `.ghost`: The class for the floating element that follows the cursor/finger.
- `.item-entering`: A class briefly added to new items to animate them in.
- `.item-exiting`: A class added to removed items to animate them out.

---

### Notes

- All pull requests are welcome, feel free.

### Author

- [Haikel Fazzani](https://github.com/haikelfazzani)

## License

Apache License 2.0
