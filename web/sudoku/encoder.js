/* ====== ENCODE / DECODE ====== */

// Encode the initial board state (for puzzle code)
const encodeInitial = () => {
  if (!initialBoard || !initialBoard.length || !initialBoard[0]) {
    console.warn('initialBoard is not properly initialized');
    return '';
  }
  
  let code = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      code += initialBoard[r][c];
    }
  }
  
  return code;
};

// Encode current board state (for saving)
const encode = () => {
  let code = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      code += board[r][c];
    }
  }
  return code;
};

// Update code input to show initial board state
const updateCodeInput = () => {
  const codeInput = $('#codeInput');
  if (codeInput) {
    codeInput.value = encodeInitial();
  }
};

const decode = (code) => {
  // Validate code format - should be 81 digits
  if (!/^[0-9]{81}$/.test(code)) return null;
  
  // Parse into board array
  const newBoard = [];
  const newFixed = [];
  const newPencilMarks = [];
  const newInitialBoard = [];
  
  for (let r = 0; r < 9; r++) {
    newBoard[r] = [];
    newFixed[r] = [];
    newPencilMarks[r] = [];
    newInitialBoard[r] = [];
    
    for (let c = 0; c < 9; c++) {
      const idx = r * 9 + c;
      const val = parseInt(code[idx]);
      newBoard[r][c] = val;
      newFixed[r][c] = val !== 0;
      newPencilMarks[r][c] = new Set();
      newInitialBoard[r][c] = val;
    }
  }
  
  return {
    board: newBoard,
    fixed: newFixed,
    pencilMarks: newPencilMarks,
    initialBoard: newInitialBoard
  };
};

const loadFromCode = (code) => {
  // Check if code is a puzzle number reference like "#15"
  if (code.startsWith('#')) {
    const puzzleNum = parseInt(code.substring(1));
    if (!isNaN(puzzleNum) && puzzleNum >= 1 && puzzleNum <= puzzle_list.length) {
      const puzzleCode = puzzle_list[puzzleNum - 1];
      currentPuzzleIndex = puzzleNum - 1;
      return loadFromCode(puzzleCode);
    } else {
      return false;
    }
  }
  
  const decoded = decode(code);
  if (!decoded) return false;
  
  // Apply decoded state
  board = decoded.board;
  fixed = decoded.fixed;
  pencilMarks = decoded.pencilMarks;
  initialBoard = decoded.initialBoard;
  window.initialBoard = initialBoard;
  
  // Apply prefill if enabled
  if (prefillNotes) {
    prefillAllNotes();
  }
  
  // Check if this code exists in puzzle_list
  if (currentPuzzleIndex === -1) {
    currentPuzzleIndex = typeof puzzle_list !== 'undefined' ? puzzle_list.indexOf(code) : -1;
  }
  updatePuzzleNumber();
  
  // For solution, copy the current board state
  solution = board.map(row => [...row]);
  
  // Clear undo history
  undoHistory = [];
  updateUndoButton();
  
  solved = false;
  selectedCell = null;
  
  CorrectNotification.hide();
  updateCodeInput();
  
  setTimeout(() => render(), 0);
  
  return true;
};

// Make functions globally accessible
window.encodeInitial = encodeInitial;
window.encode = encode;
window.updateCodeInput = updateCodeInput;
window.decode = decode;
window.loadFromCode = loadFromCode;