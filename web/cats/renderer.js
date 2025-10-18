/* ====== GAME RENDERER ====== */

class GameRenderer {
  constructor() {
    this.boardElement = document.getElementById('board');
    this.boardWrap = document.getElementById('boardWrap');
    this.pieceOptions = document.getElementById('pieceOptions');
    this.selectionPrompt = document.getElementById('selectionPrompt');
    this.winnerDisplay = document.getElementById('winnerDisplay');
    
    // Pool elements
    this.poolElements = {
      1: {
        kittens: document.getElementById('p1Kittens'),
        cats: document.getElementById('p1Cats')
      },
      2: {
        kittens: document.getElementById('p2Kittens'),
        cats: document.getElementById('p2Cats')
      }
    };
  }

  // Render complete game state
  render(gameState) {
    this.renderPools(gameState);
    this.renderPieceSelection(gameState);
    this.renderBoard(gameState);
    
    if (gameState.gameOver) {
      this.showWinner(gameState.winner);
    } else {
      this.hideWinner();
    }
  }

  // Render player pools
  renderPools(gameState) {
    for (let player = 1; player <= 2; player++) {
      const pool = gameState.pools[player];
      this.poolElements[player].kittens.textContent = pool.kittens;
      this.poolElements[player].cats.textContent = pool.cats;
    }
  }

  // Render piece selection UI
  renderPieceSelection(gameState) {
    this.pieceOptions.innerHTML = '';
    
    if (gameState.graduationMode) {
      if (gameState.fullBoardGraduation) {
        this.selectionPrompt.textContent = 'Click a piece to remove from board';
      } else {
        this.selectionPrompt.textContent = 'Click all 3 pieces to graduate';
      }
      this.selectionPrompt.style.display = 'block';
      return;
    }
    
    if (gameState.gameOver) {
      this.selectionPrompt.style.display = 'none';
      return;
    }
    
    this.selectionPrompt.textContent = 'Select piece to place:';
    this.selectionPrompt.style.display = 'block';
    
    const player = gameState.currentPlayer;
    const pool = gameState.pools[player];
    
    // Create buttons for available pieces
    if (pool.kittens > 0) {
      const kitten = player === 1 ? 'a' : 'b';
      this.pieceOptions.appendChild(this.createPieceButton(kitten, gameState.selectedPiece === kitten, player));
    }
    
    if (pool.cats > 0) {
      const cat = player === 1 ? 'A' : 'B';
      this.pieceOptions.appendChild(this.createPieceButton(cat, gameState.selectedPiece === cat, player));
    }
  }

  // Create piece selection button
  createPieceButton(piece, isSelected, player) {
    const button = document.createElement('button');
    button.className = 'piece-btn';
    button.textContent = piece;
    button.classList.add(`player${player}`);
    
    if (isSelected) {
      button.classList.add('selected');
    }
    
    button.dataset.piece = piece;
    return button;
  }

  // Render game board
  renderBoard(gameState) {
    this.boardElement.innerHTML = '';
    
    // Apply graduation mode class to board wrap
    if (gameState.graduationMode) {
      this.boardWrap.classList.add('graduation-mode');
    } else {
      this.boardWrap.classList.remove('graduation-mode');
    }
    
    // Create graduation cells set for highlighting
    const graduationCells = new Set();
    if (gameState.graduationMode) {
      for (const option of gameState.graduationOptions) {
        for (const [r, c] of option.cells) {
          graduationCells.add(`${r},${c}`);
        }
      }
    }
    
    // Create winning cells set for highlighting
    const winningCells = new Set();
    if (gameState.gameOver && gameState.winningCells) {
      for (const [r, c] of gameState.winningCells) {
        winningCells.add(`${r},${c}`);
      }
    }
    
    // Create board cells
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const cell = this.createCell(r, c, gameState, graduationCells, winningCells);
        this.boardElement.appendChild(cell);
      }
    }
  }

  // Create board cell
  createCell(row, col, gameState, graduationCells, winningCells = new Set()) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.row = row;
    cell.dataset.col = col;
    
    const piece = gameState.board[row][col];
    if (piece) {
      cell.textContent = piece;
      cell.classList.add('occupied');
      
      // Add player class
      const player = (piece === 'a' || piece === 'A') ? 1 : 2;
      cell.classList.add(`player${player}`);
    }
    
    // Graduation mode styling
    if (gameState.graduationMode) {
      const cellKey = `${row},${col}`;
      if (graduationCells.has(cellKey)) {
        cell.classList.add('graduation-option');
        // For full board graduation, don't show selection state
        if (!gameState.fullBoardGraduation && gameState.selectedGraduationCells.has(cellKey)) {
          cell.classList.add('graduation-selected');
        }
      } else {
        cell.classList.add('dimmed');
      }
    }
    
    // Game over styling - apply to all cells, winning cells will override
    if (gameState.gameOver) {
      const cellKey = `${row},${col}`;
      if (winningCells.has(cellKey)) {
        cell.classList.add('winning-cell');
      } else {
        cell.classList.add('non-winning');
      }
    }
    
    return cell;
  }

  // Show winner
  showWinner(player) {
    const winnerText = player === 1 ? 'Blue Wins!' : 'Red Wins!';
    this.winnerDisplay.textContent = winnerText;
    this.winnerDisplay.classList.add('show');
    this.boardWrap.classList.add('game-over');
  }

  // Hide winner
  hideWinner() {
    this.winnerDisplay.classList.remove('show');
    this.boardWrap.classList.remove('game-over');
  }
}

// Export for use in other modules
window.GameRenderer = GameRenderer;