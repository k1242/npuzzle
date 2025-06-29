/* ====== GAME STATE ====== */
// Global variables are declared in index.html before this script loads

// Undo history
const MAX_UNDO_HISTORY = 100;

// markedCells is now a Map: key -> color (1 or 2)

/* ====== UNDO FUNCTIONALITY ====== */
const createSnapshot = () => {
  return {
    board: board.map(row => [...row]),
    pencilMarks: pencilMarks.map(row => 
      row.map(set => new Set(set))
    ),
    markedCells: new Map(markedCells) // Save marked cells state
  };
};

const saveSnapshot = () => {
  undoHistory.push(createSnapshot());
  if (undoHistory.length > MAX_UNDO_HISTORY) {
    undoHistory.shift();
  }
  updateUndoButton();
  gameModified = true; // Mark game as modified
};

const performUndo = () => {
  if (undoHistory.length === 0) return;
  
  const snapshot = undoHistory.pop();
  board = snapshot.board;
  pencilMarks = snapshot.pencilMarks;
  markedCells = snapshot.markedCells || new Map(); // Restore marked cells
  
  // If auto-clear is enabled, clean up notes after undo
  if (autoClearNotes) {
    clearInvalidNotes();
  }
  
  updateUndoButton();
  render();
};

const updateUndoButton = () => {
  const undoBtn = $('#undoBtn');
  if (undoBtn) {
    undoBtn.classList.toggle('disabled', undoHistory.length === 0);
  }
};

/* ====== STATE MANAGEMENT ====== */
const initState = () => {
  // Select random puzzle from list
  currentPuzzleIndex = Math.floor(Math.random() * puzzle_list.length);
  const puzzleString = puzzle_list[currentPuzzleIndex];
  
  // Parse puzzle string
  board = [];
  fixed = [];
  pencilMarks = [];
  initialBoard = [];
  
  for (let r = 0; r < 9; r++) {
    board[r] = [];
    fixed[r] = [];
    pencilMarks[r] = [];
    initialBoard[r] = [];
    
    for (let c = 0; c < 9; c++) {
      const idx = r * 9 + c;
      const val = parseInt(puzzleString[idx]);
      board[r][c] = val;
      fixed[r][c] = val !== 0;
      pencilMarks[r][c] = new Set();
      initialBoard[r][c] = val;
    }
  }
  
  solution = board.map(row => [...row]);
  window.initialBoard = initialBoard.map(row => [...row]);
  
  // Apply prefill if enabled
  if (prefillNotes) {
    prefillAllNotes();
  }
  
  // Clear undo history and markers
  undoHistory = [];
  markedCells.clear();
  updateUndoButton();
  updatePuzzleNumber();
  updateCodeInput();
};

const updatePuzzleNumber = () => {
  const puzzleNumberEl = $('#puzzleNumber');
  if (puzzleNumberEl && currentPuzzleIndex >= 0) {
    puzzleNumberEl.textContent = `(#${currentPuzzleIndex + 1})`;
  } else if (puzzleNumberEl) {
    puzzleNumberEl.textContent = '';
  }
};

const newGame = () => {
  initState();
  solved = false;
  selectedCell = null;
  selectedNumber = null;
  eraserMode = false;
  window.eraserMode = false;
  pencilMode = false;
  markerMode = false;
  isDraggingMarker = false;
  dragStarted = false;
  needsRender = false;
  markedCells.clear(); // Clear marked cells
  gameModified = false; // Reset modified flag
  confirmingNewGame = false; // Reset confirmation state
  document.body.classList.remove('marker-mode');
  
  // Reset New Game button
  const newBtn = $('#newBtn');
  if (newBtn) {
    newBtn.textContent = 'New Game';
    newBtn.classList.remove('btn-danger');
  }
  
  const eraserBtn = $('#eraserBtn');
  const pencilBtn = $('#pencilBtn');
  const markerBtn = $('#markerBtn');
  if (eraserBtn) eraserBtn.classList.remove('active');
  if (pencilBtn) pencilBtn.classList.remove('active');
  if (markerBtn) markerBtn.classList.remove('active');
  
  CorrectNotification.hide();
  render();
  
  // Save the new game state
  setTimeout(() => saveGame(), 10);
};

const handleNewGameClick = () => {
  // If game is not modified, solved, or already confirming, start new game immediately
  if (!gameModified || solved || confirmingNewGame) {
    newGame();
    const panel = $('#panel');
    const menuBtn = $('#menuBtn');
    if (panel) panel.classList.remove('open');
    if (menuBtn) menuBtn.classList.remove('active');
    return;
  }
  
  // Set confirmation state and update button
  confirmingNewGame = true;
  const newBtn = $('#newBtn');
  if (newBtn) {
    newBtn.textContent = 'Confirm?';
    newBtn.classList.add('btn-danger');
    
    // Reset after 3 seconds if not clicked
    setTimeout(() => {
      if (confirmingNewGame) {
        confirmingNewGame = false;
        newBtn.textContent = 'New Game';
        newBtn.classList.remove('btn-danger');
      }
    }, 3000);
  }
};

/* ====== GAME LOGIC ====== */
const prefillAllNotes = () => {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        // Fill with all numbers 1-9
        for (let n = 1; n <= 9; n++) {
          pencilMarks[r][c].add(n);
        }
      }
    }
  }
  
  // If auto-clear is enabled, clean up invalid notes
  if (autoClearNotes) {
    clearInvalidNotes();
  }
};

const clearInvalidNotes = () => {
  // For each cell with a number, remove that number from notes in related cells
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const num = board[r][c];
      if (num === 0) continue;
      
      // Clear from row
      for (let c2 = 0; c2 < 9; c2++) {
        if (c2 !== c) {
          pencilMarks[r][c2].delete(num);
        }
      }
      
      // Clear from column
      for (let r2 = 0; r2 < 9; r2++) {
        if (r2 !== r) {
          pencilMarks[r2][c].delete(num);
        }
      }
      
      // Clear from 3x3 block
      const blockR = Math.floor(r / 3) * 3;
      const blockC = Math.floor(c / 3) * 3;
      for (let br = blockR; br < blockR + 3; br++) {
        for (let bc = blockC; bc < blockC + 3; bc++) {
          if (br !== r || bc !== c) {
            pencilMarks[br][bc].delete(num);
          }
        }
      }
    }
  }
};

const placeNumber = (row, col, num) => {
  if (fixed[row][col]) return;
  
  if (pencilMode) {
    saveSnapshot();
    
    // Toggle pencil mark
    if (pencilMarks[row][col].has(num)) {
      pencilMarks[row][col].delete(num);
    } else {
      pencilMarks[row][col].add(num);
    }
  } else {
    // If pressing same number that's already there, erase it
    if (board[row][col] === num) {
      saveSnapshot();
      board[row][col] = 0;
      pencilMarks[row][col].clear();
    } else if (board[row][col] !== num) {
      // Place number normally only if it's different
      saveSnapshot();
      board[row][col] = num;
      pencilMarks[row][col].clear();
      
      // Auto-clear notes if enabled
      if (autoClearNotes) {
        // Clear this number from notes in same row
        for (let c = 0; c < 9; c++) {
          if (c !== col) {
            pencilMarks[row][c].delete(num);
          }
        }
        
        // Clear from same column
        for (let r = 0; r < 9; r++) {
          if (r !== row) {
            pencilMarks[r][col].delete(num);
          }
        }
        
        // Clear from same block
        const blockR = Math.floor(row / 3) * 3;
        const blockC = Math.floor(col / 3) * 3;
        for (let r = blockR; r < blockR + 3; r++) {
          for (let c = blockC; c < blockC + 3; c++) {
            if (r !== row || c !== col) {
              pencilMarks[r][c].delete(num);
            }
          }
        }
      }
    }
  }
  
  render();
};

const eraseCell = (row, col) => {
  if (fixed[row][col]) return;
  
  // Only save snapshot if there's something to erase
  if (board[row][col] !== 0 || pencilMarks[row][col].size > 0) {
    saveSnapshot();
    
    // Remember what number was here for auto-clear
    const erasedNum = board[row][col];
    
    board[row][col] = 0;
    pencilMarks[row][col].clear();
    
    // If auto-clear is enabled and we erased a number, re-add valid notes
    if (autoClearNotes && erasedNum !== 0) {
      // Add all possible numbers first
      for (let n = 1; n <= 9; n++) {
        pencilMarks[row][col].add(n);
      }
      
      // Then remove invalid ones
      // Check row
      for (let c = 0; c < 9; c++) {
        if (c !== col && board[row][c] !== 0) {
          pencilMarks[row][col].delete(board[row][c]);
        }
      }
      
      // Check column
      for (let r = 0; r < 9; r++) {
        if (r !== row && board[r][col] !== 0) {
          pencilMarks[row][col].delete(board[r][col]);
        }
      }
      
      // Check block
      const blockR = Math.floor(row / 3) * 3;
      const blockC = Math.floor(col / 3) * 3;
      for (let r = blockR; r < blockR + 3; r++) {
        for (let c = blockC; c < blockC + 3; c++) {
          if ((r !== row || c !== col) && board[r][c] !== 0) {
            pencilMarks[row][col].delete(board[r][c]);
          }
        }
      }
    }
    
    render();
  }
};

const checkConflicts = () => {
  const conflicts = [];
  
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const num = board[r][c];
      if (num === 0) continue;
      
      // Check row
      for (let c2 = 0; c2 < 9; c2++) {
        if (c2 !== c && board[r][c2] === num) {
          conflicts.push([r, c], [r, c2]);
        }
      }
      
      // Check column
      for (let r2 = 0; r2 < 9; r2++) {
        if (r2 !== r && board[r2][c] === num) {
          conflicts.push([r, c], [r2, c]);
        }
      }
      
      // Check 3x3 block
      const blockR = Math.floor(r / 3) * 3;
      const blockC = Math.floor(c / 3) * 3;
      for (let br = blockR; br < blockR + 3; br++) {
        for (let bc = blockC; bc < blockC + 3; bc++) {
          if ((br !== r || bc !== c) && board[br][bc] === num) {
            conflicts.push([r, c], [br, bc]);
          }
        }
      }
    }
  }
  
  return conflicts;
};

const checkSolution = () => {
  // Check if board is complete
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) return false;
    }
  }
  
  // Check if there are any conflicts
  const conflicts = checkConflicts();
  if (conflicts.length > 0) return false;
  
  // Check all rows contain 1-9
  for (let r = 0; r < 9; r++) {
    const rowSet = new Set();
    for (let c = 0; c < 9; c++) {
      rowSet.add(board[r][c]);
    }
    if (rowSet.size !== 9) return false;
    for (let n = 1; n <= 9; n++) {
      if (!rowSet.has(n)) return false;
    }
  }
  
  // Check all columns contain 1-9
  for (let c = 0; c < 9; c++) {
    const colSet = new Set();
    for (let r = 0; r < 9; r++) {
      colSet.add(board[r][c]);
    }
    if (colSet.size !== 9) return false;
    for (let n = 1; n <= 9; n++) {
      if (!colSet.has(n)) return false;
    }
  }
  
  // Check all 3x3 blocks contain 1-9
  for (let blockRow = 0; blockRow < 3; blockRow++) {
    for (let blockCol = 0; blockCol < 3; blockCol++) {
      const blockSet = new Set();
      const startR = blockRow * 3;
      const startC = blockCol * 3;
      for (let r = startR; r < startR + 3; r++) {
        for (let c = startC; c < startC + 3; c++) {
          blockSet.add(board[r][c]);
        }
      }
      if (blockSet.size !== 9) return false;
      for (let n = 1; n <= 9; n++) {
        if (!blockSet.has(n)) return false;
      }
    }
  }
  
  return true;
};

/* ====== EVENT HANDLERS ====== */
const handleCellClick = (row, col) => {
  selectedCell = { row, col };
  selectedNumber = null;  // Clear selected number when selecting a cell
  render();
};

const handleNumberInput = (num) => {
  if (!selectedCell) {
    // If no cell selected, enter number placement mode
    if (selectedNumber === num) {
      // Toggle off if clicking same number
      selectedNumber = null;
    } else {
      selectedNumber = num;
    }
    render();
    return;
  }
  
  if (eraserMode) {
    eraseCell(selectedCell.row, selectedCell.col);
  } else {
    placeNumber(selectedCell.row, selectedCell.col, num);
  }
};

const handleKeyPress = (e) => {
  // Don't handle keyboard events when focus is in input fields
  const activeElement = document.activeElement;
  if (activeElement && (
    activeElement.tagName === 'INPUT' || 
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.contentEditable === 'true'
  )) {
    return;
  }
  
  // Prevent default to stop page scrolling
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
    e.preventDefault();
  }
  
  const key = e.key.toLowerCase();
  
  // Escape key - clear all modes
  if (e.key === 'Escape') {
    selectedCell = null;
    selectedNumber = null;
    eraserMode = false;
    window.eraserMode = false;
    pencilMode = false;
    markerMode = false;
    document.body.classList.remove('marker-mode');
    
    const eraserBtn = $('#eraserBtn');
    const pencilBtn = $('#pencilBtn');
    const markerBtn = $('#markerBtn');
    if (eraserBtn) eraserBtn.classList.remove('active');
    if (pencilBtn) pencilBtn.classList.remove('active');
    if (markerBtn) markerBtn.classList.remove('active');
    
    render();
    return;
  }
  
  // Ctrl+Z or Cmd+Z for undo
  if ((e.ctrlKey || e.metaKey) && key === 'z') {
    e.preventDefault();
    performUndo();
    return;
  }
  
  // U for undo
  if (key === 'u') {
    performUndo();
    return;
  }
  
  // Toggle modes
  if (key === 'n') {
    pencilMode = !pencilMode;
    eraserMode = false;
    window.eraserMode = false;
    markerMode = false;
    document.body.classList.remove('marker-mode');
    const pencilBtn = $('#pencilBtn');
    const eraserBtn = $('#eraserBtn');
    const markerBtn = $('#markerBtn');
    if (pencilBtn) pencilBtn.classList.toggle('active', pencilMode);
    if (eraserBtn) eraserBtn.classList.remove('active');
    if (markerBtn) markerBtn.classList.remove('active');
    return;
  }
  
  if (key === 'm') {
    // Shift+M to clear all markers
    if (e.shiftKey) {
      if (markedCells.size > 0) {
        markedCells.clear();
        render();
      }
      return;
    }
    
    markerMode = !markerMode;
    eraserMode = false;
    window.eraserMode = false;
    pencilMode = false;
    document.body.classList.toggle('marker-mode', markerMode);
    const markerBtn = $('#markerBtn');
    const eraserBtn = $('#eraserBtn');
    const pencilBtn = $('#pencilBtn');
    if (markerBtn) markerBtn.classList.toggle('active', markerMode);
    if (eraserBtn) eraserBtn.classList.remove('active');
    if (pencilBtn) pencilBtn.classList.remove('active');
    return;
  }
  
  if (key === 'e') {
    eraserMode = !eraserMode;
    window.eraserMode = eraserMode;
    pencilMode = false;
    markerMode = false;
    document.body.classList.remove('marker-mode');
    const eraserBtn = $('#eraserBtn');
    const pencilBtn = $('#pencilBtn');
    const markerBtn = $('#markerBtn');
    if (eraserBtn) eraserBtn.classList.toggle('active', eraserMode);
    if (pencilBtn) pencilBtn.classList.remove('active');
    if (markerBtn) markerBtn.classList.remove('active');
    
    // If eraser mode is activated and we have a selected cell, erase it
    if (eraserMode && selectedCell) {
      eraseCell(selectedCell.row, selectedCell.col);
    }
    return;
  }
  
  // Number keys handling
  if (key >= '1' && key <= '9') {
    const num = parseInt(key);
    
    if (selectedCell) {
      // If a cell is selected, place the number
      placeNumber(selectedCell.row, selectedCell.col, num);
    } else {
      // If no cell is selected, enter number placement mode
      if (selectedNumber === num) {
        // Toggle off if same number
        selectedNumber = null;
      } else {
        selectedNumber = num;
      }
      render();
    }
    return;
  }
  
  // Erase key (0)
  if (key === '0') {
    if (selectedCell) {
      eraseCell(selectedCell.row, selectedCell.col);
    } else if (selectedNumber) {
      selectedNumber = null;
      render();
    }
    return;
  }
  
  // Delete/Backspace
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    if (selectedCell) {
      eraseCell(selectedCell.row, selectedCell.col);
    } else if (selectedNumber) {
      selectedNumber = null;
      render();
    }
    return;
  }
  
  // Arrow keys and WASD navigation
  const navKey = e.key.startsWith('Arrow') ? e.key : key;
  const isNavKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(navKey);
  
  if (isNavKey) {
    // If no cell selected, start from top-left
    if (!selectedCell) {
      selectedCell = { row: 0, col: 0 };
      selectedNumber = null;  // Clear selected number when starting navigation
      render();
      return;
    }
    
    // Navigate with periodic boundary conditions
    const { row, col } = selectedCell;
    let newRow = row, newCol = col;
    
    switch (navKey) {
      case 'ArrowUp':
      case 'w':
        newRow = row - 1;
        if (newRow < 0) newRow = 8;  // Wrap to bottom
        break;
      case 'ArrowDown':
      case 's':
        newRow = row + 1;
        if (newRow > 8) newRow = 0;  // Wrap to top
        break;
      case 'ArrowLeft':
      case 'a':
        newCol = col - 1;
        if (newCol < 0) newCol = 8;  // Wrap to right
        break;
      case 'ArrowRight':
      case 'd':
        newCol = col + 1;
        if (newCol > 8) newCol = 0;  // Wrap to left
        break;
    }
    
    selectedCell = { row: newRow, col: newCol };
    render();
  }
};

const setupEventHandlers = () => {
  // Keyboard input
  document.addEventListener('keydown', handleKeyPress);
  
  // Number pad clicks
  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.onclick = () => {
      const num = parseInt(btn.dataset.num);
      handleNumberInput(num);
    };
  });
  
  // Tool buttons
  const pencilBtn = $('#pencilBtn');
  if (pencilBtn) {
    pencilBtn.onclick = (e) => {
      e.stopPropagation();
      pencilMode = !pencilMode;
      eraserMode = false;
      window.eraserMode = false;
      markerMode = false;
      document.body.classList.remove('marker-mode');
      pencilBtn.classList.toggle('active', pencilMode);
      const eraserBtn = $('#eraserBtn');
      const markerBtn = $('#markerBtn');
      if (eraserBtn) eraserBtn.classList.remove('active');
      if (markerBtn) markerBtn.classList.remove('active');
    };
  }
  
  const markerBtn = $('#markerBtn');
  if (markerBtn) {
    markerBtn.onclick = (e) => {
      e.stopPropagation();
      markerMode = !markerMode;
      eraserMode = false;
      window.eraserMode = false;
      pencilMode = false;
      markerBtn.classList.toggle('active', markerMode);
      document.body.classList.toggle('marker-mode', markerMode);
      const eraserBtn = $('#eraserBtn');
      const pencilBtn = $('#pencilBtn');
      if (eraserBtn) eraserBtn.classList.remove('active');
      if (pencilBtn) pencilBtn.classList.remove('active');
    };
    
    // Double-click to clear all markers
    markerBtn.ondblclick = (e) => {
      e.stopPropagation();
      if (markedCells.size > 0) {
        markedCells.clear();
        render();
      }
    };
  }
  
  const eraserBtn = $('#eraserBtn');
  if (eraserBtn) {
    eraserBtn.onclick = (e) => {
      e.stopPropagation();
      eraserMode = !eraserMode;
      window.eraserMode = eraserMode;
      pencilMode = false;
      markerMode = false;
      document.body.classList.remove('marker-mode');
      eraserBtn.classList.toggle('active', eraserMode);
      const pencilBtn = $('#pencilBtn');
      const markerBtn = $('#markerBtn');
      if (pencilBtn) pencilBtn.classList.remove('active');
      if (markerBtn) markerBtn.classList.remove('active');
      
      // If eraser mode is activated and we have a selected cell, erase it
      if (eraserMode && selectedCell) {
        eraseCell(selectedCell.row, selectedCell.col);
      }
    };
  }
  
  // Undo button
  const undoBtn = $('#undoBtn');
  if (undoBtn) {
    undoBtn.onclick = (e) => {
      e.stopPropagation();
      performUndo();
    };
  }
  
  // Click outside board to deselect
  document.addEventListener('click', (e) => {
    // Close panel if clicking outside
    const panel = $('#panel');
    const menuBtn = $('#menuBtn');
    if (panel && menuBtn && panel.classList.contains('open')) {
      if (!e.target.closest('#panel') && !e.target.closest('#menuBtn')) {
        panel.classList.remove('open');
        menuBtn.classList.remove('active');
      }
    }
    
    // Deselect cell/number and clear markers if clicking outside relevant areas
    if (!e.target.closest('#board') && 
        !e.target.closest('.num-btn') && 
        !e.target.closest('.tool-btn')) {
      selectedCell = null;
      selectedNumber = null;
      // Clear marked cells when clicking outside
      if (markedCells.size > 0) {
        markedCells.clear();
      }
      if (typeof render === 'function') render();
    }
  });
};

/* ====== INITIALIZATION ====== */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure all required scripts are loaded
  if (typeof puzzle_list === 'undefined') {
    console.error('puzzle_list.js not loaded');
    return;
  }
  
  // Initialize common UI
  initCommonUI();
  
  // Initialize copy button
  initCopyButton(() => encodeInitial());
  
  // Setup game-specific handlers
  setupEventHandlers();
  
  // Global mouse handlers for marker dragging (desktop only)
  document.addEventListener('mouseup', () => {
    if (isDraggingMarker) {
      isDraggingMarker = false;
      needsRender = false;
      setTimeout(() => { dragStarted = false; }, 50); // Small delay to prevent click
    }
  });
  
  // New game button
  const newBtn = $('#newBtn');
  if (newBtn) {
    newBtn.onclick = handleNewGameClick;
  }
  
  // Load code button
  const loadCodeBtn = $('#loadCodeBtn');
  if (loadCodeBtn) {
    loadCodeBtn.onclick = () => {
      const codeInput = $('#codeInput');
      if (codeInput) {
        const code = codeInput.value.trim();
        if (!loadFromCode(code)) {
          alert('Invalid code');
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
  
  // Highlight related cells toggle
  const relatedToggle = $('#highlightRelatedCells');
  if (relatedToggle) {
    relatedToggle.checked = highlightRelatedCells;
    relatedToggle.onchange = () => {
      highlightRelatedCells = relatedToggle.checked;
      render();
      saveGame();
    };
  }
  
  // Highlight pencil marks toggle
  const highlightToggle = $('#highlightPencilMarks');
  if (highlightToggle) {
    highlightToggle.checked = highlightPencilMarks;
    highlightToggle.onchange = () => {
      highlightPencilMarks = highlightToggle.checked;
      render();
      saveGame();
    };
  }
  
  // Highlight affected areas toggle
  const affectedToggle = $('#highlightAffectedAreas');
  if (affectedToggle) {
    affectedToggle.checked = highlightAffectedAreas;
    affectedToggle.onchange = () => {
      highlightAffectedAreas = affectedToggle.checked;
      render();
      saveGame();
    };
  }
  
  // Highlight bi-values toggle
  const biValuesToggle = $('#highlightBiValues');
  if (biValuesToggle) {
    biValuesToggle.checked = showBiValue;
    biValuesToggle.onchange = () => {
      showBiValue = biValuesToggle.checked;
      render();
      saveGame();
    };
  }
  
  // Prefill notes toggle
  const prefillToggle = $('#prefillNotes');
  if (prefillToggle) {
    prefillToggle.checked = prefillNotes;
    prefillToggle.onchange = () => {
      prefillNotes = prefillToggle.checked;
      saveGame();
    };
  }
  
  // Auto clear notes toggle
  const autoClearToggle = $('#autoClearNotes');
  if (autoClearToggle) {
    autoClearToggle.checked = autoClearNotes;
    autoClearToggle.onchange = () => {
      autoClearNotes = autoClearToggle.checked;
      // If turning on, immediately clear invalid notes
      if (autoClearNotes) {
        clearInvalidNotes();
        render();
      }
      saveGame();
    };
  }
  
  // Multicolor brush toggle
  const multicolorToggle = $('#multicolorBrush');
  if (multicolorToggle) {
    multicolorToggle.checked = multicolorBrush;
    multicolorToggle.onchange = () => {
      multicolorBrush = multicolorToggle.checked;
      // If turning off multicolor, convert all color 2 markers to color 1
      if (!multicolorBrush) {
        markedCells.forEach((color, key) => {
          if (color === 2) {
            markedCells.set(key, 1);
          }
        });
        render();
      }
      saveGame();
    };
  }
  
  // Window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => render(), 100);
  });
  
  // Load saved game or create new
  try {
    if (!loadSavedGame()) {
      console.log('No saved game found, starting new game');
      newGame();
    } else {
      console.log('Loaded saved game');
      window.eraserMode = eraserMode;
      setTimeout(() => updateCodeInput(), 0);
    }
  } catch (e) {
    console.error('Error loading game:', e);
    newGame();
  }
  
  // Ensure render is called after initialization
  setTimeout(() => {
    if (typeof render === 'function') render();
  }, 10);
  
  // Auto-save on page unload
  window.addEventListener('beforeunload', () => saveGame());
});

// Make functions globally accessible
window.updatePuzzleNumber = updatePuzzleNumber;
window.updateUndoButton = updateUndoButton;
window.checkSolution = checkSolution;
window.checkConflicts = checkConflicts;
window.handleCellClick = handleCellClick;
window.handleNumberInput = handleNumberInput;
window.eraseCell = eraseCell;
window.newGame = newGame;
window.placeNumber = placeNumber;
window.initState = initState;
window.performUndo = performUndo;
window.saveSnapshot = saveSnapshot;
window.prefillAllNotes = prefillAllNotes;
window.clearInvalidNotes = clearInvalidNotes;