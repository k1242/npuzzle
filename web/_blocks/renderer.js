// ====== RENDERER ======

import { PIECES, ROWS, COLS } from './engine.js';
import { GameEvents } from './events.js';

export class Renderer {
  constructor(elements, eventBus) {
    // Event bus
    this.events = eventBus;
    
    // DOM elements
    this.boardEl = elements.board;
    
    // Desktop elements
    this.scoreEl = elements.score;
    this.levelEl = elements.level;
    this.linesEl = elements.lines;
    this.nextQueueEl = elements.nextQueue;
    
    // Mobile elements
    this.scoreMobileEl = elements.scoreMobile;
    this.levelMobileEl = elements.levelMobile;
    this.linesMobileEl = elements.linesMobile;
    
    // Shared elements
    this.holdPreviewEl = elements.holdPreview;
    this.pausedOverlayEl = elements.pausedOverlay;
    this.appEl = elements.app;
    
    // Animation settings
    this.animationsEnabled = true;
    
    // Cell size for mobile
    this.cellSize = 26;
    this.updateCellSize();
    
    // Subscribe to events
    this.subscribeToEvents();
  }
  
  subscribeToEvents() {
    // Board and piece events
    this.events.on(GameEvents.BOARD_UPDATE, (state) => this.renderBoard(state));
    this.events.on(GameEvents.STATS_UPDATE, (state) => this.updateStats(state));
    this.events.on(GameEvents.NEXT_QUEUE_UPDATE, (state) => this.updateNextQueue(state));
    this.events.on(GameEvents.HOLD_UPDATE, (state) => this.updateHoldDisplay(state));
    
    // Animation events
    this.events.on(GameEvents.LINES_CLEARED, (data) => {
      this.animateLineClear(data.lines, data.callback);
    });
    
    // Game state events
    this.events.on(GameEvents.GAME_PAUSE, () => this.updatePauseOverlay(true));
    this.events.on(GameEvents.GAME_RESUME, () => this.updatePauseOverlay(false));
    this.events.on(GameEvents.GAME_OVER, () => this.showGameOver());
    this.events.on(GameEvents.GAME_START, () => this.hideGameOver());
    
    // Settings events
    this.events.on(GameEvents.ANIMATION_TOGGLE, (enabled) => {
      this.setAnimationsEnabled(enabled);
    });
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
    // Update desktop stats
    if (this.scoreEl) this.scoreEl.textContent = gameState.score;
    if (this.levelEl) this.levelEl.textContent = gameState.level;
    if (this.linesEl) this.linesEl.textContent = gameState.lines;
    
    // Update mobile stats
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