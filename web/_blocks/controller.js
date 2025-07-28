// ====== INPUT CONTROLLER ======

import { GameEvents } from './events.js';

const DAS_DELAY = 150;
const ARR_DELAY = 30;

export class InputController {
  constructor(gameEngine, renderer) {
    this.engine = gameEngine;
    this.renderer = renderer;
    
    // Settings
    this.mouseControlEnabled = false;
    
    // Keyboard state
    this.keysHeld = {};
    
    // Timers
    this.dasTimer = null;
    this.arrTimer = null;
    
    // Mouse control state
    this.mouseState = {
      boardRect: null,
      history: [], // Array of {x: number, time: number}
      smoothingWindow: 50 // milliseconds
    };
    
    // Touch control state
    this.touchState = {
      startX: null,
      startY: null,
      currentX: null,
      currentY: null,
      pieceStartX: null,
      isMoving: false,
      touchId: null
    };
    
    this.setupControls();
    
    // Subscribe to settings changes
    this.engine.on(GameEvents.MOUSE_CONTROL_TOGGLE, (enabled) => {
      this.setMouseControl(enabled);
    });
  }
  
  setupControls() {
    this.setupKeyboard();
    this.setupMouse();
    this.setupTouch();
  }
  
  // Keyboard controls
  setupKeyboard() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }
  
  handleKeyDown(e) {
    const key = e.key.toLowerCase();
    if (this.keysHeld[key]) return;
    this.keysHeld[key] = true;
    
    const state = this.engine.getState();
    if (state.gameOver || this.engine.clearingLines || this.engine.hardDropping) return;
    
    switch(key) {
      case 'arrowleft':
      case 'a':
      case 'ф': // Russian 'a'
        e.preventDefault();
        this.startDAS('left');
        break;
      case 'arrowright':
      case 'd':
      case 'в': // Russian 'd'
        e.preventDefault();
        this.startDAS('right');
        break;
      case 'arrowdown':
      case 's':
      case 'ы': // Russian 's'
        e.preventDefault();
        this.engine.manualDropping = true;
        this.engine.dropPiece();
        break;
      case 'arrowup':
      case 'w':
      case 'ц': // Russian 'w'
        e.preventDefault();
        this.engine.rotatePiece();
        break;
      case ' ':
        e.preventDefault();
        this.engine.hardDrop();
        break;
      case 'c':
      case 'с': // Russian 'c'
        e.preventDefault();
        this.engine.holdPiece();
        break;
      case 'p':
      case 'з': // Russian 'p'
        this.engine.togglePause();
        break;
    }
  }
  
  handleKeyUp(e) {
    const key = e.key.toLowerCase();
    this.keysHeld[key] = false;
    
    if (['arrowleft', 'arrowright', 'a', 'd', 'ф', 'в'].includes(key)) {
      if (this.dasTimer) {
        clearTimeout(this.dasTimer);
        this.dasTimer = null;
      }
      if (this.arrTimer) {
        clearInterval(this.arrTimer);
        this.arrTimer = null;
      }
    }
    
    if (['arrowdown', 's', 'ы'].includes(key)) {
      this.engine.manualDropping = false;
    }
  }
  
  startDAS(dir) {
    const dx = dir === 'left' ? -1 : 1;
    this.engine.movePiece(dx, 0);
    
    if (this.dasTimer) {
      clearTimeout(this.dasTimer);
      this.dasTimer = null;
    }
    if (this.arrTimer) {
      clearInterval(this.arrTimer);
      this.arrTimer = null;
    }
    
    this.dasTimer = setTimeout(() => {
      this.arrTimer = setInterval(() => {
        const state = this.engine.getState();
        if (!state.paused && !this.engine.clearingLines) {
          this.engine.movePiece(dx, 0);
        }
      }, ARR_DELAY);
    }, DAS_DELAY);
  }
  
  // Mouse controls
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
    const state = this.engine.getState();
    if (!this.mouseControlEnabled || !state.currentPiece || 
        state.gameOver || state.paused) return;
    
    // Only control if mouse is over the board
    if (!this.isMouseOverBoard(e)) return;
    
    // Update board rect if needed
    if (!this.mouseState.boardRect) {
      this.mouseState.boardRect = this.renderer.getBoardRect();
    }
    
    // Add current position to history
    const currentTime = Date.now();
    const relativeX = e.clientX - this.mouseState.boardRect.left;
    this.mouseState.history.push({ x: relativeX, time: currentTime });
    
    // Remove positions older than smoothing window
    const cutoffTime = currentTime - this.mouseState.smoothingWindow;
    this.mouseState.history = this.mouseState.history.filter(entry => entry.time > cutoffTime);
    
    // Calculate average position
    let avgX = relativeX;
    if (this.mouseState.history.length > 0) {
      const sumX = this.mouseState.history.reduce((sum, entry) => sum + entry.x, 0);
      avgX = sumX / this.mouseState.history.length;
    }
    
    // Calculate which column based on averaged position
    const mouseCol = Math.floor(avgX / this.renderer.cellSize);
    
    // Get piece bounds to adjust for empty columns on the left
    const bounds = this.engine.getPieceBounds(state.currentPiece);
    
    // Place piece so its leftmost block is one column to the left of the mouse
    const targetX = mouseCol - bounds.left - 1;
    
    this.engine.movePieceToX(targetX);
  }
  
  handleMouseClick(e) {
    const state = this.engine.getState();
    if (!this.mouseControlEnabled || state.gameOver || state.paused) return;
    
    // Only handle clicks on the board
    if (!this.isMouseOverBoard(e)) return;
    
    if (e.button === 0) { // Left click
      this.engine.hardDrop();
    } else if (e.button === 2) { // Right click
      e.preventDefault();
      this.engine.holdPiece();
    }
  }
  
  handleWheel(e) {
    const state = this.engine.getState();
    if (!this.mouseControlEnabled || state.gameOver || state.paused) return;
    
    // Only handle wheel on the board
    if (!this.isMouseOverBoard(e)) return;
    
    e.preventDefault();
    
    if (e.deltaY < 0) {
      this.engine.rotatePiece(1); // Scroll up - rotate clockwise
    } else if (e.deltaY > 0) {
      this.engine.rotatePiece(-1); // Scroll down - rotate counterclockwise
    }
  }
  
  // Touch controls
  setupTouch() {
    const gameContainer = document.querySelector('.game-container');
    if (!gameContainer) return;
    
    gameContainer.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    gameContainer.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    gameContainer.addEventListener('touchend', (e) => this.handleTouchEnd(e));
  }
  
  handleTouchStart(e) {
    const state = this.engine.getState();
    if (state.gameOver || state.paused) return;
    
    const touch = e.touches[0];
    this.touchState.startX = touch.clientX;
    this.touchState.startY = touch.clientY;
    this.touchState.currentX = touch.clientX;
    this.touchState.currentY = touch.clientY;
    this.touchState.touchId = touch.identifier;
    this.touchState.isMoving = false;
    
    if (state.currentPiece) {
      this.touchState.pieceStartX = state.currentPiece.x;
    }
  }
  
  handleTouchMove(e) {
    const state = this.engine.getState();
    if (!this.touchState.startX || state.gameOver || state.paused) return;
    
    const touch = Array.from(e.touches).find(t => t.identifier === this.touchState.touchId);
    if (!touch) return;
    
    e.preventDefault();
    
    this.touchState.currentX = touch.clientX;
    this.touchState.currentY = touch.clientY;
    
    const deltaX = this.touchState.currentX - this.touchState.startX;
    const deltaY = this.touchState.currentY - this.touchState.startY;
    
    // Determine if this is a swipe or drag
    if (!this.touchState.isMoving && Math.abs(deltaX) > 10) {
      this.touchState.isMoving = true;
    }
    
    // Move piece horizontally if dragging
    if (this.touchState.isMoving && state.currentPiece) {
      // Calculate how many cells to move based on drag distance
      const cellSize = window.innerWidth <= 400 ? 25 : 30; // Adjusted for narrow screens
      const cellsMoved = Math.round(deltaX / cellSize);
      const targetX = this.touchState.pieceStartX + cellsMoved;
      this.engine.movePieceToX(targetX);
    }
  }
  
  handleTouchEnd(e) {
    const state = this.engine.getState();
    if (!this.touchState.startX || state.gameOver || state.paused) return;
    
    const deltaX = this.touchState.currentX - this.touchState.startX;
    const deltaY = this.touchState.currentY - this.touchState.startY;
    
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    // If it wasn't a drag movement, check for swipes/taps
    if (!this.touchState.isMoving) {
      if (absY > 50 && deltaY > 0 && absY > absX * 1.5) {
        // Swipe down - hard drop
        this.engine.hardDrop();
      } else if (absY > 50 && deltaY < 0 && absY > absX * 1.5) {
        // Swipe up - hold
        this.engine.holdPiece();
      } else if (absX < 10 && absY < 10) {
        // Tap - rotate
        this.engine.rotatePiece();
      }
    }
    
    // Reset touch state
    this.touchState.startX = null;
    this.touchState.startY = null;
    this.touchState.currentX = null;
    this.touchState.currentY = null;
    this.touchState.pieceStartX = null;
    this.touchState.isMoving = false;
    this.touchState.touchId = null;
  }
  
  // Settings
  setMouseControl(enabled) {
    this.mouseControlEnabled = enabled;
    document.body.classList.toggle('mouse-control-enabled', enabled);
    
    // Clear mouse history when toggling
    this.mouseState.history = [];
  }
  
  // Reset input state
  reset() {
    // Clear timers
    if (this.dasTimer) {
      clearTimeout(this.dasTimer);
      this.dasTimer = null;
    }
    if (this.arrTimer) {
      clearInterval(this.arrTimer);
      this.arrTimer = null;
    }
    
    // Clear input states
    this.keysHeld = {};
    this.mouseState.history = [];
    this.touchState = {
      startX: null,
      startY: null,
      currentX: null,
      currentY: null,
      pieceStartX: null,
      isMoving: false,
      touchId: null
    };
  }
  
  // Update board rect on resize
  updateBoardRect() {
    this.mouseState.boardRect = null;
    this.mouseState.history = [];
  }
  
  // Called when a new piece spawns
  onNewPiece() {
    this.mouseState.history = [];
  }
}