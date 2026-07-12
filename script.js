const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const btnPlay = document.getElementById('btn-play');
const btnStep = document.getElementById('btn-step');
const btnClear = document.getElementById('btn-clear');
const btnSeed = document.getElementById('btn-seed');
const genLabel = document.getElementById('gen-count');
const cellLabel = document.getElementById('cell-count');

let cellSize = 16;
let offsetX = 0;
let offsetY = 0;
let livingCells = new Set();
let generation = 0;
let isRunning = false;
let tickTimer = null;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;
let mouseMoved = false;

const TICK_SPEED = 120;

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  render();
}

function screenToWorld(sx, sy) {
  return {
    x: Math.floor((sx - offsetX) / cellSize),
    y: Math.floor((sy - offsetY) / cellSize)
  };
}

function updateLabels() {
  genLabel.textContent = `Gen: ${generation}`;
  cellLabel.textContent = `Cells: ${livingCells.size}`;
}

function countNeighbors(x, y) {
  let count = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (livingCells.has(`${x + dx},${y + dy}`)) count++;
    }
  }
  return count;
}

function computeNext() {
  let checked = new Set();
  let nextGen = new Set();

  for (let key of livingCells) {
    checked.add(key);
    let [cx, cy] = key.split(',');
    let nx = Number(cx);
    let ny = Number(cy);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        checked.add(`${nx + dx},${ny + dy}`);
      }
    }
  }

  for (let key of checked) {
    let [cx, cy] = key.split(',');
    let nx = Number(cx);
    let ny = Number(cy);
    let neighbors = countNeighbors(nx, ny);
    let isLiving = livingCells.has(key);

    if (isLiving && (neighbors === 2 || neighbors === 3)) {
      nextGen.add(key);
    } else if (!isLiving && neighbors === 3) {
      nextGen.add(key);
    }
  }

  livingCells = nextGen;
  generation++;
}

function toggleCell(sx, sy) {
  let { x, y } = screenToWorld(sx, sy);
  let key = `${x},${y}`;
  if (livingCells.has(key)) {
    livingCells.delete(key);
  } else {
    livingCells.add(key);
  }
  render();
}

function render() {
  let w = canvas.width;
  let h = canvas.height;

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);

  let startX = Math.floor(-offsetX / cellSize);
  let startY = Math.floor(-offsetY / cellSize);
  let endX = Math.ceil((w - offsetX) / cellSize);
  let endY = Math.ceil((h - offsetY) / cellSize);

  ctx.strokeStyle = '#1e1e1e';
  ctx.lineWidth = 0.5;

  ctx.beginPath();
  for (let x = startX; x <= endX; x++) {
    let px = x * cellSize + offsetX;
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
  }
  for (let y = startY; y <= endY; y++) {
    let py = y * cellSize + offsetY;
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
  }
  ctx.stroke();

  ctx.fillStyle = '#c8c8c8';
  let pad = Math.max(1, Math.floor(cellSize * 0.1));

  for (let key of livingCells) {
    let [cx, cy] = key.split(',');
    let nx = Number(cx);
    let ny = Number(cy);
    let px = nx * cellSize + offsetX;
    let py = ny * cellSize + offsetY;

    if (px + cellSize < 0 || px > w || py + cellSize < 0 || py > h) continue;

    ctx.fillRect(px + pad, py + pad, cellSize - pad * 2, cellSize - pad * 2);
  }

  updateLabels();
}

function startRunning() {
  isRunning = true;
  btnPlay.textContent = 'Pause';
  tickTimer = setInterval(() => {
    computeNext();
    render();
  }, TICK_SPEED);
}

function stopRunning() {
  isRunning = false;
  btnPlay.textContent = 'Play';
  clearInterval(tickTimer);
  tickTimer = null;
}

function clearBoard() {
  stopRunning();
  livingCells.clear();
  generation = 0;
  render();
}

function seedRandom() {
  let w = canvas.width;
  let h = canvas.height;
  let topLeft = screenToWorld(0, 0);
  let bottomRight = screenToWorld(w, h);
  let cols = bottomRight.x - topLeft.x;
  let rows = bottomRight.y - topLeft.y;
  let count = Math.floor(cols * rows * 0.15);

  for (let i = 0; i < count; i++) {
    let rx = topLeft.x + Math.floor(Math.random() * cols);
    let ry = topLeft.y + Math.floor(Math.random() * rows);
    livingCells.add(`${rx},${ry}`);
  }

  generation = 0;
  render();
}

btnPlay.addEventListener('click', () => {
  if (isRunning) stopRunning();
  else startRunning();
});

btnStep.addEventListener('click', () => {
  if (isRunning) stopRunning();
  computeNext();
  render();
});

btnClear.addEventListener('click', clearBoard);
btnSeed.addEventListener('click', seedRandom);

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  isDragging = true;
  mouseMoved = false;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragOffsetX = offsetX;
  dragOffsetY = offsetY;
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  let dx = e.clientX - dragStartX;
  let dy = e.clientY - dragStartY;

  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    mouseMoved = true;
  }

  offsetX = dragOffsetX + dx;
  offsetY = dragOffsetY + dy;
  render();
});

window.addEventListener('mouseup', (e) => {
  if (!isDragging) return;
  isDragging = false;

  if (!mouseMoved && e.button === 0) {
    let rect = canvas.getBoundingClientRect();
    toggleCell(e.clientX - rect.left, e.clientY - rect.top);
  }
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  let rect = canvas.getBoundingClientRect();
  let mx = e.clientX - rect.left;
  let my = e.clientY - rect.top;

  let worldX = (mx - offsetX) / cellSize;
  let worldY = (my - offsetY) / cellSize;

  let factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  let newSize = cellSize * factor;

  if (newSize < 3) newSize = 3;
  if (newSize > 120) newSize = 120;

  cellSize = newSize;
  offsetX = mx - worldX * cellSize;
  offsetY = my - worldY * cellSize;

  render();
}, { passive: false });

window.addEventListener('resize', resizeCanvas);

offsetX = Math.floor(window.innerWidth / 2);
offsetY = Math.floor((window.innerHeight - 40) / 2);

resizeCanvas();

