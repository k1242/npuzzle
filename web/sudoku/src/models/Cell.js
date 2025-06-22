// Cell.js - Model for a single sudoku cell
export class Cell {
  constructor(row, col, value = 0, isFixed = false) {
    this.row = row;
    this.col = col;
    this.value = value;
    this.isFixed = isFixed;
    this.pencilMarks = new Set();
    this.isMarked = false;
    this.conflicts = new Set(); // Set of conflicting cells
  }

  // Get the 3x3 block index (0-8)
  get blockIndex() {
    return Math.floor(this.row / 3) * 3 + Math.floor(this.col / 3);
  }

  // Get unique cell identifier
  get id() {
    return `${this.row},${this.col}`;
  }

  // Set cell value
  setValue(value) {
    if (this.isFixed) return false;
    
    this.value = value;
    if (value !== 0) {
      this.pencilMarks.clear();
    }
    return true;
  }

  // Toggle pencil mark
  togglePencilMark(num) {
    if (this.isFixed || this.value !== 0) return false;
    
    if (this.pencilMarks.has(num)) {
      this.pencilMarks.delete(num);
    } else {
      this.pencilMarks.add(num);
    }
    return true;
  }

  // Clear cell
  clear() {
    if (this.isFixed) return false;
    
    this.value = 0;
    this.pencilMarks.clear();
    return true;
  }

  // Toggle marker
  toggleMarker() {
    this.isMarked = !this.isMarked;
  }

  // Add/remove conflict
  addConflict(cellId) {
    this.conflicts.add(cellId);
  }

  removeConflict(cellId) {
    this.conflicts.delete(cellId);
  }

  clearConflicts() {
    this.conflicts.clear();
  }

  hasConflicts() {
    return this.conflicts.size > 0;
  }

  // Check if cell has exactly 2 pencil marks (bi-value)
  isBiValue() {
    return this.value === 0 && this.pencilMarks.size === 2;
  }

  // Clone the cell
  clone() {
    const cell = new Cell(this.row, this.col, this.value, this.isFixed);
    cell.pencilMarks = new Set(this.pencilMarks);
    cell.isMarked = this.isMarked;
    return cell;
  }

  // Serialize for storage
  toJSON() {
    return {
      value: this.value,
      isFixed: this.isFixed,
      pencilMarks: Array.from(this.pencilMarks),
      isMarked: this.isMarked
    };
  }

  // Deserialize from storage
  static fromJSON(row, col, data) {
    const cell = new Cell(row, col, data.value, data.isFixed);
    cell.pencilMarks = new Set(data.pencilMarks || []);
    cell.isMarked = data.isMarked || false;
    return cell;
  }
}