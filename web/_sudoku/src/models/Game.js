// Game.js - Main game logic and state management
import { Board } from './Board.js';

export class Game {
  constructor() {
    this.board = new Board();
    this.initialBoard = null;
    this.selectedCell = null;
    this.selectedNumber = null;
    this.isSolved = false;
    this.puzzleIndex = -1;
    
    // Modes
    this.pencilMode = false;
    this.eraserMode = false;
    this.markerMode = false;
    
    // Settings
    this.settings = {
      highlightRelatedCells: true,
      highlightPencilMarks: true,
      highlightAffectedAreas: false,
      highlightBiValues: false,
      prefillNotes: false,
      autoClearNotes: false
    };
    
    // History for undo
    this.history = [];
    this.maxHistorySize = 100;
    
    // Event listeners
    this.listeners = {
      boardUpdate: [],
      selectionChange: [],
      modeChange: [],
      solved: [],
      settingChange: []
    };
  }

  // Event management
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }

  emit(event, data = null) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Load a new puzzle
  loadPuzzle(puzzleString, puzzleIndex = -1) {
    if (!this.board.loadFromString(puzzleString)) {
      return false;
    }
    
    this.initialBoard = this.board.clone();
    this.puzzleIndex = puzzleIndex;
    this.selectedCell = null;
    this.selectedNumber = null;
    this.isSolved = false;
    this.history = [];
    
    // Apply settings
    if (this.settings.prefillNotes) {
      this.board.prefillPencilMarks();
      if (this.settings.autoClearNotes) {
        this.board.clearInvalidPencilMarks();
      }
    }
    
    this.emit('boardUpdate');
    return true;
  }

  // Save current state to history
  saveToHistory() {
    const state = {
      board: this.board.toJSON(),
      selectedCell: this.selectedCell ? {...this.selectedCell} : null
    };
    
    this.history.push(state);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  // Undo last action
  undo() {
    if (this.history.length === 0) return false;
    
    const state = this.history.pop();
    this.board = Board.fromJSON(state.board);
    this.selectedCell = state.selectedCell;
    
    if (this.settings.autoClearNotes) {
      this.board.clearInvalidPencilMarks();
    }
    
    this.checkSolved();
    this.emit('boardUpdate');
    this.emit('selectionChange');
    return true;
  }

  // Cell selection
  selectCell(row, col) {
    if (row < 0 || row >= 9 || col < 0 || col >= 9) return;
    
    this.selectedCell = { row, col };
    this.selectedNumber = null;
    this.emit('selectionChange');
  }

  selectNumber(num) {
    this.selectedNumber = num;
    this.selectedCell = null;
    this.emit('selectionChange');
  }

  clearSelection() {
    this.selectedCell = null;
    this.selectedNumber = null;
    this.emit('selectionChange');
  }

  // Navigation
  moveSelection(direction) {
    if (!this.selectedCell) {
      this.selectCell(0, 0);
      return;
    }
    
    let { row, col } = this.selectedCell;
    
    switch (direction) {
      case 'up':
        row = row > 0 ? row - 1 : 8;
        break;
      case 'down':
        row = row < 8 ? row + 1 : 0;
        break;
      case 'left':
        col = col > 0 ? col - 1 : 8;
        break;
      case 'right':
        col = col < 8 ? col + 1 : 0;
        break;
    }
    
    this.selectCell(row, col);
  }

  // Input handling
  handleNumberInput(num) {
    if (!this.selectedCell) {
      // Number selection mode
      if (this.selectedNumber === num) {
        this.selectedNumber = null;
      } else {
        this.selectedNumber = num;
      }
      this.emit('selectionChange');
      return;
    }
    
    const { row, col } = this.selectedCell;
    
    if (this.eraserMode) {
      this.clearCell(row, col);
    } else if (this.pencilMode) {
      this.togglePencilMark(row, col, num);
    } else {
      this.placeNumber(row, col, num);
    }
  }

  // Place number in cell
  placeNumber(row, col, num) {
    const cell = this.board.getCell(row, col);
    if (!cell || cell.isFixed) return;
    
    // If same number, clear it
    if (cell.value === num) {
      this.saveToHistory();
      this.board.clearCell(row, col);
    } else {
      this.saveToHistory();
      this.board.setCellValue(row, col, num);
      
      // Auto-clear notes if enabled
      if (this.settings.autoClearNotes) {
        this.board.getRelatedCells(row, col).forEach(relatedCell => {
          relatedCell.pencilMarks.delete(num);
        });
      }
    }
    
    this.checkSolved();
    this.emit('boardUpdate');
  }

  // Toggle pencil mark
  togglePencilMark(row, col, num) {
    this.saveToHistory();
    this.board.togglePencilMark(row, col, num);
    this.emit('boardUpdate');
  }

  // Clear cell
  clearCell(row, col) {
    const cell = this.board.getCell(row, col);
    if (!cell || cell.isFixed) return;
    if (cell.value === 0 && cell.pencilMarks.size === 0) return;
    
    this.saveToHistory();
    const clearedValue = cell.value;
    this.board.clearCell(row, col);
    
    // Re-add valid pencil marks if auto-clear is enabled
    if (this.settings.autoClearNotes && clearedValue !== 0) {
      // Add all numbers first
      for (let n = 1; n <= 9; n++) {
        cell.pencilMarks.add(n);
      }
      // Then clear invalid ones
      this.board.clearInvalidPencilMarks();
    }
    
    this.checkSolved();
    this.emit('boardUpdate');
  }

  // Toggle marker
  toggleMarker(row, col) {
    const cell = this.board.getCell(row, col);
    if (!cell) return;
    
    cell.toggleMarker();
    this.emit('boardUpdate');
  }

  // Clear all markers
  clearAllMarkers() {
    let hasMarkers = false;
    this.board.getAllCells().forEach(cell => {
      if (cell.isMarked) {
        cell.isMarked = false;
        hasMarkers = true;
      }
    });
    
    if (hasMarkers) {
      this.emit('boardUpdate');
    }
  }

  // Mode toggles
  togglePencilMode() {
    this.pencilMode = !this.pencilMode;
    this.eraserMode = false;
    this.markerMode = false;
    this.emit('modeChange');
  }

  toggleEraserMode() {
    this.eraserMode = !this.eraserMode;
    this.pencilMode = false;
    this.markerMode = false;
    this.emit('modeChange');
  }

  toggleMarkerMode() {
    this.markerMode = !this.markerMode;
    this.pencilMode = false;
    this.eraserMode = false;
    this.emit('modeChange');
  }

  clearAllModes() {
    this.pencilMode = false;
    this.eraserMode = false;
    this.markerMode = false;
    this.emit('modeChange');
  }

  // Settings
  updateSetting(key, value) {
    if (this.settings.hasOwnProperty(key)) {
      this.settings[key] = value;
      
      // Apply setting changes
      if (key === 'autoClearNotes' && value) {
        this.board.clearInvalidPencilMarks();
        this.emit('boardUpdate');
      }
      
      this.emit('settingChange', { key, value });
    }
  }

  // Check if puzzle is solved
  checkSolved() {
    const wasSolved = this.isSolved;
    this.isSolved = this.board.isSolved();
    
    if (!wasSolved && this.isSolved) {
      this.emit('solved');
    }
  }

  // Get cells to highlight
  getHighlightedCells() {
    const highlights = {
      related: new Set(),
      sameNumber: new Set(),
      affected: new Set()
    };
    
    if (!this.selectedCell && !this.selectedNumber) {
      return highlights;
    }
    
    // Related cells (same row/col/block)
    if (this.selectedCell && this.settings.highlightRelatedCells) {
      const { row, col } = this.selectedCell;
      this.board.getRelatedCells(row, col).forEach(cell => {
        highlights.related.add(cell.id);
      });
    }
    
    // Same number cells
    let highlightNum = null;
    if (this.selectedCell) {
      const cell = this.board.getCell(this.selectedCell.row, this.selectedCell.col);
      if (cell && cell.value !== 0) {
        highlightNum = cell.value;
      }
    } else if (this.selectedNumber) {
      highlightNum = this.selectedNumber;
    }
    
    if (highlightNum) {
      this.board.getAllCells().forEach(cell => {
        if (cell.value === highlightNum) {
          highlights.sameNumber.add(cell.id);
        }
      });
    }
    
    // Affected areas
    if (this.settings.highlightAffectedAreas && highlightNum) {
      this.board.getAllCells().forEach(cell => {
        if (cell.value === highlightNum) {
          this.board.getRelatedCells(cell.row, cell.col).forEach(relatedCell => {
            if (!highlights.sameNumber.has(relatedCell.id)) {
              highlights.affected.add(relatedCell.id);
            }
          });
        }
      });
    }
    
    return highlights;
  }

  // Get game state for saving
  getState() {
    return {
      board: this.board.toJSON(),
      initialBoard: this.initialBoard ? this.initialBoard.toJSON() : null,
      selectedCell: this.selectedCell,
      selectedNumber: this.selectedNumber,
      isSolved: this.isSolved,
      puzzleIndex: this.puzzleIndex,
      pencilMode: this.pencilMode,
      eraserMode: this.eraserMode,
      markerMode: this.markerMode,
      settings: { ...this.settings },
      history: this.history
    };
  }

  // Load game state
  loadState(state) {
    this.board = Board.fromJSON(state.board);
    this.initialBoard = state.initialBoard ? Board.fromJSON(state.initialBoard) : null;
    this.selectedCell = state.selectedCell;
    this.selectedNumber = state.selectedNumber;
    this.isSolved = state.isSolved || false;
    this.puzzleIndex = state.puzzleIndex || -1;
    this.pencilMode = state.pencilMode || false;
    this.eraserMode = state.eraserMode || false;
    this.markerMode = state.markerMode || false;
    this.settings = { ...this.settings, ...state.settings };
    this.history = state.history || [];
    
    this.emit('boardUpdate');
    this.emit('selectionChange');
    this.emit('modeChange');
  }
}