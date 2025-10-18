// ====== GAME ENGINE ======

// ====== GAME ENGINE ======

import { Config } from './config.js';
import { StorageManager } from './storage.js';

/** 4x4 rotation states per piece (SRS-friendly).
 * The shapes for J, L, S, Z, T are placed in the top-left 3×3 area of the 4×4 box,
 * so existing T-Spin detection that checks a 3×3 box at (x,y) continues to work.
 * O piece keeps identical 4 states (we do not rotate its mask), kicks = [[0,0]].
 */
export const SHAPES = {
  I: [
    [ [0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0] ],
    [ [0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0] ],
    [ [0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0] ],
    [ [0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0] ],
  ],
  O: [
    [ [0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0] ],
    [ [0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0] ],
    [ [0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0] ],
    [ [0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0] ],
  ],
  T: [
    [ [0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0] ],
    [ [0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0] ],
    [ [0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0] ],
    [ [0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0] ],
  ],
  S: [
    [ [0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0] ],
    [ [0,1,0,0],[0,1,1,0],[0,0,1,0],[0,0,0,0] ],
    [ [0,0,0,0],[0,1,1,0],[1,1,0,0],[0,0,0,0] ],
    [ [1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0] ],
  ],
  Z: [
    [ [1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0] ],
    [ [0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0] ],
    [ [0,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,0,0] ],
    [ [0,1,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0] ],
  ],
  J: [
    [ [1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0] ],
    [ [0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0] ],
    [ [0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0] ],
    [ [0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0] ],
  ],
  L: [
    [ [0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0] ],
    [ [0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0] ],
    [ [0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0] ],
    [ [1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0] ],
  ],
};

/** Spawn positions (SRS-ish). Keep your original x/y choices. */
export const PIECES = {
  I: { shape: SHAPES.I[0], x: 3, y: -1 },
  O: { shape: SHAPES.O[0], x: 4, y: -1 },
  T: { shape: SHAPES.T[0], x: 3, y: 0 },
  S: { shape: SHAPES.S[0], x: 3, y: 0 },
  Z: { shape: SHAPES.Z[0], x: 3, y: 0 },
  J: { shape: SHAPES.J[0], x: 3, y: 0 },
  L: { shape: SHAPES.L[0], x: 3, y: 0 },
};

// SRS wall kicks
const WALL_KICKS = {
  normal: [
    [[0,0],[-1,0],[-1,-1],[0, 2],[-1, 2]], // 0->1
    [[0,0],[ 1,0],[ 1, 1],[0,-2],[ 1,-2]], // 1->0
    [[0,0],[ 1,0],[ 1, 1],[0,-2],[ 1,-2]], // 1->2
    [[0,0],[-1,0],[-1,-1],[0, 2],[-1, 2]], // 2->1
    [[0,0],[ 1,0],[ 1,-1],[0, 2],[ 1, 2]], // 2->3
    [[0,0],[-1,0],[-1, 1],[0,-2],[-1,-2]], // 3->2
    [[0,0],[-1,0],[-1, 1],[0,-2],[-1,-2]], // 3->0
    [[0,0],[ 1,0],[ 1,-1],[0, 2],[ 1, 2]]  // 0->3
  ],
/* I piece */
  I: [
    [[0,0],[-2,0],[ 1,0],[-2, 1],[ 1,-2]], // 0->1
    [[0,0],[ 2,0],[-1,0],[ 2,-1],[-1, 2]], // 1->0
    [[0,0],[-1,0],[ 2,0],[-1,-2],[ 2, 1]], // 1->2
    [[0,0],[ 1,0],[-2,0],[ 1, 2],[-2,-1]], // 2->1
    [[0,0],[ 2,0],[-1,0],[ 2,-1],[-1, 2]], // 2->3
    [[0,0],[-2,0],[ 1,0],[-2, 1],[ 1,-2]], // 3->2
    [[0,0],[ 1,0],[-2,0],[ 1, 2],[-2,-1]], // 3->0
    [[0,0],[-1,0],[ 2,0],[-1,-2],[ 2, 1]]  // 0->3
  ]
};

/** Small utility: deep copy of a 2D array */
const cloneShape = (shape) => shape.map(row => [...row]);

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
    this.lockResetCount = 0;
    this.canHold = true;
    this.manualDropping = false;
    
    // T-Spin & Combo tracking
    this.lastMoveWasRotation = false;
    this.lastKickIndex = -1;
    this.combo = 0;
    this.backToBack = false;
    this.lastClearWasDifficult = false;
    
    // Statistics
    this.stats = {
      tSpins: 0,
      miniTSpins: 0,
      tetrises: 0,
      perfectClears: 0,
      maxCombo: 0,
      backToBacks: 0
    };
    
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
    const tpl = PIECES[type];
    return {
      type,
      shape: cloneShape(SHAPES[type][0]), // rotation state 0 of 4x4 set
      x: tpl.x,
      y: tpl.y,
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
  
  // Rotation using precomputed 4x4 states + SRS kicks
  rotatePiece(direction = 1) {
    if (!this.canPerformAction()) return;

    const piece = this.currentPiece;
    const oldRot = piece.rotation;
    const newRot = (oldRot + direction + 4) % 4;

    // Build rotated candidate with the target state
    const rotated = { ...piece };
    rotated.shape = cloneShape(SHAPES[piece.type][newRot]);
    rotated.rotation = newRot;

    // Choose kick table
    const kickData =
      piece.type === 'I' ? WALL_KICKS.I :
      piece.type === 'O' ? WALL_KICKS.O :
      WALL_KICKS.normal;

    // Map old->new rotation to the correct kick index (same mapping as before)
    let kickIndex;
    if (direction === 1) {
      kickIndex = oldRot * 2; // 0->1, 1->2, 2->3, 3->0 are even indices in our table
    } else {
      kickIndex = ((oldRot + 3) % 4) * 2 + 1; // 0->3, 3->2, 2->1, 1->0 are odd indices
    }

    const kicks = kickData[kickIndex] || [[0,0]];

    // Try kicks in order
    for (let i = 0; i < kicks.length; i++) {
      const [dx, dy] = kicks[i];
      rotated.x = piece.x + dx;
      rotated.y = piece.y + dy;

      if (this.isValidPosition(rotated, 0, 0)) {
        this.currentPiece = rotated;

        // lock-reset bookkeeping (unchanged from your logic)
        this.moveCount++;
        this.lastMoveWasRotation = true;
        this.lastKickIndex = i;
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
        this.lastMoveWasRotation = false;
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
      this.lastMoveWasRotation = false;
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
    this.lastMoveWasRotation = false;
    this.lastKickIndex = -1;
    
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
  
  // Lock delay with proper infinity
  resetLockDelay() {
    if (this.lockResetCount >= Config.MOVEMENT.MAX_LOCK_RESETS) {
      return; // Don't reset if we've hit the limit
    }
    
    if (this.moveCount < Config.MOVEMENT.MAX_MOVES_BEFORE_LOCK && this.currentPiece) {
      if (this.lockTimer) {
        clearTimeout(this.lockTimer);
        this.lockTimer = null;
        this.lockResetCount++;
      }
      this.lockTimer = setTimeout(() => {
        if (this.currentPiece && !this.isValidPosition(this.currentPiece, 0, 1)) {
          this.lockPiece();
        }
      }, Config.TIMING.LOCK_DELAY);
    }
  }
  
  // T-Spin detection
  detectTSpin() {
    if (this.currentPiece.type !== 'T' || !this.lastMoveWasRotation) {
      return { isTSpin: false, isMini: false };
    }
    
    const x = this.currentPiece.x;
    const y = this.currentPiece.y;
    
    // Check the four corners of the T piece's 3x3 bounding box
    const corners = [
      [x, y],           // Top-left
      [x + 2, y],       // Top-right
      [x, y + 2],       // Bottom-left
      [x + 2, y + 2]    // Bottom-right
    ];
    
    // Count filled corners
    let filledCorners = 0;
    let frontCorners = 0;
    
    corners.forEach(([cx, cy], index) => {
      const isFilled = cy < 0 || cy >= Config.BOARD.ROWS || 
                      cx < 0 || cx >= Config.BOARD.COLS || 
                      this.board[cy][cx];
      
      if (isFilled) {
        filledCorners++;
        // Front corners depend on rotation
        if ((this.currentPiece.rotation === 0 && index >= 2) ||  // Down
            (this.currentPiece.rotation === 1 && index % 2 === 1) ||  // Right
            (this.currentPiece.rotation === 2 && index < 2) ||  // Up
            (this.currentPiece.rotation === 3 && index % 2 === 0)) {  // Left
          frontCorners++;
        }
      }
    });
    
    // T-Spin if 3+ corners filled
    const isTSpin = filledCorners >= 3;
    
    // Mini T-Spin if T-Spin with specific conditions
    const isMini = isTSpin && (frontCorners < 2 || this.lastKickIndex === 4);
    
    return { isTSpin, isMini };
  }
  
  // Check for perfect clear
  isPerfectClear() {
    // Check if the entire board is empty
    for (let r = 0; r < Config.BOARD.ROWS; r++) {
      if (this.board[r].some(cell => cell !== 0)) {
        return false;
      }
    }
    return true;
  }
  
  // Lock piece
  lockPiece() {
    if (!this.currentPiece) return;
    
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
    
    // Detect T-Spin before adding to board
    const tSpinResult = this.detectTSpin();
    
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
    this.moveCount = 0;
    this.lockResetCount = 0;
    this.lastMoveWasRotation = false;
    this.lastKickIndex = -1;
    
    // Check and clear lines with T-Spin info
    this.clearLines(tSpinResult);
  }
  
  // Clear lines with T-Spin and combo tracking
  clearLines(tSpinResult = { isTSpin: false, isMini: false }) {
    const linesToClear = [];
    
    // Find completed lines
    for (let r = 0; r < Config.BOARD.ROWS; r++) {
      if (this.board[r].every(cell => cell !== 0)) {
        linesToClear.push(r);
      }
    }
    
    if (linesToClear.length === 0) {
      this.combo = 0; // Reset combo
      // Apply ARE delay before spawning next piece
      setTimeout(() => this.spawnNextPiece(), Config.TIMING.ARE_DELAY);
      return;
    }
    
    this.clearingLines = true;
    
    // Calculate score based on line clear type
    const numLines = linesToClear.length;
    let baseScore = 0;
    let isDifficultClear = false;
    
    if (tSpinResult.isTSpin) {
      if (tSpinResult.isMini) {
        baseScore = Config.SCORING.T_SPIN.MINI[numLines] || 0;
        this.stats.miniTSpins++;
      } else {
        baseScore = Config.SCORING.T_SPIN.REGULAR[numLines] || 0;
        this.stats.tSpins++;
        isDifficultClear = true;
      }
      this.emit(Config.EVENTS.T_SPIN, { mini: tSpinResult.isMini, lines: numLines });
    } else {
      baseScore = Config.SCORING.LINES[numLines] || 0;
      if (numLines === 4) {
        isDifficultClear = true;
        this.stats.tetrises++;
      }
    }
    
    // Apply Back-to-Back bonus
    if (isDifficultClear) {
      if (this.lastClearWasDifficult) {
        baseScore = Math.floor(baseScore * Config.SCORING.BACK_TO_BACK_MULTIPLIER);
        this.backToBack = true;
        this.stats.backToBacks++;
        this.emit(Config.EVENTS.BACK_TO_BACK, { score: baseScore });
      }
      this.lastClearWasDifficult = true;
    } else if (numLines > 0) {
      this.lastClearWasDifficult = false;
      this.backToBack = false;
    }
    
    // Apply combo bonus
    if (this.combo > 0) {
      baseScore += Config.SCORING.COMBO_MULTIPLIER * this.combo * this.level;
      this.emit(Config.EVENTS.COMBO, { combo: this.combo, bonus: Config.SCORING.COMBO_MULTIPLIER * this.combo * this.level });
    }
    this.combo++;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
    
    // Apply level multiplier
    this.score += baseScore * this.level;
    
    // Emit line clear event with callback
    this.emit(Config.EVENTS.LINES_CLEARED, {
      lines: linesToClear,
      tSpin: tSpinResult,
      combo: this.combo,
      backToBack: this.backToBack,
      callback: () => {
        this.updateBoardAfterClear(linesToClear, numLines);
      }
    });
  }
  
  // Update board after line clear
  updateBoardAfterClear(linesToClear, numLines) {
    // Remove cleared lines and add empty lines at top
    linesToClear.sort((a, b) => b - a).forEach(row => {
      this.board.splice(row, 1);
    });
    
    while (this.board.length < Config.BOARD.ROWS) {
      this.board.unshift(Array(Config.BOARD.COLS).fill(0));
    }
    
    // Check for perfect clear
    if (this.isPerfectClear()) {
      const perfectClearBonus = Config.SCORING.PERFECT_CLEAR_BONUS[numLines] || 0;
      this.score += perfectClearBonus * this.level;
      this.stats.perfectClears++;
      this.emit(Config.EVENTS.PERFECT_CLEAR, { bonus: perfectClearBonus * this.level });
    }
    
    // Update lines count
    this.lines += numLines;
    
    // Check level up
    if (this.lines >= this.level * Config.SCORING.LINES_PER_LEVEL) {
      this.level++;
      this.updateDropSpeed();
    }
    
    this.emitStateUpdate();
    this.clearingLines = false;
    this.saveState();
    
    // Apply line clear delay then ARE delay
    setTimeout(() => {
      setTimeout(() => this.spawnNextPiece(), Config.TIMING.ARE_DELAY);
    }, Config.TIMING.LINE_CLEAR_DELAY);
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
    this.lockResetCount = 0;
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
    this.lockResetCount = 0;
    this.canHold = true;
    this.heldPiece = null;
    this.bag = this.generateBag();
    this.nextBag = this.generateBag();
    
    // Reset T-Spin & combo tracking
    this.lastMoveWasRotation = false;
    this.lastKickIndex = -1;
    this.combo = 0;
    this.backToBack = false;
    this.lastClearWasDifficult = false;
    
    // Reset statistics
    this.stats = {
      tSpins: 0,
      miniTSpins: 0,
      tetrises: 0,
      perfectClears: 0,
      maxCombo: 0,
      backToBacks: 0
    };
    
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
    
    this.emit(Config.EVENTS.GAME_OVER, { stats: this.stats });
  }
  
  // State management
  saveState() {
    this.storage.saveGameState(this.getState());
  }
  
  loadState() {
    const savedState = this.storage.loadGameState();
    if (!savedState) return false;
    
    try {
      // Restore basic state
      Object.assign(this, savedState);
      
      // Initialize missing properties for backward compatibility
      if (this.combo === undefined) this.combo = 0;
      if (this.backToBack === undefined) this.backToBack = false;
      if (this.lastClearWasDifficult === undefined) this.lastClearWasDifficult = false;
      if (this.lastMoveWasRotation === undefined) this.lastMoveWasRotation = false;
      if (this.lastKickIndex === undefined) this.lastKickIndex = -1;
      if (this.lockResetCount === undefined) this.lockResetCount = 0;
      if (!this.stats) {
        this.stats = {
          tSpins: 0,
          miniTSpins: 0,
          tetrises: 0,
          perfectClears: 0,
          maxCombo: 0,
          backToBacks: 0
        };
      }
      
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
      canHold: this.canHold,
      combo: this.combo,
      backToBack: this.backToBack,
      stats: this.stats
    };
  }
}