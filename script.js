const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const btnPlay = document.getElementById('btn-play');
const btnStep = document.getElementById('btn-step');
const btnClear = document.getElementById('btn-clear');
const btnSeed = document.getElementById('btn-seed');
const btnCenter = document.getElementById('btn-center');
const btnModePan = document.getElementById('btn-mode-pan');
const btnModeDraw = document.getElementById('btn-mode-draw');
const btnSave = document.getElementById('btn-save');
const btnLoad = document.getElementById('btn-load');
const fileInput = document.getElementById('file-input');
const speedRange = document.getElementById('speed-range');
const genLabel = document.getElementById('gen-count');
const cellLabel = document.getElementById('cell-count');

let cellSize = 16;
let offsetX = 0;
let offsetY = 0;
let livingCells = new Set();
let cellTrails = new Map();
let generation = 0;
let isRunning = false;
let tickTimer = null;
let isDragging = false;
let isDrawing = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;
let mouseMoved = false;
let currentMode = 'pan';
let tickSpeed = 120;
let isErasing = false;

const PATTERN_STRINGS = {
  glider: [
    ".X.",
    "..X",
    "XXX"
  ],
  lwss: [
    ".X..X",
    "X....",
    "X...X",
    "XXXX."
  ],
  pulsar: [
    "..XXX...XXX..",
    ".............",
    "X....X.X....X",
    "X....X.X....X",
    "X....X.X....X",
    "..XXX...XXX..",
    ".............",
    "..XXX...XXX..",
    "X....X.X....X",
    "X....X.X....X",
    "X....X.X....X",
    ".............",
    "..XXX...XXX.."
  ]
};

function parsePattern(strArr) {
  let coords = [];
  for (let y = 0; y < strArr.length; y++) {
    for (let x = 0; x < strArr[y].length; x++) {
      if (strArr[y][x] === 'X') {
        coords.push([x, y]);
      }
    }
  }
  return coords;
}

const PATTERNS = {
  glider: parsePattern(PATTERN_STRINGS.glider),
  lwss: parsePattern(PATTERN_STRINGS.lwss),
  pulsar: parsePattern(PATTERN_STRINGS.pulsar)
};

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

  let nextTrails = new Map();
  for (let [key, age] of cellTrails) {
    if (!nextGen.has(key)) {
      if (age < 3) nextTrails.set(key, age + 1);
    }
  }
  for (let key of livingCells) {
    if (!nextGen.has(key)) {
      nextTrails.set(key, 1);
    }
  }

  livingCells = nextGen;
  cellTrails = nextTrails;
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
}

function paintCell(sx, sy) {
  let { x, y } = screenToWorld(sx, sy);
  let key = `${x},${y}`;
  if (isErasing) {
    livingCells.delete(key);
  } else {
    livingCells.add(key);
  }
}

function placePattern(name) {
  let coords = PATTERNS[name];
  if (!coords) return;
  
  let centerX = Math.floor(canvas.width / 2);
  let centerY = Math.floor(canvas.height / 2);
  let { x: wx, y: wy } = screenToWorld(centerX, centerY);
  
  for (let [dx, dy] of coords) {
    livingCells.add(`${wx + dx},${wy + dy}`);
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

  if (cellSize > 8) {
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
  }

  let pad = Math.max(1, Math.floor(cellSize * 0.1));

  for (let [key, age] of cellTrails) {
    if (livingCells.has(key)) continue;
    let [cx, cy] = key.split(',');
    let nx = Number(cx);
    let ny = Number(cy);
    let px = nx * cellSize + offsetX;
    let py = ny * cellSize + offsetY;

    if (px + cellSize < 0 || px > w || py + cellSize < 0 || py > h) continue;

    if (age === 1) ctx.fillStyle = '#444';
    else if (age === 2) ctx.fillStyle = '#2a2a2a';
    else ctx.fillStyle = '#1a1a1a';

    ctx.fillRect(px + pad, py + pad, cellSize - pad * 2, cellSize - pad * 2);
  }

  ctx.fillStyle = '#c8c8c8';
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
  }, tickSpeed);
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
  cellTrails.clear();
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
  cellTrails.clear();
  render();
}

function centerView() {
  if (livingCells.size === 0) return;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (let key of livingCells) {
    let [cx, cy] = key.split(',');
    let nx = Number(cx);
    let ny = Number(cy);
    if (nx < minX) minX = nx;
    if (nx > maxX) maxX = nx;
    if (ny < minY) minY = ny;
    if (ny > maxY) maxY = ny;
  }
  
  let centerX = (minX + maxX) / 2;
  let centerY = (minY + maxY) / 2;
  
  offsetX = (canvas.width / 2) - (centerX * cellSize) - (cellSize / 2);
  offsetY = (canvas.height / 2) - (centerY * cellSize) - (cellSize / 2);
  
  render();
}

function saveState() {
  let data = {
    gen: generation,
    cells: [...livingCells]
  };
  let blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = `gol-gen-${generation}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleFileLoad(e) {
  let file = e.target.files[0];
  if (!file) return;
  let reader = new FileReader();
  reader.onload = (evt) => {
    try {
      let data = JSON.parse(evt.target.result);
      if (data.cells && Array.isArray(data.cells)) {
        livingCells = new Set(data.cells);
        generation = data.gen || 0;
        cellTrails.clear();
        render();
      }
    } catch (err) {
      console.warn('Failed to parse save file');
    }
  };
  reader.readAsText(file);
  fileInput.value = '';
}

function setMode(mode) {
  currentMode = mode;
  btnModePan.classList.toggle('active', mode === 'pan');
  btnModeDraw.classList.toggle('active', mode === 'draw');
  canvas.classList.toggle('panning', mode === 'pan');
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
btnCenter.addEventListener('click', centerView);

btnModePan.addEventListener('click', () => setMode('pan'));
btnModeDraw.addEventListener('click', () => setMode('draw'));

document.querySelectorAll('.pat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    placePattern(btn.dataset.pat);
  });
});

btnSave.addEventListener('click', saveState);
btnLoad.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileLoad);

speedRange.addEventListener('input', (e) => {
  tickSpeed = Number(e.target.value);
  if (isRunning) {
    stopRunning();
    startRunning();
  }
});

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 2 || e.shiftKey) {
    isErasing = true;
  } else {
    isErasing = false;
  }

  if (currentMode === 'pan' && !isErasing) {
    isDragging = true;
    mouseMoved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragOffsetX = offsetX;
    dragOffsetY = offsetY;
  } else if (currentMode === 'draw' || isErasing) {
    isDrawing = true;
    let rect = canvas.getBoundingClientRect();
    paintCell(e.clientX - rect.left, e.clientY - rect.top);
    render();
  }
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousemove', (e) => {
  let rect = canvas.getBoundingClientRect();
  let mx = e.clientX - rect.left;
  let my = e.clientY - rect.top;

  if (isDragging) {
    let dx = e.clientX - dragStartX;
    let dy = e.clientY - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      mouseMoved = true;
    }
    offsetX = dragOffsetX + dx;
    offsetY = dragOffsetY + dy;
    render();
  } else if (isDrawing) {
    paintCell(mx, my);
    render();
  }
});

window.addEventListener('mouseup', (e) => {
  if (isDragging && !mouseMoved && e.button === 0 && !isErasing) {
    let rect = canvas.getBoundingClientRect();
    toggleCell(e.clientX - rect.left, e.clientY - rect.top);
    render();
  }
  
  isDragging = false;
  isDrawing = false;
  isErasing = false;
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

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  
  switch(e.code) {
    case 'Space':
      e.preventDefault();
      if (isRunning) stopRunning();
      else startRunning();
      break;
    case 'ArrowRight':
    case 'KeyN':
      if (isRunning) stopRunning();
      computeNext();
      render();
      break;
    case 'KeyC':
      clearBoard();
      break;
    case 'KeyR':
      seedRandom();
      break;
    case 'KeyF':
      centerView();
      break;
  }
});

window.addEventListener('resize', resizeCanvas);

offsetX = Math.floor(window.innerWidth / 2);
offsetY = Math.floor((window.innerHeight - 40) / 2);

setMode('pan');
resizeCanvas();


