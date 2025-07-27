// Validate complete game state
function validateGameState(gameState) {
  if (!gameState || typeof gameState !== 'object') {
    return false;
  }
  
  // Required fields
  const required = ['board', 'pencilMarks', 'initialBoard'];
  for (const field of required) {
    if (!(field in gameState)) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }
  
  // Validate board
  if (!validateBoard(gameState.board)) {
    return false;
  }
  
  // Validate initial board
  if (!validateBoard(gameState.initialBoard)) {
    return false;
  }
  
  // Validate pencil marks
  if (!validatePencilMarks(gameState.pencilMarks)) {
    return false;
  }
  
  // Validate marked cells if present
  if (gameState.markedCells && !Array.isArray(gameState.markedCells)) {
    return false;
  }
  
  return true;
}

// Validate board structure
function validateBoard(board) {
  if (!Array.isArray(board) || board.length !== 9) {
    return false;
  }
  
  for (const row of board) {
    if (!Array.isArray(row) || row.length !== 9) {
      return false;
    }
    
    for (const cell of row) {
      if (typeof cell !== 'number' || cell < 0 || cell > 9) {
        return false;
      }
    }
  }
  
  return true;
}

// Validate pencil marks structure
function validatePencilMarks(pencilMarks) {
  if (!Array.isArray(pencilMarks) || pencilMarks.length !== 9) {
    return false;
  }
  
  for (const row of pencilMarks) {
    if (!Array.isArray(row) || row.length !== 9) {
      return false;
    }
    
    for (const marks of row) {
      if (!Array.isArray(marks)) {
        return false;
      }
      
      // Check all marks are valid numbers
      for (const mark of marks) {
        if (typeof mark !== 'number' || mark < 1 || mark > 9) {
          return false;
        }
      }
    }
  }
  
  return true;
}

// Validate update message
function validateUpdate(update) {
  if (!update || typeof update !== 'object') {
    return false;
  }
  
  if (!update.type || !update.data) {
    return false;
  }
  
  const { type, data } = update;
  
  switch (type) {
    case 'board':
      return validateBoard(data.board);
      
    case 'cell':
      return validateCellUpdate(data);
      
    case 'pencilMarks':
      return validatePencilMarks(data.pencilMarks);
      
    case 'pencilMark':
      return validatePencilMarkUpdate(data);
      
    case 'markedCells':
      return Array.isArray(data.markedCells);
      
    case 'undo':
      return data.board && data.pencilMarks && 
             validateBoard(data.board) && 
             validatePencilMarks(data.pencilMarks);
      
    case 'undoHistory':
      return Array.isArray(data.undoHistory);
      
    case 'settings':
      return typeof data === 'object';
      
    case 'new-game':
      return validateNewGameUpdate(data);
      
    case 'load-code':
      return validateLoadCodeUpdate(data);
      
    default:
      return false;
  }
}

// Validate single cell update
function validateCellUpdate(data) {
  const { row, col, value } = data;
  
  if (typeof row !== 'number' || row < 0 || row > 8) {
    return false;
  }
  
  if (typeof col !== 'number' || col < 0 || col > 8) {
    return false;
  }
  
  if (typeof value !== 'number' || value < 0 || value > 9) {
    return false;
  }
  
  return true;
}

// Validate pencil mark update
function validatePencilMarkUpdate(data) {
  const { row, col, marks } = data;
  
  if (typeof row !== 'number' || row < 0 || row > 8) {
    return false;
  }
  
  if (typeof col !== 'number' || col < 0 || col > 8) {
    return false;
  }
  
  if (!Array.isArray(marks)) {
    return false;
  }
  
  for (const mark of marks) {
    if (typeof mark !== 'number' || mark < 1 || mark > 9) {
      return false;
    }
  }
  
  return true;
}

// Validate new game update
function validateNewGameUpdate(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // Required fields for new game
  const required = ['board', 'initialBoard', 'fixed', 'currentPuzzleIndex'];
  for (const field of required) {
    if (!(field in data)) {
      console.error(`Missing required field for new-game: ${field}`);
      return false;
    }
  }
  
  // Validate boards
  if (!validateBoard(data.board) || !validateBoard(data.initialBoard)) {
    return false;
  }
  
  // Validate fixed array
  if (!Array.isArray(data.fixed) || data.fixed.length !== 9) {
    return false;
  }
  
  for (const row of data.fixed) {
    if (!Array.isArray(row) || row.length !== 9) {
      return false;
    }
    for (const cell of row) {
      if (typeof cell !== 'boolean') {
        return false;
      }
    }
  }
  
  // Validate puzzle index
  if (typeof data.currentPuzzleIndex !== 'number') {
    return false;
  }
  
  return true;
}

// Validate load code update
function validateLoadCodeUpdate(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // Required fields for load code
  const required = ['board', 'initialBoard', 'fixed', 'code'];
  for (const field of required) {
    if (!(field in data)) {
      console.error(`Missing required field for load-code: ${field}`);
      return false;
    }
  }
  
  // Validate boards
  if (!validateBoard(data.board) || !validateBoard(data.initialBoard)) {
    return false;
  }
  
  // Validate fixed array
  if (!Array.isArray(data.fixed) || data.fixed.length !== 9) {
    return false;
  }
  
  for (const row of data.fixed) {
    if (!Array.isArray(row) || row.length !== 9) {
      return false;
    }
    for (const cell of row) {
      if (typeof cell !== 'boolean') {
        return false;
      }
    }
  }
  
  // Validate code
  if (typeof data.code !== 'string' || !/^[0-9]{81}$/.test(data.code)) {
    return false;
  }
  
  return true;
}

module.exports = {
  validateGameState,
  validateUpdate
};