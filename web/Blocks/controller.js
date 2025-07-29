// ====== INPUT CONTROLLER ======

import { Config } from './config.js';

// Key mappings for different layouts
const KEY_MAPPINGS = {
  left: ['arrowleft', 'a', 'ф'],
  right: ['arrowright', 'd', 'в'],
  down: ['arrowdown', 's', 'ы'],
  rotate: ['arrowup', 'w', 'ц'],
  drop: [' '],
  hold: ['c', 'с'],
  pause: ['p', 'з']
};

export class InputController {
  constructor(gameEngine, renderer) {
    this.engine = gameEngine;
    this.renderer = renderer;
    
    // Settings
    this.mouseControlEnabled = false;
    
    // Keyboard state
    this.keysHeld = {};
    this.dasTimer = null;
    this.arrTimer = null;
    
    // Mouse control state
    this.mouseHistory = [];
    this.boardRect = null;
    
    // Touch control state
    this.touchStartX = null;
    this.touchStartY = null;
    this.pieceStartX = null;
    
    this.setupControls();
    
    // Subscribe to settings changes
    this.engine.on(Config.EVENTS.MOUSE_CONTROL_TOGGLE, (enabled) => {
      this.setMouseControl(enabled);
    });
  }
  
  setupControls() {
    this.setupKeyboard();
    this.setupMouse();
    this.setupTouch();
  }
  
  // Check if game accepts input
  canAcceptInput() {
    const state = this.engine.getState();
    return state.currentPiece && !state.gameOver && !state.paused && 
           !this.engine.clearingLines && !this.engine.hardDropping;
  }
  
  // Get action from key
  getActionFromKey(key) {
    const lowerKey = key.toLowerCase();
    for (const [action, keys] of Object.entries(KEY_MAPPINGS)) {
      if (keys.includes(lowerKey)) return action;
    }
    return null;
  }
  
  // ====== KEYBOARD CONTROLS ======
  setupKeyboard() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }
  
  handleKeyDown(e) {
    const action = this.getActionFromKey(e.key);
    if (!action) return;
    
    if (this.keysHeld[action]) return;
    this.keysHeld[action] = true;
    
    // Pause works even when game is over
    if (action === 'pause') {
      this.engine.togglePause();
      return;
    }
    
    if (!this.canAcceptInput()) return;
    
    e.preventDefault();
    
    switch(action) {
      case 'left':
        this.startDAS('left');
        break;
      case 'right':
        this.startDAS('right');
        break;
      case 'down':
        this.engine.manualDropping = true;
        this.engine.dropPiece();
        break;
      case 'rotate':
        this.engine.rotatePiece();
        break;
      case 'drop':
        this.engine.hardDrop();
        break;
      case 'hold':
        this.engine.holdPiece();
        break;
    }
  }
  
  handleKeyUp(e) {
    const action = this.getActionFromKey(e.key);
    if (!action) return;
    
    this.keysHeld[action] = false;
    
    if (action === 'left' || action === 'right') {
      this.clearDAS();
    } else if (action === 'down') {
      this.engine.manualDropping = false;
    }
  }
  
  startDAS(dir) {
    const dx = dir === 'left' ? -1 : 1;
    this.engine.movePiece(dx, 0);
    
    this.clearDAS();
    
    this.dasTimer = setTimeout(() => {
      this.arrTimer = setInterval(() => {
        if (this.canAcceptInput()) {
          this.engine.movePiece(dx, 0);
        }
      }, Config.TIMING.ARR_DELAY);
    }, Config.TIMING.DAS_DELAY);
  }
  
  clearDAS() {
    if (this.dasTimer) {
      clearTimeout(this.dasTimer);
      this.dasTimer = null;
    }
    if (this.arrTimer) {
      clearInterval(this.arrTimer);
      this.arrTimer = null;
    }
  }
  
  // ====== MOUSE CONTROLS ======
  setupMouse() {
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mousedown', (e) => this.handleMouseClick(e));
    document.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
    
    // Block context menu only on the board wrap when mouse control is enabled
    const boardWrap = document.querySelector('.board-wrap');
    if (boardWrap) {
      boardWrap.addEventListener('contextmenu', (e) => {
        if (this.mouseControlEnabled) {
          e.preventDefault();
        }
      });
    }
  }
  
  isMouseOverBoard(e) {
    const boardWrap = document.querySelector('.board-wrap');
    if (!boardWrap) return false;
    
    const rect = boardWrap.getBoundingClientRect();
    return e.clientX >= rect.left && 
           e.clientX <= rect.right && 
           e.clientY >= rect.top && 
           e.clientY <= rect.bottom;
  }
  
  handleMouseMove(e) {
    if (!this.mouseControlEnabled || !this.canAcceptInput()) return;
    if (!this.isMouseOverBoard(e)) return;
    
    // Update board rect if needed
    if (!this.boardRect) {
      this.boardRect = this.renderer.getBoardRect();
    }
    
    // Add to history for smoothing
    const now = Date.now();
    const relativeX = e.clientX - this.boardRect.left;
    this.mouseHistory.push({ x: relativeX, time: now });
    
    // Keep only recent history
    const cutoff = now - Config.TIMING.MOUSE_SMOOTHING_WINDOW;
    this.mouseHistory = this.mouseHistory.filter(h => h.time > cutoff);
    
    // Calculate average position
    const avgX = this.mouseHistory.reduce((sum, h) => sum + h.x, 0) / this.mouseHistory.length;
    
    // Calculate target column
    const mouseCol = Math.floor(avgX / this.renderer.cellSize);
    const targetX = mouseCol - 1; // Place piece one column to the left
    
    this.engine.movePieceToX(targetX);
  }
  
  handleMouseClick(e) {
    if (!this.mouseControlEnabled || !this.canAcceptInput()) return;
    if (!this.isMouseOverBoard(e)) return;
    
    if (e.button === 0) { // Left click
      this.engine.hardDrop();
    } else if (e.button === 2) { // Right click
      e.preventDefault();
      this.engine.holdPiece();
    }
  }
  
  handleWheel(e) {
    if (!this.mouseControlEnabled || !this.canAcceptInput()) return;
    if (!this.isMouseOverBoard(e)) return;
    
    e.preventDefault();
    
    if (e.deltaY < 0) {
      this.engine.rotatePiece(1); // Scroll up - rotate clockwise
    } else if (e.deltaY > 0) {
      this.engine.rotatePiece(-1); // Scroll down - rotate counterclockwise
    }
  }
  
  // ====== TOUCH CONTROLS ======
  setupTouch() {
    const gameContainer = document.querySelector('.game-container');
    if (!gameContainer) return;
    
    gameContainer.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    gameContainer.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    gameContainer.addEventListener('touchend', (e) => this.handleTouchEnd(e));
  }
  
  handleTouchStart(e) {
    if (!this.canAcceptInput()) return;
    
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    
    const state = this.engine.getState();
    if (state.currentPiece) {
      this.pieceStartX = state.currentPiece.x;
    }
  }
  
  handleTouchMove(e) {
    if (!this.touchStartX || !this.canAcceptInput()) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.touchStartX;
    
    // Simple drag to move piece
    if (this.pieceStartX !== null) {
      const cellSize = window.innerWidth <= 400 ? 22 : 28;
      const cellsMoved = Math.round(deltaX / cellSize);
      const targetX = this.pieceStartX + cellsMoved;
      this.engine.movePieceToX(targetX);
    }
  }
  
  handleTouchEnd(e) {
    if (!this.touchStartX || !this.canAcceptInput()) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    // Check for swipes/taps only if not dragging
    if (absX < Config.TIMING.TOUCH_MOVE_THRESHOLD) {
      if (absY > Config.TIMING.TOUCH_SWIPE_THRESHOLD && deltaY > 0) {
        // Swipe down - hard drop
        this.engine.hardDrop();
      } else if (absY > Config.TIMING.TOUCH_SWIPE_THRESHOLD && deltaY < 0) {
        // Swipe up - hold
        this.engine.holdPiece();
      } else if (absX < 10 && absY < 10) {
        // Tap - rotate
        this.engine.rotatePiece();
      }
    }
    
    // Reset touch state
    this.touchStartX = null;
    this.touchStartY = null;
    this.pieceStartX = null;
  }
  
  // Settings
  setMouseControl(enabled) {
    this.mouseControlEnabled = enabled;
    document.body.classList.toggle('mouse-control-enabled', enabled);
    this.mouseHistory = [];
    this.boardRect = null;
  }
  
  // Reset input state
  reset() {
    this.clearDAS();
    this.keysHeld = {};
    this.mouseHistory = [];
    this.touchStartX = null;
    this.touchStartY = null;
    this.pieceStartX = null;
  }
  
  // Update board rect on resize
  updateBoardRect() {
    this.boardRect = null;
    this.mouseHistory = [];
  }
  
  // Called when a new piece spawns
  onNewPiece() {
    this.mouseHistory = [];
  }
}