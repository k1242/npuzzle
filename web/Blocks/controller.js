// ====== INPUT CONTROLLER ======

import { Config } from './config.js';

// Key mappings for different layouts
const KEY_MAPPINGS = {
  left: ['arrowleft', 'a', 'ф'],
  right: ['arrowright', 'd', 'в'],
  down: ['arrowdown', 's', 'ы'],
  rotate: ['arrowup', 'w', 'ц', 'x'], // Added X for CW rotation
  rotateCC: ['z', 'я', 'ctrl'], // Counter-clockwise rotation
  drop: [' '],
  hold: ['c', 'shift', 'с'],
  pause: ['p', 'escape', 'з']
};

export class InputController {
  constructor(gameEngine, renderer) {
    this.engine = gameEngine;
    this.renderer = renderer;
    
    // Settings
    this.mouseControlEnabled = false;
    this.touchButtonsEnabled = false;
    
    // Keyboard state
    this.keysHeld = {};
    this.dasTimer = null;
    this.arrTimer = null;
    
    // Soft drop repeat
    this.softDropTimer = null;
    
    // Mouse control state
    this.mouseHistory = [];
    this.boardRect = null;
    
    // Touch control state
    this.isTouchDevice = 'ontouchstart' in window;
    
    this.setupControls();
    
    // Subscribe to settings changes
    this.engine.on(Config.EVENTS.MOUSE_CONTROL_TOGGLE, (enabled) => {
      this.setMouseControl(enabled);
    });
    
    this.engine.on(Config.EVENTS.TOUCH_BUTTONS_TOGGLE, (enabled) => {
      this.setTouchButtons(enabled);
    });
  }
  
  setupControls() {
    this.setupKeyboard();
    this.setupMouse();
    this.setupTouch();
    this.setupTouchButtons();
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
  
  // Get current cell size from CSS
  getCellSize() {
    const style = getComputedStyle(document.documentElement);
    return parseInt(style.getPropertyValue('--cell-size')) || 26;
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
        this.startSoftDrop();
        break;
      case 'rotate':
        this.engine.rotatePiece(1); // Clockwise
        break;
      case 'rotateCC':
        this.engine.rotatePiece(-1); // Counter-clockwise
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
      this.stopSoftDrop();
    }
  }
  
  // DAS/ARR implementation according to Tetris Guidelines
  startDAS(dir) {
    const dx = dir === 'left' ? -1 : 1;
    
    // Clear any existing timers
    this.clearDAS();
    
    // Initial move
    if (this.canAcceptInput()) {
      this.engine.movePiece(dx, 0);
    }
    
    // Start DAS timer
    this.dasTimer = setTimeout(() => {
      // Start ARR (Auto Repeat Rate)
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
  
  // Soft drop with proper repeat rate
  startSoftDrop() {
    // Clear any existing timer
    this.stopSoftDrop();
    
    // Initial drop
    if (this.canAcceptInput()) {
      this.engine.manualDropping = true;
      this.engine.dropPiece();
    }
    
    // Continue dropping at ARR rate
    this.softDropTimer = setInterval(() => {
      if (this.canAcceptInput()) {
        this.engine.manualDropping = true;
        this.engine.dropPiece();
      }
    }, Config.TIMING.SOFT_DROP_DELAY);
  }
  
  stopSoftDrop() {
    if (this.softDropTimer) {
      clearInterval(this.softDropTimer);
      this.softDropTimer = null;
    }
    this.engine.manualDropping = false;
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
    
    // Calculate target column using current cell size
    const cellSize = this.getCellSize();
    const mouseCol = Math.floor(avgX / cellSize);
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
    } else if (e.button === 1) { // Middle click
      e.preventDefault();
      this.engine.rotatePiece(1);
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
    const boardWrap = document.querySelector('.board-wrap');
    if (!boardWrap) return;
    
    let touchStartX = null;
    let touchStartY = null;
    let touchStartTime = null;
    
    // Touch start
    boardWrap.addEventListener('touchstart', (e) => {
      // Enable touch buttons on first touch if on mobile
      if (this.isTouchDevice && !this.touchButtonsEnabled) {
        this.engine.emit(Config.EVENTS.FIRST_TOUCH);
      }
      
      if (this.canAcceptInput() && e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }, { passive: false });
    
    // Touch end - detect tap vs swipe
    boardWrap.addEventListener('touchend', (e) => {
      if (!this.canAcceptInput() || touchStartX === null) return;
      
      const touchEndTime = Date.now();
      const touchDuration = touchEndTime - touchStartTime;
      
      // Quick tap for hard drop
      if (touchDuration < 200 && e.changedTouches.length === 1) {
        const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX);
        const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);
        
        if (deltaX < 10 && deltaY < 10) {
          e.preventDefault();
          this.engine.hardDrop();
        }
      }
      
      touchStartX = null;
      touchStartY = null;
      touchStartTime = null;
    });
    
    // Touch move - detect swipes
    boardWrap.addEventListener('touchmove', (e) => {
      if (!this.canAcceptInput() || touchStartX === null) return;
      
      const deltaX = e.touches[0].clientX - touchStartX;
      const deltaY = e.touches[0].clientY - touchStartY;
      
      // Swipe down for soft drop
      if (Math.abs(deltaY) > 30 && Math.abs(deltaY) > Math.abs(deltaX)) {
        if (deltaY > 0 && !this.engine.manualDropping) {
          this.startSoftDrop();
        }
      }
    }, { passive: true });
  }
  
  // ====== TOUCH BUTTON CONTROLS ======
  setupTouchButtons() {
    const touchLeft = document.getElementById('touchLeft');
    const touchRight = document.getElementById('touchRight');
    const touchRotate = document.getElementById('touchRotate');
    const holdBox = document.getElementById('holdBox');
    const mobilePauseBtn = document.getElementById('mobilePauseBtn');
    
    if (touchLeft) {
      touchLeft.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.canAcceptInput()) {
          this.startDAS('left');
        }
      });
      
      touchLeft.addEventListener('touchend', () => {
        this.clearDAS();
      });
    }
    
    if (touchRight) {
      touchRight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.canAcceptInput()) {
          this.startDAS('right');
        }
      });
      
      touchRight.addEventListener('touchend', () => {
        this.clearDAS();
      });
    }
    
    if (touchRotate) {
      let lastTapTime = 0;
      
      touchRotate.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.canAcceptInput()) {
          const currentTime = Date.now();
          const timeDiff = currentTime - lastTapTime;
          
          // Double tap for counter-clockwise rotation
          if (timeDiff < 300) {
            this.engine.rotatePiece(-1);
          } else {
            this.engine.rotatePiece(1);
          }
          
          lastTapTime = currentTime;
        }
      });
    }
    
    // Make hold box clickable
    if (holdBox) {
      const handleHold = (e) => {
        if (this.touchButtonsEnabled && this.canAcceptInput()) {
          e.preventDefault();
          this.engine.holdPiece();
        }
      };
      
      // Use touchstart for mobile, click for desktop
      holdBox.addEventListener('touchstart', handleHold);
      holdBox.addEventListener('click', (e) => {
        // Prevent double execution on devices that fire both events
        if (e.detail === 0) return; // This is a touch event
        handleHold(e);
      });
    }
    
    if (mobilePauseBtn) {
      mobilePauseBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.engine.togglePause();
        
        // Toggle icon
        const pauseIcon = mobilePauseBtn.querySelector('.pause-icon');
        const playIcon = mobilePauseBtn.querySelector('.play-icon');
        const state = this.engine.getState();
        
        if (state.paused) {
          pauseIcon.style.display = 'none';
          playIcon.style.display = 'block';
        } else {
          pauseIcon.style.display = 'block';
          playIcon.style.display = 'none';
        }
      });
    }
    
    // Update pause button icon on pause/resume events
    this.engine.on(Config.EVENTS.GAME_PAUSE, () => {
      const mobilePauseBtn = document.getElementById('mobilePauseBtn');
      if (mobilePauseBtn) {
        const pauseIcon = mobilePauseBtn.querySelector('.pause-icon');
        const playIcon = mobilePauseBtn.querySelector('.play-icon');
        pauseIcon.style.display = 'none';
        playIcon.style.display = 'block';
      }
    });
    
    this.engine.on(Config.EVENTS.GAME_RESUME, () => {
      const mobilePauseBtn = document.getElementById('mobilePauseBtn');
      if (mobilePauseBtn) {
        const pauseIcon = mobilePauseBtn.querySelector('.pause-icon');
        const playIcon = mobilePauseBtn.querySelector('.play-icon');
        pauseIcon.style.display = 'block';
        playIcon.style.display = 'none';
      }
    });
    
    this.engine.on(Config.EVENTS.GAME_START, () => {
      const mobilePauseBtn = document.getElementById('mobilePauseBtn');
      if (mobilePauseBtn) {
        const pauseIcon = mobilePauseBtn.querySelector('.pause-icon');
        const playIcon = mobilePauseBtn.querySelector('.play-icon');
        pauseIcon.style.display = 'block';
        playIcon.style.display = 'none';
      }
    });
  }
  
  // Settings
  setMouseControl(enabled) {
    this.mouseControlEnabled = enabled;
    document.body.classList.toggle('mouse-control-enabled', enabled);
    this.mouseHistory = [];
    this.boardRect = null;
  }
  
  setTouchButtons(enabled) {
    this.touchButtonsEnabled = enabled;
    document.body.classList.toggle('touch-buttons-enabled', enabled);
  }
  
  // Reset input state
  reset() {
    this.clearDAS();
    this.stopSoftDrop();
    this.keysHeld = {};
    this.mouseHistory = [];
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