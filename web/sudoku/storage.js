/* ====== STORAGE FUNCTIONS ====== */

const STORAGE_KEY = 'sudokuState';

const saveGame = () => {
  // Ensure variables exist
  if (!board || !solution || !fixed || !pencilMarks) {
    console.warn('Game state not initialized');
    return;
  }
  
  const snapshot = {
    board: board.map(row => [...row]),
    solution: solution.map(row => [...row]),
    fixed: fixed.map(row => [...row]),
    pencilMarks: pencilMarks.map(row => 
      row.map(set => Array.from(set))
    ),
    markedCells: Array.from(markedCells.entries()), // Save as array of [key, value] pairs
    initialBoard: initialBoard && initialBoard.length ? initialBoard.map(row => [...row]) : board.map(row => [...row]),
    solved,
    pencilMode,
    eraserMode,
    markerMode,
    currentPuzzleIndex,
    highlightPencilMarks,
    highlightAffectedAreas,
    highlightRelatedCells,
    showBiValue,
    prefillNotes,
    autoClearNotes,
    multicolorBrush,
    gameModified,
    undoHistory: (undoHistory || []).map(snap => ({
      board: snap.board,
      pencilMarks: snap.pencilMarks.map(row => 
        row.map(set => Array.from(set))
      ),
      markedCells: snap.markedCells ? Array.from(snap.markedCells.entries()) : []
    }))
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
};

const loadSavedGame = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;
    
    const data = JSON.parse(saved);
    
    // Validate saved data structure
    if (!data.board || !data.solution || !data.fixed || 
        !Array.isArray(data.board) || data.board.length !== 9) {
      return false;
    }
    
    // Apply saved state
    board = data.board;
    solution = data.solution;
    fixed = data.fixed || [];
    
    // Restore pencil marks (convert arrays back to Sets)
    pencilMarks = data.pencilMarks.map(row =>
      row.map(arr => new Set(arr))
    );
    
    // Restore marked cells (convert array back to Map)
    if (data.markedCells) {
      markedCells = new Map(data.markedCells);
    } else {
      markedCells = new Map();
    }
    
    // Restore initial board
    initialBoard = data.initialBoard || board.map(row => [...row]);
    window.initialBoard = initialBoard;
    
    // If fixed array is missing or empty, recreate it from initialBoard
    if (!data.fixed || !data.fixed.length) {
      fixed = [];
      for (let r = 0; r < 9; r++) {
        fixed[r] = [];
        for (let c = 0; c < 9; c++) {
          fixed[r][c] = initialBoard[r][c] !== 0;
        }
      }
    }
    
    // Restore undo history
    if (data.undoHistory) {
      undoHistory = data.undoHistory.map(snap => ({
        board: snap.board,
        pencilMarks: snap.pencilMarks.map(row =>
          row.map(arr => new Set(arr))
        ),
        markedCells: snap.markedCells ? new Map(snap.markedCells) : new Map()
      }));
    } else {
      undoHistory = [];
    }
    
    solved = data.solved || false;
    pencilMode = data.pencilMode || false;
    eraserMode = data.eraserMode || false;
    markerMode = data.markerMode || false;
    window.eraserMode = eraserMode;
    currentPuzzleIndex = data.currentPuzzleIndex !== undefined ? data.currentPuzzleIndex : -1;
    highlightPencilMarks = data.highlightPencilMarks !== undefined ? data.highlightPencilMarks : true;
    highlightAffectedAreas = data.highlightAffectedAreas !== undefined ? data.highlightAffectedAreas : false;
    highlightRelatedCells = data.highlightRelatedCells !== undefined ? data.highlightRelatedCells : true;
    showBiValue = data.showBiValue || false;
    prefillNotes = data.prefillNotes || false;
    autoClearNotes = data.autoClearNotes || false;
    multicolorBrush = data.multicolorBrush || false;
    gameModified = data.gameModified || false;
    confirmingNewGame = false; // Always reset confirmation state on load
    isDraggingMarker = false; // Reset drag state
    dragStarted = false;
    needsRender = false;
    
    // Update UI elements
    const pencilBtn = $('#pencilBtn');
    const eraserBtn = $('#eraserBtn');
    const markerBtn = $('#markerBtn');
    const highlightToggle = $('#highlightPencilMarks');
    const affectedToggle = $('#highlightAffectedAreas');
    const relatedToggle = $('#highlightRelatedCells');
    const biValuesToggle = $('#highlightBiValues');
    const prefillToggle = $('#prefillNotes');
    const autoClearToggle = $('#autoClearNotes');
    const multicolorToggle = $('#multicolorBrush');
    
    if (pencilBtn) pencilBtn.classList.toggle('active', pencilMode);
    if (eraserBtn) eraserBtn.classList.toggle('active', eraserMode);
    if (markerBtn) markerBtn.classList.toggle('active', markerMode);
    document.body.classList.toggle('marker-mode', markerMode);
    if (highlightToggle) highlightToggle.checked = highlightPencilMarks;
    if (affectedToggle) affectedToggle.checked = highlightAffectedAreas;
    if (relatedToggle) relatedToggle.checked = highlightRelatedCells;
    if (biValuesToggle) biValuesToggle.checked = showBiValue;
    if (prefillToggle) prefillToggle.checked = prefillNotes;
    if (autoClearToggle) autoClearToggle.checked = autoClearNotes;
    if (multicolorToggle) multicolorToggle.checked = multicolorBrush;
    
    updatePuzzleNumber();
    updateUndoButton();
    CorrectNotification.hide();
    
    // Render the loaded state
    setTimeout(() => {
      if (typeof render === 'function') render();
    }, 0);
    
    return true;
  } catch (e) {
    console.warn('Failed to load saved game:', e);
    return false;
  }
};

const clearSavedGame = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear saved game:', e);
  }
};

// Make storage functions globally accessible
window.saveGame = saveGame;
window.loadSavedGame = loadSavedGame;
window.clearSavedGame = clearSavedGame;