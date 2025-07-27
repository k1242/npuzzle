/* ====== RENDERING ====== */

const render = () => {
  renderBoard();
  updateNumberPad();
  
  // Check solution
  const nowSolved = checkSolution();
  if (!solved && nowSolved) {
    solved = true;
    CorrectNotification.show();
  } else if (solved && !nowSolved) {
    solved = false;
    CorrectNotification.hide();
  } else if (solved && nowSolved) {
    CorrectNotification.show();
  }
  
  // Save game state
  saveGame();
};

const renderBoard = () => {
  const boardEl = $('#board');
  boardEl.innerHTML = '';
  
  // Get conflicts
  const conflicts = checkConflicts();
  const conflictSet = new Set(conflicts.map(([r, c]) => `${r},${c}`));
  
  // Get related cells for highlighting (only if feature is enabled)
  let relatedCells = new Set();
  if (selectedCell && highlightRelatedCells) {
    const related = getRelatedCells(selectedCell.row, selectedCell.col);
    relatedCells = new Set(related.map(cell => `${cell.row},${cell.col}`));
  }
  
  // Get cells with same number for highlighting
  let sameNumberCells = new Set();
  let highlightNum = null;
  
  // Determine which number to highlight
  if (selectedCell) {
    highlightNum = board[selectedCell.row][selectedCell.col];
  } else if (selectedNumber) {
    highlightNum = selectedNumber;
  }
  
  // Find cells with same number
  if (highlightNum && highlightNum !== 0) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === highlightNum) {
          sameNumberCells.add(`${r},${c}`);
        }
      }
    }
  }
  
  // Get affected areas if the feature is enabled
  let affectedAreas = new Set();
  let affectedNum = null;
  
  // Determine which number to use for affected areas
  if (highlightAffectedAreas) {
    if (selectedCell && board[selectedCell.row][selectedCell.col] !== 0) {
      affectedNum = board[selectedCell.row][selectedCell.col];
    } else if (selectedNumber) {
      affectedNum = selectedNumber;
    }
    
    if (affectedNum) {
      // Find all cells with the same number
      const sameCells = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === affectedNum) {
            sameCells.push({row: r, col: c});
          }
        }
      }
      
      // Add all affected cells (row, col, block) for each same number
      sameCells.forEach(cell => {
        // Add row
        for (let c = 0; c < 9; c++) {
          affectedAreas.add(`${cell.row},${c}`);
        }
        // Add column
        for (let r = 0; r < 9; r++) {
          affectedAreas.add(`${r},${cell.col}`);
        }
        // Add block
        const blockR = Math.floor(cell.row / 3) * 3;
        const blockC = Math.floor(cell.col / 3) * 3;
        for (let r = blockR; r < blockR + 3; r++) {
          for (let c = blockC; c < blockC + 3; c++) {
            affectedAreas.add(`${r},${c}`);
          }
        }
      });
    }
  }
  
  // Create cells
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      
      // Add classes
      if (fixed[r][c]) {
        cell.classList.add('fixed');
      }
      
      if (selectedCell && selectedCell.row === r && selectedCell.col === c) {
        cell.classList.add('selected');
      }
      
      const cellKey = `${r},${c}`;
      
      // Check if cell is marked - this has priority
      const markedColor = markedCells.get(cellKey);
      const isMarked = markedColor !== undefined;
      
      // Highlight related cells (only if feature is enabled and not marked)
      if (!isMarked && highlightRelatedCells && relatedCells.has(cellKey)) {
        if (selectedCell && r === selectedCell.row) cell.classList.add('highlight-row');
        if (selectedCell && c === selectedCell.col) cell.classList.add('highlight-col');
        if (selectedCell && getBlockIndex(r, c) === getBlockIndex(selectedCell.row, selectedCell.col)) {
          cell.classList.add('highlight-block');
        }
      }
      
      // Highlight same numbers (if not marked)
      if (!isMarked && sameNumberCells.has(cellKey)) {
        cell.classList.add('highlight-same');
      }
      
      // Highlight affected areas (if not marked)
      if (!isMarked && affectedAreas.has(cellKey) && !sameNumberCells.has(cellKey)) {
        cell.classList.add('highlight-affected');
      }
      
      // Highlight conflicts
      if (conflictSet.has(cellKey)) {
        cell.classList.add('conflict');
      }
      
      // Apply marked class - this overrides other highlights
      if (isMarked) {
        if (multicolorBrush && markedColor === 2) {
          cell.classList.add('marked2');
        } else {
          cell.classList.add('marked');
        }
      }
      
      // Check for bi-value cells
      if (board[r][c] === 0 && pencilMarks[r][c].size === 2 && showBiValue) {
        cell.classList.add('bi-value');
      }
      
      // Set content
      if (board[r][c] !== 0) {
        cell.textContent = board[r][c];
      } else if (pencilMarks[r][c].size > 0) {
        // Add pencil marks
        const marksContainer = document.createElement('div');
        marksContainer.className = 'pencil-marks';
        
        for (let n = 1; n <= 9; n++) {
          const mark = document.createElement('div');
          mark.className = 'pencil-mark';
          if (pencilMarks[r][c].has(n)) {
            mark.textContent = n;
            // Highlight specific pencil mark
            if (highlightPencilMarks && n === highlightNum) {
              mark.classList.add('highlight');
            }
          }
          marksContainer.appendChild(mark);
        }
        
        cell.appendChild(marksContainer);
      }
      
      // Mouse down handler for drag marking (desktop only)
      cell.onmousedown = (e) => {
        if (markerMode && e.button === 0) { // Left click only
          e.preventDefault();
          isDraggingMarker = true;
          dragStarted = true;
          const key = `${r},${c}`;
          
          // Determine drag mode based on initial cell
          const currentColor = markedCells.get(key);
          if (currentColor !== undefined) {
            // Cell is marked, determine next state
            if (multicolorBrush) {
              if (currentColor === 1) {
                // Change to color 2
                markerDragMode = 'add';
                markerDragColor = 2;
                markedCells.set(key, 2);
              } else {
                // Remove marking
                markerDragMode = 'remove';
                markedCells.delete(key);
              }
            } else {
              // Single color mode - just remove
              markerDragMode = 'remove';
              markedCells.delete(key);
            }
          } else {
            // Cell not marked - add color 1
            markerDragMode = 'add';
            markerDragColor = 1;
            markedCells.set(key, 1);
          }
          render();
        }
      };
      
      // Click handler
      cell.onclick = (e) => {
        e.stopPropagation();
        // Prevent click after drag
        if (dragStarted) {
          dragStarted = false;
          return;
        }
        
        if (markerMode) {
          // Toggle marker on this cell
          const key = `${r},${c}`;
          const currentColor = markedCells.get(key);
          
          if (multicolorBrush) {
            // Cycle: none -> color1 -> color2 -> none
            if (currentColor === undefined) {
              markedCells.set(key, 1);
            } else if (currentColor === 1) {
              markedCells.set(key, 2);
            } else {
              markedCells.delete(key);
            }
          } else {
            // Simple toggle
            if (currentColor !== undefined) {
              markedCells.delete(key);
            } else {
              markedCells.set(key, 1);
            }
          }
          render();
          
          // Send marker update to multiplayer room
          if (window.isInMultiplayerRoom && window.isInMultiplayerRoom()) {
            window.sendUpdate('markedCells', { 
              markedCells: Array.from(markedCells.entries()) 
            });
          }
        } else if (eraserMode && !fixed[r][c]) {
          eraseCell(r, c);
        } else if (selectedNumber && !selectedCell) {
          // Place selected number
          placeNumber(r, c, selectedNumber);
        } else {
          handleCellClick(r, c);
        }
      };
      
      // Prevent context menu on long press
      cell.addEventListener('contextmenu', (e) => {
        if (markerMode) {
          e.preventDefault();
        }
      });
      
      // Mouse enter handler for drag marking
      cell.onmouseenter = (e) => {
        if (markerMode && isDraggingMarker) {
          const key = `${r},${c}`;
          if (markerDragMode === 'add') {
            const currentColor = markedCells.get(key);
            if (currentColor !== markerDragColor) {
              markedCells.set(key, markerDragColor);
              if (!needsRender) {
                needsRender = true;
                requestAnimationFrame(() => {
                  if (needsRender) {
                    render();
                    needsRender = false;
                  }
                });
              }
            }
          } else if (markerDragMode === 'remove' && markedCells.has(key)) {
            markedCells.delete(key);
            if (!needsRender) {
              needsRender = true;
              requestAnimationFrame(() => {
                if (needsRender) {
                  render();
                  needsRender = false;
                }
              });
            }
          }
        }
      };
      
      // Store cell coordinates for potential future use
      cell.dataset.row = r;
      cell.dataset.col = c;
      
      boardEl.appendChild(cell);
    }
  }
};

const updateNumberPad = () => {
  const numBtns = document.querySelectorAll('.num-btn');
  
  // Count occurrences of each number
  const counts = Array(10).fill(0);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) {
        counts[board[r][c]]++;
      }
    }
  }
  
  // Update button states
  numBtns.forEach(btn => {
    const num = parseInt(btn.dataset.num);
    btn.classList.toggle('disabled', counts[num] >= 9);
    btn.classList.toggle('active', selectedNumber === num && !selectedCell);
  });
};

// Animation helper
const animateCell = (row, col, className) => {
  const cells = document.querySelectorAll('.cell');
  const index = row * 9 + col;
  const cell = cells[index];
  
  if (cell) {
    cell.classList.add(className);
    setTimeout(() => {
      cell.classList.remove(className);
    }, 300);
  }
};