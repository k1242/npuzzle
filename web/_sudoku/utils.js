/* ====== UTILITY FUNCTIONS ====== */

// DOM helper
const $ = sel => document.querySelector(sel);

// Get block index (0-8) for a cell
const getBlockIndex = (row, col) => {
  return Math.floor(row / 3) * 3 + Math.floor(col / 3);
};

// Get all cells in the same row
const getRowCells = (row) => {
  const cells = [];
  for (let c = 0; c < 9; c++) {
    cells.push({ row, col: c });
  }
  return cells;
};

// Get all cells in the same column
const getColCells = (col) => {
  const cells = [];
  for (let r = 0; r < 9; r++) {
    cells.push({ row: r, col });
  }
  return cells;
};

// Get all cells in the same 3x3 block
const getBlockCells = (row, col) => {
  const cells = [];
  const blockR = Math.floor(row / 3) * 3;
  const blockC = Math.floor(col / 3) * 3;
  
  for (let r = blockR; r < blockR + 3; r++) {
    for (let c = blockC; c < blockC + 3; c++) {
      cells.push({ row: r, col: c });
    }
  }
  return cells;
};

// Get all related cells (row, col, block)
const getRelatedCells = (row, col) => {
  const cells = new Set();
  
  // Add row cells
  for (let c = 0; c < 9; c++) {
    cells.add(`${row},${c}`);
  }
  
  // Add column cells
  for (let r = 0; r < 9; r++) {
    cells.add(`${r},${col}`);
  }
  
  // Add block cells
  const blockR = Math.floor(row / 3) * 3;
  const blockC = Math.floor(col / 3) * 3;
  for (let r = blockR; r < blockR + 3; r++) {
    for (let c = blockC; c < blockC + 3; c++) {
      cells.add(`${r},${c}`);
    }
  }
  
  // Remove self
  cells.delete(`${row},${col}`);
  
  // Convert back to array of objects
  return Array.from(cells).map(key => {
    const [r, c] = key.split(',').map(Number);
    return { row: r, col: c };
  });
};

// Check if placing a number would create a conflict
const wouldConflict = (board, row, col, num) => {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c] === num) return true;
  }
  
  // Check column
  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col] === num) return true;
  }
  
  // Check block
  const blockR = Math.floor(row / 3) * 3;
  const blockC = Math.floor(col / 3) * 3;
  for (let r = blockR; r < blockR + 3; r++) {
    for (let c = blockC; c < blockC + 3; c++) {
      if ((r !== row || c !== col) && board[r][c] === num) {
        return true;
      }
    }
  }
  
  return false;
};

// Count remaining empty cells
const countEmptyCells = (board) => {
  let count = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) count++;
    }
  }
  return count;
};

// Make functions globally accessible
window.getBlockIndex = getBlockIndex;
window.getRowCells = getRowCells;
window.getColCells = getColCells;
window.getBlockCells = getBlockCells;
window.getRelatedCells = getRelatedCells;
window.wouldConflict = wouldConflict;
window.countEmptyCells = countEmptyCells;