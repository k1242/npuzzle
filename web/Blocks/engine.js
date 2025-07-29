// ====== GAME ENGINE ======

import { Config } from './config.js';
import { StorageManager } from './storage.js';

// Pieces with SRS spawn positions
export const PIECES = {
  I: { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], x: 3, y: -1 },
  O: { shape: [[0,1,1,0],[0,1,1,0],[0,0,0,0]], x: 4, y: -1 },
  T: { shape: [[0,1,0],[1,1,1],[0,0,0]], x: 3, y: 0 },
  S: { shape: [[0,1,1],[1,1,0],[0,0,0]], x: 3, y: 0 },
  Z: { shape: [[1,1,0],[0,1,1],[0,0,0]], x: 3, y: 0 },
  J: { shape: [[1,0,0],[1,1,1],[0,0,0]], x: 3, y: 0 },
  L: { shape: [[0,0,1],[1,1,1],[0,0,0]], x: 3, y: 0 }
};

// SRS wall kicks
const WALL_KICKS = {
  normal: [
    [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], // 0->1
    [[0,0],[1,0],[1,-1],[0,2],[1,2]],     // 1->0
    [[0,0],[1,0],[1,-1],[0,2],[1,2]],     // 1->2
    [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], // 2->1
    [[0,0],[1,0],[1,1],[0,-2],[1,-2]],    // 2->3
    [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],  // 3->2
    [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],  // 3->0
    [[0,0],[1,0],[1,1],[0,-2],[1,-2]]     // 0->3
  ],
  I: [
    [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],   // 0->1
    [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],   // 1->0
    [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],   // 1->2
    [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],   // 2->1
    [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],   // 2->3
    [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],   // 3->2
    [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],   // 3->0
    [[0,0],[-1,0],[2,0],[-1,2],[2,-1]]    // 0->3
  ]
};

export class GameEngine {
  constructor() {
    // Event system
    this.events = {};
    
    // Game state
    this.board = [];
    this.bag = [];
    this.nextBag = [];
    this.currentPiece = null;
    this.ghostPiece = null;
    this.heldPiece = null;
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.highScore = 0;
    this.gameOver = false;
    this.paused = false;
    this.clearingLines = false;
    this.hardDropping = false;
    this.moveCount = 0;
    this.canHold = true;
    this.manualDropping = false;
    
    // Timers
    this.dropTimer = null;
    this.lockTimer = null;
    
    // Storage manager
    this.storage = new StorageManager(Config);
    this.highScore = this.storage.loadHighScore();
  }
  
  // Event system methods
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }
  
  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }
  
  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(data));
  }
  
  // Helper to check if we can perform actions
  canPerformAction() {
    return this.currentPiece && !this.gameOver && !this.paused && 
           !this.clearingLines && !this.hardDropping;
  }
  
  // 7-bag randomizer
  generateBag() {
    const types = Object.keys(PIECES);
    const bag = [...types];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  }
  
  getNextPiece() {
    if (this.bag.length === 0) {
      this.bag = this.nextBag.length ? this.nextBag : this.generateBag();
      this.nextBag = this.generateBag();
    }
    const type = this.bag.shift();
    const piece = PIECES[type];
    return {
      type,
      shape: piece.shape.map(row => [...row]),
      x: piece.x,
      y: piece.y,
      rotation: 0
    };
  }
  
  // Board management
  initBoard() {
    this.board = Array(Config.BOARD.ROWS).fill().map(() => Array(Config.BOARD.COLS).fill(0));
  }
  
  isValidPosition(piece, dx = 0, dy = 0) {
    return piece.shape.every((row, r) => 
      row.every((val, c) => {
        if (!val) return true;
        const newX = piece.x + c + dx;
        const newY = piece.y + r + dy;
        return newX >= 0 && newX < Config.BOARD.COLS && newY < Config.BOARD.ROWS && 
               (newY < 0 || !this.board[newY][newX]);
      })
    );
  }
  
  // Rotation
  rotateMatrix(matrix) {
    const n = matrix.length;
    const rotated = Array(n).fill().map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        rotated[j][n-1-i] = matrix[i][j];
      }
    }
    return rotated;
  }
  
  rotatePiece(direction = 1) {
    if (!this.canPerformAction()) return;
    
    const oldRot = this.currentPiece.rotation;
    const newRot = (oldRot + direction + 4) % 4;
    
    // Create rotated piece
    let rotated = {...this.currentPiece};
    
    // Apply rotation based on direction
    if (direction === 1) {
      rotated.shape = this.rotateMatrix(this.currentPiece.shape);
    } else {
      // Rotate counterclockwise (3 times clockwise)
      rotated.shape = this.rotateMatrix(
        this.rotateMatrix(this.rotateMatrix(this.currentPiece.shape))
      );
    }
    
    rotated.rotation = newRot;
    
    // Get wall kicks
    const kickData = this.currentPiece.type === 'I' ? WALL_KICKS.I : WALL_KICKS.normal;
    let kickIndex;
    
    if (direction === 1) {
      kickIndex = oldRot * 2;
    } else {
      kickIndex = ((oldRot + 3) % 4) * 2 + 1;
    }
    
    const kicks = kickData[kickIndex] || [[0,0]];
    
    // Try each kick
    for (const [dx, dy] of kicks) {
      rotated.x = this.currentPiece.x + dx;
      rotated.y = this.currentPiece.y + dy;
      if (this.isValidPosition(rotated)) {
        this.currentPiece = rotated;
        this.moveCount++;
        this.resetLockDelay();
        this.updateGhost();
        
        this.emitStateUpdate();
        this.saveState();
        return;
      }
    }
  }
  
  // Movement
  movePiece(dx, dy) {
    if (!this.canPerformAction()) return false;
    
    if (this.isValidPosition(this.currentPiece, dx, dy)) {
      this.currentPiece.x += dx;
      this.currentPiece.y += dy;
      
      if (dx !== 0) {
        this.moveCount++;
        if (!this.isValidPosition(this.currentPiece, 0, 1)) {
          this.resetLockDelay();
        }
      }
      
      this.updateGhost();
      this.emitStateUpdate();
      this.saveState();
      return true;
    }
    return false;
  }
  
  // Move piece to specific X position
  movePieceToX(targetX) {
    if (!this.canPerformAction()) return;
    
    // Find piece bounds
    let leftmost = this.currentPiece.shape[0].length;
    let rightmost = -1;
    
    this.currentPiece.shape.forEach(row => {
      row.forEach((val, c) => {
        if (val) {
          leftmost = Math.min(leftmost, c);
          rightmost = Math.max(rightmost, c);
        }
      });
    });
    
    // Clamp target position
    const minX = -leftmost;
    const maxX = Config.BOARD.COLS - 1 - rightmost;
    const clampedX = Math.max(minX, Math.min(maxX, targetX));
    
    // Move piece
    if (this.isValidPosition({...this.currentPiece, x: clampedX})) {
      this.currentPiece.x = clampedX;
      this.moveCount++;
      if (!this.isValidPosition(this.currentPiece, 0, 1)) {
        this.resetLockDelay();
      }
      this.updateGhost();
      
      this.emitStateUpdate();
      this.saveState();
    }
  }
  
  // Drop piece
  dropPiece() {
    if (this.hardDropping || !this.currentPiece) return;
    
    if (this.movePiece(0, 1)) {
      if (this.manualDropping) {
        this.score += Config.SCORING.SOFT_DROP;
        this.emitStateUpdate();
      }
    } else {
      this.lockPiece();
    }
  }
  
  // Hard drop
  hardDrop() {
    if (!this.canPerformAction()) return;
    
    this.hardDropping = true;
    
    // Calculate drop distance
    let dropDist = 0;
    let testPiece = {...this.currentPiece};
    
    while (this.isValidPosition(testPiece, 0, 1)) {
      testPiece.y++;
      dropDist++;
    }
    
    if (dropDist > 0) {
      // Emit hard drop event with distance
      this.emit(Config.EVENTS.HARD_DROP_START, {
        piece: this.currentPiece,
        distance: dropDist,
        targetY: testPiece.y
      });
    } else {
      // Already at bottom
      this.hardDropping = false;
      this.lockPiece();
    }
  }
  
  // Complete hard drop (called by renderer)
  completeHardDrop(dropDist) {
    this.score += dropDist * Config.SCORING.HARD_DROP;
    this.emitStateUpdate();
    this.hardDropping = false;
    this.lockPiece();
  }
  
  // Hold piece
  holdPiece() {
    if (!this.canPerformAction() || !this.canHold) return;
    
    this.canHold = false;
    
    if (this.heldPiece) {
      // Swap with held piece
      const temp = this.currentPiece.type;
      this.currentPiece = {
        ...PIECES[this.heldPiece],
        shape: PIECES[this.heldPiece].shape.map(row => [...row]),
        x: PIECES[this.heldPiece].x,
        y: PIECES[this.heldPiece].y,
        type: this.heldPiece,
        rotation: 0
      };
      this.heldPiece = temp;
    } else {
      // Hold current piece and get next
      this.heldPiece = this.currentPiece.type;
      this.currentPiece = this.getNextPiece();
    }
    
    this.updateGhost();
    this.emitStateUpdate();
    this.saveState();
  }
  
  // Ghost piece
  updateGhost() {
    if (!this.currentPiece) return;
    this.ghostPiece = {...this.currentPiece};
    while (this.isValidPosition(this.ghostPiece, 0, 1)) {
      this.ghostPiece.y++;
    }
  }
  
  // Lock delay
  resetLockDelay() {
    if (this.moveCount < Config.MOVEMENT.MAX_MOVES_BEFORE_LOCK && this.currentPiece) {
      if (this.lockTimer) {
        clearTimeout(this.lockTimer);
        this.lockTimer = null;
      }
      this.lockTimer = setTimeout(() => {
        if (this.currentPiece && !this.isValidPosition(this.currentPiece, 0, 1)) {
          this.lockPiece();
        }
      }, Config.TIMING.LOCK_DELAY);
    }
  }
  
  // Lock piece
  lockPiece() {
    if (!this.currentPiece) return;
    
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
    
    const {shape, x, y, type} = this.currentPiece;
    
    // Add piece to board
    shape.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val && y + r >= 0) {
          this.board[y + r][x + c] = type;
        }
      });
    });
    
    // Clear current piece before checking lines
    this.currentPiece = null;
    this.canHold = true;
    
    // Check and clear lines
    this.clearLines();
  }
  
  // Clear lines
  clearLines() {
    const linesToClear = [];
    
    // Find completed lines
    for (let r = 0; r < Config.BOARD.ROWS; r++) {
      if (this.board[r].every(cell => cell !== 0)) {
        linesToClear.push(r);
      }
    }
    
    if (linesToClear.length === 0) {
      this.spawnNextPiece();
      return;
    }
    
    this.clearingLines = true;
    
    // Emit line clear event with callback
    this.emit(Config.EVENTS.LINES_CLEARED, {
      lines: linesToClear,
      callback: () => {
        this.updateBoardAfterClear(linesToClear);
      }
    });
  }
  
  // Update board after line clear
  updateBoardAfterClear(linesToClear) {
    // Remove cleared lines and add empty lines at top
    linesToClear.sort((a, b) => b - a).forEach(row => {
      this.board.splice(row, 1);
    });
    
    while (this.board.length < Config.BOARD.ROWS) {
      this.board.unshift(Array(Config.BOARD.COLS).fill(0));
    }
    
    // Update score
    this.score += Config.SCORING.LINES[linesToClear.length] * this.level;
    this.lines += linesToClear.length;
    
    // Check level up
    if (this.lines >= this.level * Config.SCORING.LINES_PER_LEVEL) {
      this.level++;
      this.updateDropSpeed();
    }
    
    this.emitStateUpdate();
    this.clearingLines = false;
    this.saveState();
    this.spawnNextPiece();
  }
  
  // Spawn next piece
  spawnNextPiece() {
    // Don't spawn if hard dropping is in progress or if game is over
    if (this.hardDropping || this.gameOver) {
      if (!this.gameOver) {
        setTimeout(() => this.spawnNextPiece(), 50);
      }
      return;
    }
    
    this.moveCount = 0;
    this.currentPiece = this.getNextPiece();
    this.updateGhost();
    
    if (!this.isValidPosition(this.currentPiece)) {
      this.endGame();
    } else {
      this.emitStateUpdate();
      this.emit(Config.EVENTS.PIECE_SPAWNED, this.getState());
      this.saveState();
    }
  }
  
  // Update drop speed
  updateDropSpeed() {
    if (this.dropTimer) {
      clearInterval(this.dropTimer);
      this.dropTimer = null;
    }
    const speed = Config.getDropSpeed(this.level);
    this.dropTimer = setInterval(() => {
      if (!this.gameOver && !this.paused && !this.clearingLines && !this.hardDropping) {
        this.manualDropping = false;
        this.dropPiece();
      }
    }, speed);
  }
  
  // Game control
  togglePause() {
    if (this.gameOver) return;
    
    this.paused = !this.paused;
    
    if (this.paused) {
      if (this.dropTimer) {
        clearInterval(this.dropTimer);
        this.dropTimer = null;
      }
      if (this.lockTimer) {
        clearTimeout(this.lockTimer);
        this.lockTimer = null;
      }
      this.emit(Config.EVENTS.GAME_PAUSE);
    } else {
      this.updateDropSpeed();
      if (this.currentPiece && !this.isValidPosition(this.currentPiece, 0, 1)) {
        this.resetLockDelay();
      }
      this.emit(Config.EVENTS.GAME_RESUME);
    }
    
    this.saveState();
  }
  
  startNewGame() {
    // Clear all timers first
    if (this.dropTimer) {
      clearInterval(this.dropTimer);
      this.dropTimer = null;
    }
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
    
    this.storage.clearGameState();
    
    // Reset state
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.gameOver = false;
    this.paused = false;
    this.clearingLines = false;
    this.hardDropping = false;
    this.moveCount = 0;
    this.canHold = true;
    this.heldPiece = null;
    this.bag = this.generateBag();
    this.nextBag = this.generateBag();
    
    // Initialize game
    this.initBoard();
    this.currentPiece = this.getNextPiece();
    this.updateGhost();
    
    // Emit start event
    this.emit(Config.EVENTS.GAME_START);
    this.emitStateUpdate();
    
    // Start drop timer
    this.updateDropSpeed();
  }
  
  endGame() {
    this.gameOver = true;
    
    // Clear all timers
    if (this.dropTimer) {
      clearInterval(this.dropTimer);
      this.dropTimer = null;
    }
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
    
    this.storage.clearGameState();
    
    // Save high score if needed
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.storage.saveHighScore(this.highScore);
    }
    
    this.emit(Config.EVENTS.GAME_OVER);
  }
  
  // State management
  saveState() {
    this.storage.saveGameState(this.getState());
  }
  
  loadState() {
    const savedState = this.storage.loadGameState();
    if (!savedState) return false;
    
    try {
      Object.assign(this, savedState);
      
      // Restore timers if not paused
      if (!this.paused) {
        this.updateDropSpeed();
        if (this.currentPiece && !this.isValidPosition(this.currentPiece, 0, 1)) {
          this.resetLockDelay();
        }
      }
      
      return true;
    } catch (e) {
      console.error('Failed to load game state:', e);
      return false;
    }
  }
  
  // Emit unified state update
  emitStateUpdate() {
    this.emit(Config.EVENTS.STATE_UPDATE, this.getState());
  }
  
  // Get state for rendering
  getState() {
    return {
      board: this.board,
      currentPiece: this.currentPiece,
      ghostPiece: this.ghostPiece,
      heldPiece: this.heldPiece,
      score: this.score,
      level: this.level,
      lines: this.lines,
      gameOver: this.gameOver,
      paused: this.paused,
      bag: this.bag,
      nextBag: this.nextBag,
      canHold: this.canHold
    };
  }
}