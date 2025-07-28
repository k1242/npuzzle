// ====== RENDERER ======

import { PIECES, ROWS, COLS } from './engine.js';

export class Renderer {
  constructor(elements) {
    // DOM elements
    this.boardEl = elements.board;
    this.scoreEl = elements.score;
    this.levelEl = elements.level;
    this.linesEl = elements.lines;
    this.nextQueueEl = elements.nextQueue;
    this.holdPreviewEl = elements.holdPreview;
    this.pausedOverlayEl = elements.pausedOverlay;
    this.appEl = elements.app;
    
    // Mobile elements
    this.scoreMobileEl = null;
    this.levelMobileEl = null;
    this.linesMobileEl = null;
    
    // Animation settings
    this.animationsEnabled = true;
    
    // Cell size for mobile
    this.cellSize = 26;
    this.updateCellSize();
  }
  
  // Update cell size based on screen width
  updateCellSize() {
    if (window.innerWidth <= 400) {
      this.cellSize = 22;
    } else if (window.innerWidth <= 768) {
      this.cellSize = 28;
    } else {
      this.cellSize = 26;
    }
  }
  
  // Check if mobile
  isMobile() {
    return window.innerWidth <= 768;
  }
  
  // Setup mobile layout
  setupMobileLayout() {
    const app = this.appEl;
    
    if (!this.isMobile()) {
      // Remove mobile layout if window is resized to desktop
      app.classList.remove('mobile-layout');
      
      // Remove mobile elements if they exist
      const mobileScoreBox = document.querySelector('.mobile-score-box');
      if (mobileScoreBox) mobileScoreBox.remove();
      
      const mobileGameWrapper = document.querySelector('.mobile-game-wrapper');
      if (mobileGameWrapper) mobileGameWrapper.remove();
      
      const mobileGameArea = document.querySelector('.mobile-game-area');
      if (mobileGameArea) {
        // Move children back to app
        const leftPanel = mobileGameArea.querySelector('.side-panel.left');
        const gameContainer = mobileGameArea.querySelector('.game-container');
        
        if (leftPanel) app.appendChild(leftPanel);
        if (gameContainer) app.appendChild(gameContainer);
        
        mobileGameArea.remove();
      }
      
      // Show right panel and restore desktop layout
      const rightPanel = document.querySelector('.side-panel.right');
      const leftPanel = document.querySelector('.side-panel.left'); 
      const gameContainer = document.querySelector('.game-container');
      
      if (rightPanel) {
        rightPanel.style.display = '';
        
        // Move Next box back to right panel from left panel
        const nextBox = document.querySelector('.info-box:has(#nextQueue)') || 
                        Array.from(document.querySelectorAll('.info-box.piece-box'))
                             .find(box => box.querySelector('#nextQueue'));
        
        if (nextBox && nextBox.parentElement !== rightPanel) {
          rightPanel.appendChild(nextBox);
        }
      }
      
      // Ensure game over text stays in game container on desktop
      const gameOverText = document.querySelector('#gameOverText');
      if (gameOverText && gameContainer && gameOverText.parentElement !== gameContainer) {
        gameContainer.appendChild(gameOverText);
      }
      
      // Ensure correct desktop order in app
      if (leftPanel && leftPanel.parentElement !== app) {
        app.appendChild(leftPanel);
      }
      if (gameContainer && gameContainer.parentElement !== app) {
        app.appendChild(gameContainer);
      }
      if (rightPanel && rightPanel.parentElement !== app) {
        app.appendChild(rightPanel);
      }
      
      return;
    }
    
    // Check if already in mobile layout
    if (app.classList.contains('mobile-layout')) {
      return;
    }
    
    app.classList.add('mobile-layout');
    
    const leftPanel = document.querySelector('.side-panel.left');
    const rightPanel = document.querySelector('.side-panel.right');
    const gameContainer = document.querySelector('.game-container');
    
    if (!leftPanel || !rightPanel || !gameContainer) return;
    
    // Create mobile game wrapper
    if (!document.querySelector('.mobile-game-wrapper')) {
      const gameWrapper = document.createElement('div');
      gameWrapper.className = 'mobile-game-wrapper';
      
      // Create mobile score box
      const newScoreBox = document.createElement('div');
      newScoreBox.className = 'info-box mobile-score-box';
      newScoreBox.innerHTML = `
        <div class="score-section">
          <h3>Score</h3>
          <div class="score" id="score-mobile">0</div>
        </div>
        <div class="stats">
          <div>Level <span id="level-mobile">1</span></div>
          <div>Lines <span id="lines-mobile">0</span></div>
        </div>
      `;
      
      // Create mobile game area
      const gameArea = document.createElement('div');
      gameArea.className = 'mobile-game-area';
      
      // Move elements
      gameArea.appendChild(leftPanel);
      gameArea.appendChild(gameContainer);
      
      gameWrapper.appendChild(newScoreBox);
      gameWrapper.appendChild(gameArea);
      
      // Don't move game over text - keep it in game container
      // This allows proper positioning relative to viewport
      
      app.appendChild(gameWrapper);
      
      // Store mobile element references
      this.scoreMobileEl = document.getElementById('score-mobile');
      this.levelMobileEl = document.getElementById('level-mobile');
      this.linesMobileEl = document.getElementById('lines-mobile');
    }
    
    // Move next queue to left panel if not already there
    const nextBox = rightPanel.querySelector('.info-box.piece-box');
    if (nextBox && nextBox.parentElement === rightPanel) {
      leftPanel.appendChild(nextBox);
    }
    
    // Hide right panel on mobile
    rightPanel.style.display = 'none';
  }
  
  // Render board
  renderBoard(gameState) {
    if (!this.boardEl) return;
    
    this.boardEl.innerHTML = '';
    
    // Render board cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (gameState.board[r][c]) {
          cell.classList.add('filled', gameState.board[r][c]);
        }
        this.boardEl.appendChild(cell);
      }
    }
    
    // Render ghost piece
    if (gameState.ghostPiece && gameState.currentPiece && !gameState.gameOver) {
      gameState.ghostPiece.shape.forEach((row, r) => {
        row.forEach((val, c) => {
          if (val) {
            const gx = gameState.ghostPiece.x + c;
            const gy = gameState.ghostPiece.y + r;
            
            // Check if current piece overlaps
            let overlaps = false;
            gameState.currentPiece.shape.forEach((prow, pr) => {
              prow.forEach((pval, pc) => {
                if (pval && gameState.currentPiece.x + pc === gx && 
                    gameState.currentPiece.y + pr === gy) {
                  overlaps = true;
                }
              });
            });
            
            if (!overlaps && gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
              const idx = gy * COLS + gx;
              this.boardEl.children[idx]?.classList.add('ghost', gameState.currentPiece.type);
            }
          }
        });
      });
    }
    
    // Render current piece
    if (gameState.currentPiece && !gameState.gameOver) {
      gameState.currentPiece.shape.forEach((row, r) => {
        row.forEach((val, c) => {
          if (val) {
            const x = gameState.currentPiece.x + c;
            const y = gameState.currentPiece.y + r;
            if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
              const idx = y * COLS + x;
              this.boardEl.children[idx]?.classList.add('filled', gameState.currentPiece.type);
            }
          }
        });
      });
    }
  }
  
  // Update stats
  updateStats(gameState) {
    // Update regular stats
    if (this.scoreEl) this.scoreEl.textContent = gameState.score;
    if (this.levelEl) this.levelEl.textContent = gameState.level;
    if (this.linesEl) this.linesEl.textContent = gameState.lines;
    
    // Update mobile stats if they exist
    if (this.scoreMobileEl) this.scoreMobileEl.textContent = gameState.score;
    if (this.levelMobileEl) this.levelMobileEl.textContent = gameState.level;
    if (this.linesMobileEl) this.linesMobileEl.textContent = gameState.lines;
  }
  
  // Render preview piece
  renderPreview(type) {
    const piece = PIECES[type];
    const preview = document.createElement('div');
    preview.className = 'preview-piece';
    
    // Create 4x3 grid for preview
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = document.createElement('div');
        cell.className = 'preview-cell';
        
        if (r < piece.shape.length && c < piece.shape[0].length && piece.shape[r][c]) {
          cell.classList.add('filled', type);
        }
        
        preview.appendChild(cell);
      }
    }
    
    return preview;
  }
  
  // Update next queue
  updateNextQueue(gameState) {
    if (!this.nextQueueEl) return;
    
    this.nextQueueEl.innerHTML = '';
    
    const upcoming = [...gameState.bag, ...gameState.nextBag].slice(0, 3);
    upcoming.forEach(type => {
      this.nextQueueEl.appendChild(this.renderPreview(type));
    });
  }
  
  // Update hold display
  updateHoldDisplay(gameState) {
    if (!this.holdPreviewEl) return;
    
    this.holdPreviewEl.innerHTML = '';
    
    if (gameState.heldPiece) {
      this.holdPreviewEl.appendChild(this.renderPreview(gameState.heldPiece));
    } else {
      const empty = document.createElement('div');
      empty.className = 'empty-hold';
      this.holdPreviewEl.appendChild(empty);
    }
  }
  
  // Show/hide pause overlay
  updatePauseOverlay(paused) {
    if (this.pausedOverlayEl) {
      this.pausedOverlayEl.style.display = paused ? 'flex' : 'none';
    }
  }
  
  // Show game over
  showGameOver() {
    if (this.appEl) {
      this.appEl.classList.add('game-over');
    }
  }
  
  // Hide game over
  hideGameOver() {
    if (this.appEl) {
      this.appEl.classList.remove('game-over');
    }
    if (this.pausedOverlayEl) {
      this.pausedOverlayEl.style.display = 'none';
    }
  }
  
  // Animate line clear
  animateLineClear(lines, callback) {
    const animationDuration = this.animationsEnabled ? 200 : 0;
    
    // Animate clearing
    if (this.animationsEnabled && this.boardEl) {
      lines.forEach(row => {
        for (let c = 0; c < COLS; c++) {
          const idx = row * COLS + c;
          this.boardEl.children[idx]?.classList.add('clearing');
        }
      });
    }
    
    // Wait for animation then trigger falling animation
    setTimeout(() => {
      if (this.animationsEnabled) {
        this.animateFallingPieces(lines, callback);
      } else {
        callback();
      }
    }, animationDuration);
  }
  
  // Animate pieces falling after line clear
  animateFallingPieces(clearedRows, callback) {
    if (!this.animationsEnabled || !this.boardEl) {
      callback();
      return;
    }
    
    const highestClearedRow = Math.min(...clearedRows);
    
    // Small delay to let line clear animation finish
    setTimeout(() => {
      // Add falling animation to blocks above cleared lines
      for (let r = 0; r < highestClearedRow; r++) {
        for (let c = 0; c < COLS; c++) {
          const idx = r * COLS + c;
          const cell = this.boardEl.children[idx];
          if (cell && cell.classList.contains('filled')) {
            // Calculate drop distance
            const linesBelow = clearedRows.filter(row => row > r).length;
            
            cell.style.transition = 'transform 0.1s linear';
            cell.style.transform = `translateY(calc(${linesBelow} * var(--cell-size))) scale(0.9)`;
          }
        }
      }
      
      // Wait for animation to complete
      setTimeout(() => {
        // Reset all transforms
        this.boardEl.querySelectorAll('.cell').forEach(cell => {
          cell.style.transition = '';
          cell.style.transform = '';
        });
        
        // Now update the board
        callback();
      }, 100);
    }, 0);
  }
  
  // Set animations enabled
  setAnimationsEnabled(enabled) {
    this.animationsEnabled = enabled;
    document.body.classList.toggle('no-animations', !enabled);
  }
  
  // Get board rect for mouse control
  getBoardRect() {
    return this.boardEl ? this.boardEl.getBoundingClientRect() : null;
  }
}