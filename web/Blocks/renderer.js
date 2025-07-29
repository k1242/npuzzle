// ====== RENDERER ======

import { PIECES } from './engine.js';
import { Config } from './config.js';

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
    
    // Mobile elements
    this.scoreMobileEl = elements.scoreMobile;
    this.levelMobileEl = elements.levelMobile;
    this.linesMobileEl = elements.linesMobile;
    
    this.nextQueueEl = elements.nextQueue;
    this.nextQueueMobileEl = elements.nextQueueMobile;
    this.holdPreviewEl = elements.holdPreview;
    this.holdPreviewMobileEl = elements.holdPreviewMobile;
    this.pausedOverlayEl = elements.pausedOverlay;
    this.appEl = elements.app;
    
    // Cell size for mobile
    this.cellSize = Config.VISUAL.CELL_SIZE.DESKTOP;
    this.updateCellSize();
    
    // Animation state
    this.animationsEnabled = true;
    this.activeAnimations = new Set();
    
    // Subscribe to events
    this.subscribeToEvents();
  }
  
  subscribeToEvents() {
    // Unified state update
    this.events.on(Config.EVENTS.STATE_UPDATE, (state) => {
      this.renderBoard(state);
      this.updateStats(state);
      this.updateNextQueue(state);
      this.updateHoldDisplay(state);
    });
    
    // Animation events
    this.events.on(Config.EVENTS.LINES_CLEARED, (data) => {
      this.animateLineClear(data.lines, data.callback);
    });
    
    this.events.on(Config.EVENTS.HARD_DROP_START, (data) => {
      this.animateHardDrop(
        data.piece,
        data.distance,
        () => {
          this.renderBoard(this.events.getState());
        },
        () => {
          this.events.completeHardDrop(data.distance);
        }
      );
    });
    
    // Game state events
    this.events.on(Config.EVENTS.GAME_PAUSE, () => this.updatePauseOverlay(true));
    this.events.on(Config.EVENTS.GAME_RESUME, () => this.updatePauseOverlay(false));
    this.events.on(Config.EVENTS.GAME_OVER, () => this.showGameOver());
    this.events.on(Config.EVENTS.GAME_START, () => this.hideGameOver());
    
    // Settings
    this.events.on(Config.EVENTS.ANIMATION_TOGGLE, (enabled) => {
      this.setAnimationsEnabled(enabled);
    });
  }
  
  // Update cell size based on screen width
  updateCellSize() {
    if (window.innerWidth <= Config.BREAKPOINTS.NARROW) {
      this.cellSize = Config.VISUAL.CELL_SIZE.MOBILE;
    } else if (window.innerWidth <= Config.BREAKPOINTS.MOBILE) {
      this.cellSize = Config.VISUAL.CELL_SIZE.TABLET;
    } else {
      this.cellSize = Config.VISUAL.CELL_SIZE.DESKTOP;
    }
  }
  
  // Animation settings
  setAnimationsEnabled(enabled) {
    this.animationsEnabled = enabled;
    document.body.classList.toggle('no-animations', !enabled);
    
    if (!enabled) {
      this.cancelAllAnimations();
    }
  }
  
  // Render board
  renderBoard(gameState) {
    if (!this.boardEl) return;
    
    this.boardEl.innerHTML = '';
    
    // Render board cells
    for (let r = 0; r < Config.BOARD.ROWS; r++) {
      for (let c = 0; c < Config.BOARD.COLS; c++) {
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
            
            if (!overlaps && gy >= 0 && gy < Config.BOARD.ROWS && gx >= 0 && gx < Config.BOARD.COLS) {
              const idx = gy * Config.BOARD.COLS + gx;
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
            if (y >= 0 && y < Config.BOARD.ROWS && x >= 0 && x < Config.BOARD.COLS) {
              const idx = y * Config.BOARD.COLS + x;
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
    const upcoming = [...gameState.bag, ...gameState.nextBag].slice(0, Config.VISUAL.NEXT_PIECES_COUNT);
    
    // Update desktop next queue
    if (this.nextQueueEl) {
      this.nextQueueEl.innerHTML = '';
      upcoming.forEach(type => {
        this.nextQueueEl.appendChild(this.renderPreview(type));
      });
    }
    
    // Update mobile next queue
    if (this.nextQueueMobileEl) {
      this.nextQueueMobileEl.innerHTML = '';
      upcoming.forEach(type => {
        this.nextQueueMobileEl.appendChild(this.renderPreview(type));
      });
    }
  }
  
  // Update hold display
  updateHoldDisplay(gameState) {
    const renderHold = (element) => {
      if (!element) return;
      
      element.innerHTML = '';
      
      if (gameState.heldPiece) {
        element.appendChild(this.renderPreview(gameState.heldPiece));
      } else {
        const empty = document.createElement('div');
        empty.className = 'empty-hold';
        element.appendChild(empty);
      }
    };
    
    // Update desktop hold
    renderHold(this.holdPreviewEl);
    
    // Update mobile hold
    renderHold(this.holdPreviewMobileEl);
  }
  
  // Show/hide pause overlay
  updatePauseOverlay(paused) {
    if (this.pausedOverlayEl) {
      this.pausedOverlayEl.style.display = paused ? 'flex' : 'none';
    }
  }
  
  // Game over animation
  showGameOver() {
    if (this.appEl) {
      this.appEl.classList.add('game-over');
    }
  }
  
  hideGameOver() {
    if (this.appEl) {
      this.appEl.classList.remove('game-over');
    }
  }
  
  // Get board rect for mouse control
  getBoardRect() {
    return this.boardEl ? this.boardEl.getBoundingClientRect() : null;
  }
  
  // ====== ANIMATIONS ======
  
  // Line clear animation
  animateLineClear(lines, callback) {
    if (!this.animationsEnabled || !this.boardEl) {
      callback();
      return;
    }
    
    const animationId = Symbol('lineClear');
    this.activeAnimations.add(animationId);
    
    // Add clearing class to cells
    lines.forEach(row => {
      for (let c = 0; c < Config.BOARD.COLS; c++) {
        const idx = row * Config.BOARD.COLS + c;
        this.boardEl.children[idx]?.classList.add('clearing');
      }
    });
    
    // Wait for clear animation then trigger falling
    setTimeout(() => {
      this.animateFallingPieces(lines, () => {
        this.activeAnimations.delete(animationId);
        callback();
      });
    }, Config.TIMING.LINE_CLEAR_ANIMATION);
  }
  
  // Falling pieces animation after line clear
  animateFallingPieces(clearedRows, callback) {
    if (!this.animationsEnabled || !this.boardEl) {
      callback();
      return;
    }
    
    const highestClearedRow = Math.min(...clearedRows);
    
    setTimeout(() => {
      // Add falling animation to blocks above cleared lines
      for (let r = 0; r < highestClearedRow; r++) {
        for (let c = 0; c < Config.BOARD.COLS; c++) {
          const idx = r * Config.BOARD.COLS + c;
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
        
        callback();
      }, Config.TIMING.FALLING_ANIMATION);
    }, 0);
  }
  
  // Hard drop animation
  animateHardDrop(piece, dropDistance, onFrame, onComplete) {
    if (!this.animationsEnabled || dropDistance === 0) {
      piece.y += dropDistance;
      onFrame();
      onComplete();
      return;
    }
    
    const animationId = Symbol('hardDrop');
    this.activeAnimations.add(animationId);
    
    const dropSpeed = Math.max(Config.TIMING.HARD_DROP_SPEED, 50 / dropDistance);
    let currentDrop = 0;
    
    const animate = () => {
      if (currentDrop < dropDistance && this.activeAnimations.has(animationId)) {
        piece.y++;
        currentDrop++;
        onFrame();
        
        if (currentDrop < dropDistance) {
          setTimeout(animate, dropSpeed);
        } else {
          this.activeAnimations.delete(animationId);
          onComplete();
        }
      } else {
        this.activeAnimations.delete(animationId);
        onComplete();
      }
    };
    
    animate();
  }
  
  // Cancel all active animations
  cancelAllAnimations() {
    this.activeAnimations.clear();
    
    if (this.boardEl) {
      this.boardEl.querySelectorAll('.cell').forEach(cell => {
        cell.style.transition = '';
        cell.style.transform = '';
        cell.classList.remove('clearing');
      });
    }
  }
  
  // Clean up
  destroy() {
    this.cancelAllAnimations();
  }
}