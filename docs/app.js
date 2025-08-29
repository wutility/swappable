const grid = new Swappable('#my-grid', {
  itemsPerRow: 4,
  layoutDuration: 300,
  swapDuration: 300,
  longPressDelay: 100
});

const grid2 = new Swappable('#my-grid-2', {
  itemsPerRow: 1,
});

// add new item
const addItemBtn = document.getElementById('add-item-btn');
addItemBtn.addEventListener('click', () => {
  const item = fruits[0];
  
  const div = document.createElement('div');
  const img = document.createElement('img');
  const desc = document.createElement('p')
  div.classList.add('grid-item')
  desc.textContent = item.description
  img.src = item.img
  img.width = 50
  img.height = 50

  div.appendChild(img)
  div.appendChild(desc);


  grid.add(div);
  grid.refresh();
});

document.getElementById('remove-item-btn').addEventListener('click', () => {
  grid.remove(grid.getSize() - 1);
});

document.getElementById('swap-item-btn').addEventListener('click', () => {
  grid.swap(1, 2);
});

document.getElementById('disable-item-btn').addEventListener('click', () => {
  grid.disable();
});

document.getElementById('enable-item-btn').addEventListener('click', () => {
  grid.enable();
});

const fruits = [
  {
    title: "Apple",
    img: "https://openmoji.org/data/color/svg/1F34E.svg",
    description: "Crisp and sweet fruit, tasty raw or baked, loved worldwide."
  },
  {
    title: "Banana",
    img: "https://openmoji.org/data/color/svg/1F34C.svg",
    description: "Soft and sweet banana, rich in energy, enjoyed everywhere."
  },
  {
    title: "Orange",
    img: "https://openmoji.org/data/color/svg/1F34A.svg",
    description: "Juicy orange citrus, refreshing and bright with zesty taste."
  },
  {
    title: "Strawberry",
    img: "https://openmoji.org/data/color/svg/1F353.svg",
    description: "Sweet red strawberry, fragrant berries enjoyed fresh daily."
  },
  {
    title: "Grapes",
    img: "https://openmoji.org/data/color/svg/1F347.svg",
    description: "Juicy grape clusters, eaten fresh, dried, or made into wine."
  },
  {
    title: "Pineapple",
    img: "https://openmoji.org/data/color/svg/1F34D.svg",
    description: "Tropical pineapple fruit, tangy sweet flesh full of flavor."
  },
  {
    title: "Watermelon",
    img: "https://openmoji.org/data/color/svg/1F349.svg",
    description: "Refreshing watermelon fruit, hydrating red flesh inside rind."
  },
  {
    title: "Mango",
    img: "https://openmoji.org/data/color/svg/1F96D.svg",
    description: "Juicy mango fruit, golden flesh, tropical sweetness enjoyed."
  },
  {
    title: "Kiwi",
    img: "https://openmoji.org/data/color/svg/1F95D.svg",
    description: "Tangy kiwi fruit, green flesh with tiny edible crunchy seeds."
  },
  {
    title: "Peach",
    img: "https://openmoji.org/data/color/svg/1F351.svg",
    description: "Soft juicy peach, fragrant stone fruit with golden orange flesh."
  }
];

const parent = document.getElementById('my-grid');
fruits.forEach((item, i) => {
  const div = document.createElement('div');
  const img = document.createElement('img');
  const desc = document.createElement('p')
  div.classList.add('grid-item')
  desc.textContent = item.description
  img.src = item.img
  img.width = 50
  img.height = 50

  div.appendChild(img)
  div.appendChild(desc);
  parent.appendChild(div);

  if (i >= fruits.length - 1) grid.refresh();
});