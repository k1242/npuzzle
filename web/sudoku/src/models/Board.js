// Board.js - Model for the sudoku board
import { Cell } from './Cell.js';

export class Board {
  constructor() {
    this.cells = [];
    this.size = 9;
    
    // Initialize empty board
    for (let row = 0; row < this.size; row++) {
      this.cells[row] = [];
      for (let col = 0; col < this.size; col++) {
        this.cells[row][col] = new Cell(row, col);
      }
    }
  }

  // Get cell at position
  getCell(row, col) {
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
      return null;
    }
    return this.cells[row][col];
  }

  // Get all cells
  getAllCells() {
    const cells = [];
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        cells.push(this.cells[row][col]);
      }
    }
    return cells;
  }

  // Get cells in the same row
  getRowCells(row) {
    return this.cells[row].slice();
  }

  // Get cells in the same column
  getColumnCells(col) {
    const cells = [];
    for (let row = 0; row < this.size; row++) {
      cells.push(this.cells[row][col]);
    }
    return cells;
  }

  // Get cells in the same 3x3 block
  getBlockCells(blockIndex) {
    const cells = [];
    const startRow = Math.floor(blockIndex / 3) * 3;
    const startCol = (blockIndex % 3) * 3;
    
    for (let r = startRow; r < startRow + 3; r++) {
      for (let c = startCol; c < startCol + 3; c++) {
        cells.push(this.cells[r][c]);
      }
    }
    return cells;
  }

  // Get all related cells (same row, column, and block)
  getRelatedCells(row, col) {
    const cell = this.getCell(row, col);
    if (!cell) return [];
    
    const related = new Set();
    
    // Add row cells
    this.getRowCells(row).forEach(c => {
      if (c.col !== col) related.add(c);
    });
    
    // Add column cells
    this.getColumnCells(col).forEach(c => {
      if (c.row !== row) related.add(c);
    });
    
    // Add block cells
    this.getBlockCells(cell.blockIndex).forEach(c => {
      if (c.row !== row || c.col !== col) related.add(c);
    });
    
    return Array.from(related);
  }

  // Set cell value
  setCellValue(row, col, value) {
    const cell = this.getCell(row, col);
    if (!cell) return false;
    
    const success = cell.setValue(value);
    if (success) {
      this.updateConflicts();
    }
    return success;
  }

  // Clear cell
  clearCell(row, col) {
    const cell = this.getCell(row, col);
    if (!cell) return false;
    
    const success = cell.clear();
    if (success) {
      this.updateConflicts();
    }
    return success;
  }

  // Toggle pencil mark
  togglePencilMark(row, col, num) {
    const cell = this.getCell(row, col);
    if (!cell) return false;
    
    return cell.togglePencilMark(num);
  }

  // Update conflicts for all cells
  updateConflicts() {
    // Clear all conflicts
    this.getAllCells().forEach(cell => cell.clearConflicts());
    
    // Check each cell
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const cell = this.cells[row][col];
        if (cell.value === 0) continue;
        
        // Check related cells
        const related = this.getRelatedCells(row, col);
        related.forEach(relatedCell => {
          if (relatedCell.value === cell.value) {
            cell.addConflict(relatedCell.id);
            relatedCell.addConflict(cell.id);
          }
        });
      }
    }
  }

  // Check if board is complete and valid
  isSolved() {
    // Check if all cells are filled
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.cells[row][col].value === 0) return false;
        if (this.cells[row][col].hasConflicts()) return false;
      }
    }
    
    // Validate rows, columns, and blocks
    for (let i = 0; i < this.size; i++) {
      if (!this.isValidSet(this.getRowCells(i))) return false;
      if (!this.isValidSet(this.getColumnCells(i))) return false;
      if (!this.isValidSet(this.getBlockCells(i))) return false;
    }
    
    return true;
  }

  // Check if a set of cells contains all numbers 1-9
  isValidSet(cells) {
    const values = new Set();
    for (const cell of cells) {
      if (cell.value === 0) return false;
      values.add(cell.value);
    }
    return values.size === 9;
  }

  // Clear invalid pencil marks based on current board state
  clearInvalidPencilMarks() {
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const cell = this.cells[row][col];
        if (cell.value !== 0) continue;
        
        // Get all values in related cells
        const relatedValues = new Set();
        this.getRelatedCells(row, col).forEach(relatedCell => {
          if (relatedCell.value !== 0) {
            relatedValues.add(relatedCell.value);
          }
        });
        
        // Remove invalid pencil marks
        relatedValues.forEach(value => {
          cell.pencilMarks.delete(value);
        });
      }
    }
  }

  // Prefill all empty cells with pencil marks 1-9
  prefillPencilMarks() {
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const cell = this.cells[row][col];
        if (cell.value === 0) {
          for (let num = 1; num <= 9; num++) {
            cell.pencilMarks.add(num);
          }
        }
      }
    }
  }

  // Count empty cells
  countEmptyCells() {
    let count = 0;
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.cells[row][col].value === 0) count++;
      }
    }
    return count;
  }

  // Clone the board
  clone() {
    const newBoard = new Board();
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        newBoard.cells[row][col] = this.cells[row][col].clone();
      }
    }
    return newBoard;
  }

  // Load from puzzle string (81 characters)
  loadFromString(puzzleString) {
    if (puzzleString.length !== 81) return false;
    
    for (let i = 0; i < 81; i++) {
      const row = Math.floor(i / 9);
      const col = i % 9;
      const value = parseInt(puzzleString[i]) || 0;
      
      this.cells[row][col] = new Cell(row, col, value, value !== 0);
    }
    
    this.updateConflicts();
    return true;
  }

  // Export to puzzle string
  toString() {
    let str = '';
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        str += this.cells[row][col].value;
      }
    }
    return str;
  }

  // Serialize for storage
  toJSON() {
    const data = [];
    for (let row = 0; row < this.size; row++) {
      data[row] = [];
      for (let col = 0; col < this.size; col++) {
        data[row][col] = this.cells[row][col].toJSON();
      }
    }
    return data;
  }

  // Deserialize from storage
  static fromJSON(data) {
    const board = new Board();
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        board.cells[row][col] = Cell.fromJSON(row, col, data[row][col]);
      }
    }
    board.updateConflicts();
    return board;
  }
}