// ====== RENDERER ======

import { PIECES } from './engine.js';
import { Config } from './config.js';

export class Renderer {
  constructor(elements, eventBus) {
    // Event bus
    this.events = eventBus;
    
    // DOM elements - single set for all layouts
    this.boardEl = elements.board;
    this.scoreEl = elements.score;
    this.levelEl = elements.level;
    this.linesEl = elements.lines;
    this.nextQueueEl = elements.nextQueue;
    this.holdPreviewEl = elements.holdPreview;
    this.pausedOverlayEl = elements.pausedOverlay;
    this.appEl = elements.app;
    
    // Cell size for mobile calculations
    this.cellSize = this.calculateCellSize();
    
    // Animation state
    this.animationsEnabled = true;
    this.activeAnimations = new Set();
    
    // Notification queue
    this.notificationQueue = [];
    this.showingNotification = false;
    
    // Subscribe to events
    this.subscribeToEvents();
    
    // Create notification container
    this.createNotificationContainer();
  }
  
  subscribeToEvents() {
    // Unified state update
    this.events.on(Config.EVENTS.STATE_UPDATE, (state) => {
      this.renderBoard(state);
      this.updateStats(state);
      this.updateNextQueue(state);
      this.updateHoldDisplay(state);
      this.updateComboDisplay(state);
    });
    
    // Animation events
    this.events.on(Config.EVENTS.LINES_CLEARED, (data) => {
      this.animateLineClear(data.lines, data.callback);
      
      // Show combo notification if combo > 1
      if (data.combo > 1) {
        this.showNotification(`${data.combo - 1} COMBO`, 'combo');
      }
      
      // Show back-to-back notification
      if (data.backToBack) {
        this.showNotification('BACK-TO-BACK', 'b2b');
      }
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
    
    // Special move events
    this.events.on(Config.EVENTS.T_SPIN, (data) => {
      const text = data.mini ? 'MINI T-SPIN' : 'T-SPIN';
      const suffix = data.lines > 0 ? ` ${['', 'SINGLE', 'DOUBLE', 'TRIPLE'][data.lines]}` : '';
      this.showNotification(text + suffix, 'tspin');
    });
    
    this.events.on(Config.EVENTS.PERFECT_CLEAR, () => {
      this.showNotification('PERFECT CLEAR', 'perfect');
    });
    
    // Game state events
    this.events.on(Config.EVENTS.GAME_PAUSE, () => this.updatePauseOverlay(true));
    this.events.on(Config.EVENTS.GAME_RESUME, () => this.updatePauseOverlay(false));
    this.events.on(Config.EVENTS.GAME_OVER, (data) => this.showGameOver(data));
    this.events.on(Config.EVENTS.GAME_START, () => this.hideGameOver());
    
    // Settings
    this.events.on(Config.EVENTS.ANIMATION_TOGGLE, (enabled) => {
      this.setAnimationsEnabled(enabled);
    });
  }
  
  // Create notification container
  createNotificationContainer() {
    if (!document.getElementById('notificationContainer')) {
      const container = document.createElement('div');
      container.id = 'notificationContainer';
      container.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 30;
        pointer-events: none;
      `;
      document.body.appendChild(container);
      this.notificationContainer = container;
    }
  }
  
  // Show notification
  showNotification(text, type = 'default') {
    this.notificationQueue.push({ text, type });
    this.processNotificationQueue();
  }
  
  processNotificationQueue() {
    if (this.showingNotification || this.notificationQueue.length === 0) return;
    
    this.showingNotification = true;
    const { text, type } = this.notificationQueue.shift();
    
    const notification = document.createElement('div');
    notification.className = `game-notification notification-${type}`;
    notification.textContent = text;
    
    // Style based on type
    const styles = {
      default: 'background: rgba(0,0,0,0.9); color: white;',
      tspin: 'background: linear-gradient(135deg, #d4a5f5, #b19cd9); color: white;',
      combo: 'background: linear-gradient(135deg, #ffb3ba, #ff9999); color: white;',
      b2b: 'background: linear-gradient(135deg, #a6c0fe, #89a4f7); color: white;',
      perfect: 'background: linear-gradient(135deg, #ffd700, #ffed4e); color: #333;'
    };
    
    notification.style.cssText = `
      ${styles[type] || styles.default}
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 1.2rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: notificationPop 0.8s ease-out;
      white-space: nowrap;
    `;
    
    this.notificationContainer.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'notificationFade 0.3s ease-out forwards';
      setTimeout(() => {
        notification.remove();
        this.showingNotification = false;
        this.processNotificationQueue();
      }, 300);
    }, 800);
  }
  
  // Update combo display
  updateComboDisplay(state) {
    // You can add a combo counter to the UI if desired
    // For now, combos are shown via notifications
  }
  
  // Calculate cell size based on CSS variable
  calculateCellSize() {
    const style = getComputedStyle(document.documentElement);
    return parseInt(style.getPropertyValue('--cell-size')) || 26;
  }
  
  // Update cell size on resize
  updateCellSize() {
    this.cellSize = this.calculateCellSize();
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
    if (this.scoreEl) this.scoreEl.textContent = gameState.score.toLocaleString();
    if (this.levelEl) this.levelEl.textContent = gameState.level;
    if (this.linesEl) this.linesEl.textContent = gameState.lines;
  }
  
  // Render preview piece (4x4 box)
  renderPreview(type) {
    const piece = PIECES[type];
    const preview = document.createElement('div');
    preview.className = 'preview-piece';

    // Create 4x4 grid for preview
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = document.createElement('div');
        cell.className = 'preview-cell';

        if (
          r < piece.shape.length &&
          c < piece.shape[0].length &&
          piece.shape[r][c]
        ) {
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
    
    const upcoming = [...gameState.bag, ...gameState.nextBag].slice(0, Config.VISUAL.NEXT_PIECES_COUNT);
    
    this.nextQueueEl.innerHTML = '';
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
      
      // Gray out if can't hold
      if (!gameState.canHold) {
        this.holdPreviewEl.style.opacity = '0.5';
      } else {
        this.holdPreviewEl.style.opacity = '1';
      }
    } else {
      const empty = document.createElement('div');
      empty.className = 'empty-hold';
      this.holdPreviewEl.appendChild(empty);
      this.holdPreviewEl.style.opacity = '1';
    }
  }
  
  // Show/hide pause overlay
  updatePauseOverlay(paused) {
    if (this.pausedOverlayEl) {
      this.pausedOverlayEl.style.display = paused ? 'flex' : 'none';
    }
  }
  
  // Game over animation with stats
  showGameOver(data) {
    if (this.appEl) {
      this.appEl.classList.add('game-over');
    }
    
    // Show stats if available
    if (data && data.stats) {
      const stats = data.stats;
      // You can add a stats display modal here if desired
      console.log('Game Stats:', stats);
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
    if (this.notificationContainer) {
      this.notificationContainer.remove();
    }
  }
}