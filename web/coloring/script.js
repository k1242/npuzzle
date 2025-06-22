/* ====== DOM HELPER ====== */
const $ = sel => document.querySelector(sel);

/* ====== GAME STATE ====== */
const initState = () => {
  // Select random puzzle from list
  currentPuzzleIndex = Math.floor(Math.random() * puzzle_list.length);
  loadPuzzle(currentPuzzleIndex);
};

const loadPuzzle = (index) => {
  if (index < 0 || index >= puzzle_list.length) return false;
  
  const puzzle = puzzle_list[index];
  currentPuzzleIndex = index;
  
  // Parse puzzle data
  vertexCount = puzzle[0];
  verticesX = [...puzzle[1]];
  verticesY = [...puzzle[2]];
  edgesStart = [...puzzle[3]];
  edgesEnd = [...puzzle[4]];
  
  // Initialize vertex colors (0 = uncolored)
  vertexColors = new Array(vertexCount).fill(0);
  
  // Set fixed vertices
  fixedVertices = new Set();
  const preColoredVertices = puzzle[5] || [];
  const preColoredColors = puzzle[6] || [];
  
  for (let i = 0; i < preColoredVertices.length; i++) {
    const v = preColoredVertices[i];
    const c = preColoredColors[i];
    vertexColors[v] = c;
    fixedVertices.add(v);
  }
  
  solved = false;
  updatePuzzleNumber();
  render();
  
  // Save the new game state
  setTimeout(() => saveGame(), 10);
  
  return true;
};

const updatePuzzleNumber = () => {
  const puzzleNumberEl = $('#puzzleNumber');
  if (puzzleNumberEl && currentPuzzleIndex >= 0) {
    puzzleNumberEl.textContent = `#${currentPuzzleIndex + 1}`;
  } else if (puzzleNumberEl) {
    puzzleNumberEl.textContent = '';
  }
};

const newGame = () => {
  initState();
  selectedColor = null;
  solved = false;
  
  CorrectNotification.hide();
  render();
  
  // Close settings panel
  const panel = $('#panel');
  const menuBtn = $('#menuBtn');
  if (panel) panel.classList.remove('open');
  if (menuBtn) menuBtn.classList.remove('active');
};

/* ====== GAME LOGIC ====== */
const cycleVertexColor = (vertex) => {
  if (fixedVertices.has(vertex)) return;
  
  // Cycle through colors: 0 -> 1 -> 2 -> 3 -> 0
  vertexColors[vertex] = (vertexColors[vertex] + 1) % 4;
  render();
};

const setVertexColor = (vertex, color) => {
  if (fixedVertices.has(vertex)) return;
  
  vertexColors[vertex] = color;
  render();
};

const findConflicts = () => {
  const conflicts = new Set();
  
  // Check each edge
  for (let i = 0; i < edgesStart.length; i++) {
    const v1 = edgesStart[i];
    const v2 = edgesEnd[i];
    
    // If both vertices have same non-zero color, it's a conflict
    if (vertexColors[v1] !== 0 && 
        vertexColors[v1] === vertexColors[v2]) {
      conflicts.add(v1);
      conflicts.add(v2);
    }
  }
  
  return conflicts;
};

const checkSolution = () => {
  // All vertices must be colored (non-zero)
  for (let i = 0; i < vertexCount; i++) {
    if (vertexColors[i] === 0) return false;
  }
  
  // No conflicts allowed
  const conflicts = findConflicts();
  return conflicts.size === 0;
};

/* ====== EVENT HANDLERS ====== */
const handleVertexClick = (vertex) => {
  if (selectedColor !== null) {
    // Color mode - apply selected color
    setVertexColor(vertex, selectedColor);
  } else {
    // Cycle mode - cycle through colors
    cycleVertexColor(vertex);
  }
};

const handleColorSelect = (color) => {
  selectedColor = (selectedColor === color) ? null : color;
  updateColorPalette();
};

const handleKeyPress = (e) => {
  const key = e.key;
  
  // Number keys 0-3 for color selection
  if (key >= '0' && key <= '3') {
    handleColorSelect(parseInt(key));
  }
};

const updateColorPalette = () => {
  document.querySelectorAll('.color-btn').forEach(btn => {
    const color = parseInt(btn.dataset.color);
    btn.classList.toggle('selected', selectedColor === color);
  });
};

const setupEventHandlers = () => {
  // Keyboard input
  document.addEventListener('keydown', handleKeyPress);
  
  // Color palette clicks
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.onclick = () => {
      const color = parseInt(btn.dataset.color);
      handleColorSelect(color);
    };
  });
  
  // New game button
  const newBtn = $('#newBtn');
  if (newBtn) {
    newBtn.onclick = () => newGame();
  }
  
  // Load code button
  const loadCodeBtn = $('#loadCodeBtn');
  if (loadCodeBtn) {
    loadCodeBtn.onclick = () => {
      const codeInput = $('#codeInput');
      if (codeInput) {
        const code = codeInput.value.trim();
        if (code.startsWith('#')) {
          const puzzleNum = parseInt(code.substring(1));
          if (!isNaN(puzzleNum) && puzzleNum >= 1 && puzzleNum <= puzzle_list.length) {
            if (loadPuzzle(puzzleNum - 1)) {
              codeInput.value = '';
            } else {
              alert('Invalid puzzle number');
            }
          } else {
            alert('Invalid puzzle number');
          }
        } else {
          alert('Use format #1, #2, etc.');
        }
      }
    };
  }
  
  // Enter key on code input
  const codeInput = $('#codeInput');
  if (codeInput) {
    codeInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && loadCodeBtn) loadCodeBtn.click();
    });
  }
  
  // Help link
  const helpLink = $('#helpLink');
  if (helpLink) {
    helpLink.onclick = e => {
      e.preventDefault();
      const helpModal = $('#helpModal');
      if (helpModal) helpModal.style.display = 'flex';
    };
  }
  
  // Close help modal
  const closeHelp = $('#closeHelp');
  if (closeHelp) {
    closeHelp.onclick = () => {
      const helpModal = $('#helpModal');
      if (helpModal) helpModal.style.display = 'none';
    };
  }
  
  // Close modal on background click
  const helpModal = $('#helpModal');
  if (helpModal) {
    helpModal.onclick = e => {
      if (e.target === helpModal) {
        helpModal.style.display = 'none';
      }
    };
  }
};

/* ====== INITIALIZATION ====== */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure all required scripts are loaded
  if (typeof puzzle_list === 'undefined') {
    console.error('list.js not loaded');
    return;
  }
  
  // Initialize common UI
  initCommonUI();
  
  // Setup game-specific handlers
  setupEventHandlers();
  
  // Load saved game or create new
  try {
    if (!loadSavedGame()) {
      console.log('No saved game found, starting new game');
      newGame();
    } else {
      console.log('Loaded saved game');
    }
  } catch (e) {
    console.error('Error loading game:', e);
    newGame();
  }
  
  // Auto-save on page unload
  window.addEventListener('beforeunload', () => saveGame());
});

// Make functions globally accessible
window.cycleVertexColor = cycleVertexColor;
window.setVertexColor = setVertexColor;
window.findConflicts = findConflicts;
window.checkSolution = checkSolution;
window.handleVertexClick = handleVertexClick;
window.newGame = newGame;
window.initState = initState;
window.loadPuzzle = loadPuzzle;