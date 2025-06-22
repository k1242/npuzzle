// Apply CSS variables
const applyCSS = settings => {
  const root = document.documentElement.style;
  root.setProperty('--n', settings.n);
  
  // Calculate size based on screen width and board size
  const padding = 40; // Account for board padding
  const headerHeight = 120; // Account for header
  const controlsHeight = 80; // Account for buttons below
  
  const availableWidth = Math.min(innerWidth - padding, 600); // Reduced max width
  const availableHeight = innerHeight - headerHeight - controlsHeight - padding;
  
  const maxSizeFromWidth = availableWidth / (settings.n + 1.5); // More padding
  const maxSizeFromHeight = availableHeight / (settings.n + 1.5);
  
  const idealSize = Math.min(maxSizeFromWidth, maxSizeFromHeight);
  
  // Adjusted size limits
  const minSize = 20;
  const maxSize = innerWidth <= 768 ? 40 : 45; // Smaller max size, especially on smaller screens
  
  const size = Math.max(minSize, Math.min(maxSize, idealSize));
  root.setProperty('--size', size + 'px');
};

// Get current cell size from CSS
const getCellSize = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--size'));

// Create cell element
const createCell = (r, c) => {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.dataset.row = r;
  cell.dataset.col = c;
  return cell;
};

// Create line element
const createLine = (r1, c1, r2, c2, className = 'line') => {
  const line = document.createElement('div');
  line.className = className;
  const cellSize = getCellSize();
  
  if (r1 === r2) { // horizontal
    line.classList.add('horizontal');
    line.style.left = `${Math.min(c1, c2) * cellSize}px`;
    line.style.width = `${cellSize}px`;
    line.style.top = `${r1 * cellSize}px`;
  } else { // vertical
    line.classList.add('vertical');
    line.style.top = `${Math.min(r1, r2) * cellSize}px`;
    line.style.height = `${cellSize}px`;
    line.style.left = `${c1 * cellSize}px`;
  }
  
  return line;
};

// Create circle element
const createCircle = (circle, isInvalid = false) => {
  const cellSize = getCellSize();
  const circ = document.createElement('div');
  circ.className = `circle ${circle.type}`;
  if (isInvalid) {
    circ.classList.add('error');
  }
  circ.style.left = `${circle.vc * cellSize}px`;
  circ.style.top = `${circle.vr * cellSize}px`;
  return circ;
};

// Create edge element
const createEdge = (r, c, isHorizontal, edgeKey) => {
  const cellSize = getCellSize();
  const edge = document.createElement('div');
  edge.className = `edge ${isHorizontal ? 'horizontal' : 'vertical'}`;
  edge.dataset.edge = edgeKey;
  
  if (isHorizontal) {
    edge.style.left = `${c * cellSize - 1}px`;
    edge.style.top = `${r * cellSize}px`;
  } else {
    edge.style.left = `${c * cellSize}px`;
    edge.style.top = `${r * cellSize - 1}px`;
  }
  
  return edge;
};

// Main render function
const render = (settings, circles, lines, invalidCircles, edgeKeyFunc) => {
  const grid = document.querySelector('#gameGrid');
  grid.innerHTML = '';
  
  // Create cells
  for (let r = 0; r < settings.n; r++) {
    for (let c = 0; c < settings.n; c++) {
      grid.appendChild(createCell(r, c));
    }
  }
  
  // Render lines
  Object.entries(lines).forEach(([key, active]) => {
    if (!active) return;
    const [p1, p2] = key.split('-');
    const [r1, c1] = p1.split(',').map(Number);
    const [r2, c2] = p2.split(',').map(Number);
    grid.appendChild(createLine(r1, c1, r2, c2));
  });
  
  // Render circles
  circles.forEach(circle => {
    const isInvalid = invalidCircles.has(`${circle.vr},${circle.vc}`);
    grid.appendChild(createCircle(circle, isInvalid));
  });
  
  // Add clickable edges
  for (let r = 0; r <= settings.n; r++) {
    for (let c = 0; c <= settings.n; c++) {
      if (c < settings.n) { // horizontal edge
        const key = edgeKeyFunc(r, c, r, c+1);
        grid.appendChild(createEdge(r, c, true, key));
      }
      
      if (r < settings.n) { // vertical edge
        const key = edgeKeyFunc(r, c, r+1, c);
        grid.appendChild(createEdge(r, c, false, key));
      }
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    applyCSS,
    getCellSize,
    createCell,
    createLine,
    createCircle,
    createEdge,
    render
  };
}