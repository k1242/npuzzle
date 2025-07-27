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

const loadFromCode = (code, isFromMultiplayer = false) => {
  // Check if code is a puzzle number reference like "#15" or with difficulty "MS#15"
  if (code.includes('#')) {
    const match = code.match(/^(?:([EMHDI][SML]))?#(\d+)$/);
    if (match) {
      const diffCode = match[1];
      const puzzleNum = parseInt(match[2]);
      
      // If difficulty code provided, parse it
      if (diffCode) {
        const diffLetter = diffCode[0];
        const durationLetter = diffCode[1];
        
        const diffIndex = ['E', 'M', 'H', 'D', 'I'].indexOf(diffLetter);
        const durationIndex = ['S', 'M', 'L'].indexOf(durationLetter);
        
        if (diffIndex >= 0 && durationIndex >= 0) {
          currentDifficulty = diffIndex;
          currentDepth = durationIndex;
          if (window.updateDifficultyDisplay) {
            window.updateDifficultyDisplay();
          }
          // Update sliders
          const difficultySlider = $('#difficultySlider');
          const depthSlider = $('#depthSlider');
          if (difficultySlider) difficultySlider.value = currentDifficulty;
          if (depthSlider) depthSlider.value = currentDepth;
        }
      }
      
      // Calculate actual index based on current difficulty
      const range = window.getPuzzleRange ? window.getPuzzleRange() : { start: 0 };
      const actualIndex = range.start + puzzleNum - 1;
      
      if (!isNaN(puzzleNum) && puzzleNum >= 1 && puzzleNum <= 1000 && actualIndex < puzzle_list.length) {
        const puzzleCode = puzzle_list[actualIndex];
        currentPuzzleIndex = actualIndex;
        return loadFromCode(puzzleCode, isFromMultiplayer);
      } else {
        return false;
      }
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
  const puzzleIndex = typeof puzzle_list !== 'undefined' ? puzzle_list.indexOf(code) : -1;
  
  // Only set currentPuzzleIndex if the code is from our puzzle list
  if (puzzleIndex >= 0) {
    currentPuzzleIndex = puzzleIndex;
    
    // Try to determine difficulty/depth from index
    const categoryIndex = Math.floor(puzzleIndex / 1000);
    if (categoryIndex < 15) {
      currentDifficulty = Math.floor(categoryIndex / 3);
      currentDepth = categoryIndex % 3;
      if (window.updateDifficultyDisplay) {
        window.updateDifficultyDisplay();
      }
    }
  } else {
    // If loading a custom code, clear the puzzle index
    currentPuzzleIndex = -1;
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
  
  // Send load code update to multiplayer room if not already from multiplayer
  if (!isFromMultiplayer && window.isInMultiplayerRoom && window.isInMultiplayerRoom()) {
    window.sendUpdate('load-code', {
      code: code,
      board: board,
      initialBoard: initialBoard,
      fixed: fixed,
      currentPuzzleIndex: currentPuzzleIndex,
      pencilMarks: pencilMarks.map(row => row.map(set => Array.from(set)))
    });
  }
  
  return true;
};

// Make functions globally accessible
window.encodeInitial = encodeInitial;
window.encode = encode;
window.updateCodeInput = updateCodeInput;
window.decode = decode;
window.loadFromCode = loadFromCode;