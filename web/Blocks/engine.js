// ====== GAME ENGINE ======

// Constants
export const ROWS = 18, COLS = 10;
export const LOCK_DELAY = 500;
export const STORAGE_KEY = 'blocks_game_state';
export const HIGH_SCORE_KEY = 'blocks_high_score';

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
    
    // Animation setting
    this.animationsEnabled = true;
    
    // Timers
    this.dropTimer = null;
    this.lockTimer = null;
    
    // Callbacks
    this.onBoardUpdate = null;
    this.onStatsUpdate = null;
    this.onNextQueueUpdate = null;
    this.onHoldUpdate = null;
    this.onGameOver = null;
    this.onLinesCleared = null;
    this.onPieceSpawned = null;
    this.onPauseToggle = null;
    
    this.loadHighScore();
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
    this.board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
  }
  
  isValidPosition(piece, dx = 0, dy = 0) {
    return piece.shape.every((row, r) => 
      row.every((val, c) => {
        if (!val) return true;
        const newX = piece.x + c + dx;
        const newY = piece.y + r + dy;
        return newX >= 0 && newX < COLS && newY < ROWS && 
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
    if (!this.currentPiece || this.gameOver || this.paused || 
        this.clearingLines || this.hardDropping) return;
    
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
        if (this.onBoardUpdate) this.onBoardUpdate();
        this.saveState();
        return;
      }
    }
  }
  
  // Movement
  movePiece(dx, dy) {
    if (!this.currentPiece || this.gameOver || this.paused || 
        this.clearingLines || this.hardDropping) return false;
    
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
      if (this.onBoardUpdate) this.onBoardUpdate();
      this.saveState();
      return true;
    }
    return false;
  }
  
  // Get piece bounds
  getPieceBounds(piece) {
    let leftmost = piece.shape[0].length;
    let rightmost = -1;
    
    piece.shape.forEach(row => {
      row.forEach((val, c) => {
        if (val) {
          leftmost = Math.min(leftmost, c);
          rightmost = Math.max(rightmost, c);
        }
      });
    });
    
    return { left: leftmost, right: rightmost };
  }
  
  // Move piece to specific X position
  movePieceToX(targetX) {
    if (!this.currentPiece || this.gameOver || this.paused || 
        this.clearingLines || this.hardDropping) return;
    
    const bounds = this.getPieceBounds(this.currentPiece);
    
    // Clamp target position to valid range
    const minX = -bounds.left;
    const maxX = COLS - 1 - bounds.right;
    const clampedX = Math.max(minX, Math.min(maxX, targetX));
    
    // Move piece
    if (this.isValidPosition({...this.currentPiece, x: clampedX})) {
      this.currentPiece.x = clampedX;
      this.moveCount++;
      if (!this.isValidPosition(this.currentPiece, 0, 1)) {
        this.resetLockDelay();
      }
      this.updateGhost();
      if (this.onBoardUpdate) this.onBoardUpdate();
      this.saveState();
    }
  }
  
  // Drop piece
  dropPiece() {
    if (this.hardDropping || !this.currentPiece) return;
    
    if (this.movePiece(0, 1)) {
      if (this.manualDropping) {
        this.score++;
        if (this.onStatsUpdate) this.onStatsUpdate();
      }
    } else {
      this.lockPiece();
    }
  }
  
  // Hard drop
  hardDrop() {
    if (!this.currentPiece || this.gameOver || this.paused || 
        this.clearingLines || this.hardDropping) return;
    
    this.hardDropping = true;
    
    // Calculate drop distance
    let dropDist = 0;
    let testPiece = {...this.currentPiece};
    
    while (this.isValidPosition(testPiece, 0, 1)) {
      testPiece.y++;
      dropDist++;
    }
    
    if (dropDist > 0 && this.animationsEnabled) {
      // Animate the fall
      const dropSpeed = Math.max(3, 50 / dropDist);
      let currentDrop = 0;
      
      const animateDrop = () => {
        if (currentDrop < dropDist) {
          if (this.isValidPosition(this.currentPiece, 0, 1)) {
            this.currentPiece.y++;
            currentDrop++;
            this.updateGhost();
            if (this.onBoardUpdate) this.onBoardUpdate();
            setTimeout(animateDrop, dropSpeed);
          } else {
            this.finishHardDrop(currentDrop);
          }
        } else {
          this.finishHardDrop(dropDist);
        }
      };
      
      animateDrop();
    } else if (dropDist > 0) {
      // No animation - drop instantly
      this.currentPiece.y = testPiece.y;
      this.updateGhost();
      if (this.onBoardUpdate) this.onBoardUpdate();
      this.finishHardDrop(dropDist);
    } else {
      // Already at bottom
      this.hardDropping = false;
      this.lockPiece();
    }
  }
  
  finishHardDrop(dropDist) {
    this.score += dropDist * 2;
    if (this.onStatsUpdate) this.onStatsUpdate();
    this.hardDropping = false;
    this.lockPiece();
  }
  
  // Hold piece
  holdPiece() {
    if (!this.currentPiece || !this.canHold || this.gameOver || 
        this.paused || this.clearingLines || this.hardDropping) return;
    
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
      if (this.onNextQueueUpdate) this.onNextQueueUpdate();
    }
    
    this.updateGhost();
    if (this.onHoldUpdate) this.onHoldUpdate();
    if (this.onBoardUpdate) this.onBoardUpdate();
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
    if (this.moveCount < 15 && this.currentPiece) {
      if (this.lockTimer) {
        clearTimeout(this.lockTimer);
        this.lockTimer = null;
      }
      this.lockTimer = setTimeout(() => {
        if (this.currentPiece && !this.isValidPosition(this.currentPiece, 0, 1)) {
          this.lockPiece();
        }
      }, LOCK_DELAY);
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
    for (let r = 0; r < ROWS; r++) {
      if (this.board[r].every(cell => cell !== 0)) {
        linesToClear.push(r);
      }
    }
    
    if (linesToClear.length === 0) {
      this.spawnNextPiece();
      return;
    }
    
    this.clearingLines = true;
    
    // Notify renderer about lines to clear
    if (this.onLinesCleared) {
      this.onLinesCleared(linesToClear, () => {
        this.updateBoardAfterClear(linesToClear);
      });
    } else {
      this.updateBoardAfterClear(linesToClear);
    }
  }
  
  // Update board after line clear
  updateBoardAfterClear(linesToClear) {
    // Remove cleared lines and add empty lines at top
    linesToClear.sort((a, b) => b - a).forEach(row => {
      this.board.splice(row, 1);
    });
    
    while (this.board.length < ROWS) {
      this.board.unshift(Array(COLS).fill(0));
    }
    
    // Update score
    const points = [0, 100, 300, 500, 800];
    this.score += points[linesToClear.length] * this.level;
    this.lines += linesToClear.length;
    
    // Check level up
    if (this.lines >= this.level * 10) {
      this.level++;
      this.updateDropSpeed();
    }
    
    if (this.onStatsUpdate) this.onStatsUpdate();
    if (this.onBoardUpdate) this.onBoardUpdate();
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
    
    if (this.onNextQueueUpdate) this.onNextQueueUpdate();
    
    if (!this.isValidPosition(this.currentPiece)) {
      this.endGame();
    } else {
      if (this.onBoardUpdate) this.onBoardUpdate();
      if (this.onPieceSpawned) this.onPieceSpawned();
      this.saveState();
    }
  }
  
  // Update drop speed
  updateDropSpeed() {
    if (this.dropTimer) {
      clearInterval(this.dropTimer);
      this.dropTimer = null;
    }
    const speed = Math.max(50, 1000 - (this.level - 1) * 100);
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
    } else {
      this.updateDropSpeed();
      if (this.currentPiece && !this.isValidPosition(this.currentPiece, 0, 1)) {
        this.resetLockDelay();
      }
    }
    
    if (this.onPauseToggle) this.onPauseToggle(this.paused);
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
    
    this.clearSavedState();
    
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
    
    // Update displays
    if (this.onStatsUpdate) this.onStatsUpdate();
    if (this.onNextQueueUpdate) this.onNextQueueUpdate();
    if (this.onHoldUpdate) this.onHoldUpdate();
    if (this.onBoardUpdate) this.onBoardUpdate();
    
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
    
    this.clearSavedState();
    this.saveHighScore();
    
    if (this.onGameOver) this.onGameOver();
  }
  
  // Score management
  loadHighScore() {
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    if (saved) this.highScore = parseInt(saved) || 0;
  }
  
  saveHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(HIGH_SCORE_KEY, this.highScore);
    }
  }
  
  // State management
  saveState() {
    if (this.gameOver) return;
    
    const saveData = {
      board: this.board,
      bag: this.bag,
      nextBag: this.nextBag,
      currentPiece: this.currentPiece,
      heldPiece: this.heldPiece,
      score: this.score,
      level: this.level,
      lines: this.lines,
      canHold: this.canHold,
      paused: this.paused
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
  }
  
  loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;
    
    try {
      const saveData = JSON.parse(saved);
      Object.assign(this, saveData);
      
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
  
  clearSavedState() {
    localStorage.removeItem(STORAGE_KEY);
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
      nextBag: this.nextBag
    };
  }
  
  // Set animations enabled
  setAnimationsEnabled(enabled) {
    this.animationsEnabled = enabled;
  }
}