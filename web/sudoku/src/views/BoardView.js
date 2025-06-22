// BoardView.js - View for rendering the sudoku board
export class BoardView {
  constructor(container) {
    this.container = container;
    this.cellElements = new Map(); // Map of cell id to DOM element
    this.dragState = {
      isDragging: false,
      mode: null,
      startCell: null
    };
    
    // Event callbacks
    this.onCellClick = null;
    this.onCellDrag = null;
    
    this.initializeBoard();
  }

  // Initialize the board structure
  initializeBoard() {
    this.container.innerHTML = '';
    
    // Create cells
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cellEl = this.createCellElement(row, col);
        this.container.appendChild(cellEl);
        this.cellElements.set(`${row},${col}`, cellEl);
      }
    }
    
    // Add global event listeners for drag
    document.addEventListener('mouseup', () => this.endDrag());
    document.addEventListener('touchend', () => this.endDrag());
    document.addEventListener('touchcancel', () => this.endDrag());
  }

  // Create a cell element
  createCellElement(row, col) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.row = row;
    cell.dataset.col = col;
    
    // Mouse events
    cell.addEventListener('mousedown', (e) => this.handleCellMouseDown(e, row, col));
    cell.addEventListener('mouseenter', () => this.handleCellEnter(row, col));
    cell.addEventListener('click', (e) => this.handleCellClick(e, row, col));
    
    // Touch events
    cell.addEventListener('touchstart', (e) => this.handleCellTouchStart(e, row, col));
    cell.addEventListener('touchmove', (e) => this.handleCellTouchMove(e));
    
    // Prevent context menu
    cell.addEventListener('contextmenu', (e) => e.preventDefault());
    
    return cell;
  }

  // Update the board display
  update(game) {
    const board = game.board;
    const highlights = game.getHighlightedCells();
    const selectedCell = game.selectedCell;
    const selectedNumber = game.selectedNumber;
    
    // Update each cell
    board.getAllCells().forEach(cellModel => {
      const cellEl = this.cellElements.get(cellModel.id);
      if (!cellEl) return;
      
      // Clear classes
      cellEl.className = 'cell';
      
      // Fixed cell
      if (cellModel.isFixed) {
        cellEl.classList.add('fixed');
      }
      
      // Selected cell
      if (selectedCell && selectedCell.row === cellModel.row && selectedCell.col === cellModel.col) {
        cellEl.classList.add('selected');
      }
      
      // Highlights (only if not marked)
      if (!cellModel.isMarked) {
        // Related cells
        if (highlights.related.has(cellModel.id) && game.settings.highlightRelatedCells) {
          if (selectedCell) {
            if (cellModel.row === selectedCell.row) cellEl.classList.add('highlight-row');
            if (cellModel.col === selectedCell.col) cellEl.classList.add('highlight-col');
            if (cellModel.blockIndex === board.getCell(selectedCell.row, selectedCell.col).blockIndex) {
              cellEl.classList.add('highlight-block');
            }
          }
        }
        
        // Same number
        if (highlights.sameNumber.has(cellModel.id)) {
          cellEl.classList.add('highlight-same');
        }
        
        // Affected areas
        if (highlights.affected.has(cellModel.id)) {
          cellEl.classList.add('highlight-affected');
        }
      }
      
      // Conflicts
      if (cellModel.hasConflicts()) {
        cellEl.classList.add('conflict');
      }
      
      // Marked
      if (cellModel.isMarked) {
        cellEl.classList.add('marked');
      }
      
      // Bi-value
      if (cellModel.isBiValue() && game.settings.highlightBiValues) {
        cellEl.classList.add('bi-value');
      }
      
      // Update content
      cellEl.innerHTML = '';
      
      if (cellModel.value !== 0) {
        cellEl.textContent = cellModel.value;
      } else if (cellModel.pencilMarks.size > 0) {
        cellEl.appendChild(this.createPencilMarksElement(cellModel, selectedNumber, game.settings.highlightPencilMarks));
      }
    });
  }

  // Create pencil marks element
  createPencilMarksElement(cellModel, selectedNumber, highlightEnabled) {
    const container = document.createElement('div');
    container.className = 'pencil-marks';
    
    for (let n = 1; n <= 9; n++) {
      const mark = document.createElement('div');
      mark.className = 'pencil-mark';
      
      if (cellModel.pencilMarks.has(n)) {
        mark.textContent = n;
        
        // Highlight if matches selected number
        if (highlightEnabled && n === selectedNumber) {
          mark.classList.add('highlight');
        } else if (highlightEnabled && cellModel.value === 0) {
          // Check if selected cell has this number
          const selectedCell = this.getSelectedCellValue();
          if (selectedCell && selectedCell === n) {
            mark.classList.add('highlight');
          }
        }
      }
      
      container.appendChild(mark);
    }
    
    return container;
  }

  // Get selected cell value (for pencil mark highlighting)
  getSelectedCellValue() {
    // This will be set by the controller
    return null;
  }

  // Event handlers
  handleCellClick(e, row, col) {
    e.stopPropagation();
    
    // Ignore click if we were dragging
    if (this.dragState.startCell) {
      this.dragState.startCell = null;
      return;
    }
    
    if (this.onCellClick) {
      this.onCellClick(row, col);
    }
  }

  handleCellMouseDown(e, row, col) {
    if (e.button !== 0) return; // Left click only
    
    e.preventDefault();
    this.startDrag(row, col);
  }

  handleCellTouchStart(e, row, col) {
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    this.dragState.lastTouch = { x: touch.clientX, y: touch.clientY };
    this.startDrag(row, col);
  }

  handleCellEnter(row, col) {
    if (this.dragState.isDragging && this.onCellDrag) {
      this.onCellDrag(row, col, this.dragState.mode);
    }
  }

  handleCellTouchMove(e) {
    if (!this.dragState.isDragging) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    
    // Find element under touch point
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element && element.classList.contains('cell')) {
      const row = parseInt(element.dataset.row);
      const col = parseInt(element.dataset.col);
      
      if (!isNaN(row) && !isNaN(col) && this.onCellDrag) {
        this.onCellDrag(row, col, this.dragState.mode);
      }
    }
  }

  startDrag(row, col) {
    this.dragState.isDragging = true;
    this.dragState.startCell = { row, col };
    
    // Mode will be determined by the controller
    if (this.onCellDrag) {
      const mode = this.onCellDrag(row, col, 'start');
      this.dragState.mode = mode;
    }
  }

  endDrag() {
    if (this.dragState.isDragging) {
      this.dragState.isDragging = false;
      this.dragState.mode = null;
      
      // Small delay to prevent click event
      setTimeout(() => {
        this.dragState.startCell = null;
      }, 50);
    }
  }

  // Apply marker mode class to body
  setMarkerMode(enabled) {
    document.body.classList.toggle('marker-mode', enabled);
  }

  // Animate cell (for feedback)
  animateCell(row, col, animationClass) {
    const cellEl = this.cellElements.get(`${row},${col}`);
    if (!cellEl) return;
    
    cellEl.classList.add(animationClass);
    setTimeout(() => {
      cellEl.classList.remove(animationClass);
    }, 300);
  }

  // Clean up
  destroy() {
    document.removeEventListener('mouseup', () => this.endDrag());
    document.removeEventListener('touchend', () => this.endDrag());
    document.removeEventListener('touchcancel', () => this.endDrag());
    
    this.container.innerHTML = '';
    this.cellElements.clear();
  }
}