# Swappable Grid drag and drop
Lightweight, high-performance drag and drop grid library with smooth animations and touch support. Create interactive, swappable grids with minimal overhead and maximum responsiveness. [codepen](https://codepen.io/haikelfazzani-the-bold/pen/GgpMpzE)

<hr />

<div align="center" style="width:100%; text-align:center;">
  <img src="https://badgen.net/bundlephobia/min/swappable" alt="swappable" />
  <img src="https://badgen.net/bundlephobia/dependency-count/swappable" alt="swappable" />
  <img src="https://badgen.net/npm/v/swappable" alt="swappable" />
  <img src="https://badgen.net/npm/dt/swappable" alt="swappable" />
  <img src="https://data.jsdelivr.com/v1/package/npm/swappable/badge" alt="swappable"/>
</div>


## Usage

```bash
$ npm i swappable
```

```js
import swappable from "swappable";
import './node_modules/swappable/dist/swappable.css'
// you must import css file
```

### Usage

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/swappable/dist/swappable.min.css"
/>
<script
  src="https://cdn.jsdelivr.net/npm/swappable@1.0.0/dist/index.umd.js"
></script>
<!-- Access via global object : window.Swappable -->

<div id="controls">
  <button id="add-item-btn">Add Item</button>
  <button id="remove-item-btn">Remove Item #1</button>
</div>

<div id="my-grid"></div>

<script>
  const initialData = [
    { id: 1, content: "Item 1" },
    { id: 2, content: "Item 2" },
    { id: 3, content: "Item 3" },
    { id: 4, content: "Item 4" },
    { id: 5, content: "Item 5" },
    { id: 6, content: "Item 6" },
  ];

  const grid = new Swappable("#my-grid", { // default config
    items: ".grid-item",
    data: initialData,
    itemsPerRow: 4,
    swapDuration: 300,
    layoutDuration: 300,
    renderItem: (item) => `
    <div class="grid-item-content">
      ${item.content || ""} (${item.id})
      <img src="https://smaller-pictures.appspot.com/images/dreamstime_xxl_65780868_small.jpg" alt="">
    </div>`,
    classNames: {
      item: "grid-item",
      drag: "dragging",
      placeholder: "placeholder",
      ghost: "ghost",
      entering: "item-entering",
      exiting: "item-exiting",
    },
  });

  // Control buttons
  const addItemBtn = document.getElementById("add-item-btn");
  let newItemCounter = initialData.length + 1;
  
  addItemBtn.addEventListener("click", () => {
    const newItem = {
      id: newItemCounter,
      content: `Item ${newItemCounter}`,
    };
    grid.add(newItem);
    newItemCounter++;
  });

  document.getElementById("remove-item-btn").addEventListener("click", () => {
    grid.remove(1);
  });
</script>
```

### Notes

- All pull requests are welcome, feel free.

### Author

- [Haikel Fazzani](https://github.com/haikelfazzani)

## License

Apache License 2.0
