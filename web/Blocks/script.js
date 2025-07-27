// ====== BLOCKS GAME LOGIC ======

// Constants
const ROWS = 18, COLS = 10;
const LOCK_DELAY = 500;
const DAS_DELAY = 150, ARR_DELAY = 30;
const STORAGE_KEY = 'blocks_game_state';
const HIGH_SCORE_KEY = 'blocks_high_score';
const ANIMATIONS_KEY = 'blocks_animations_enabled';

// Pieces with SRS spawn positions
const PIECES = {
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

// Game state
const state = {
  board: [],
  bag: [],
  nextBag: [],
  currentPiece: null,
  ghostPiece: null,
  heldPiece: null,
  score: 0,
  level: 1,
  lines: 0,
  highScore: 0,
  gameOver: false,
  paused: false,
  clearingLines: false,
  hardDropping: false,
  moveCount: 0,
  canHold: true,
  manualDropping: false,
  animationsEnabled: true
};

// Intervals and timers
const timers = {
  drop: null,
  lock: null,
  das: null,
  arr: null
};

// DOM helper
const $ = sel => document.querySelector(sel);

// Animation settings
const loadAnimationSettings = () => {
  const saved = localStorage.getItem(ANIMATIONS_KEY);
  state.animationsEnabled = saved === null ? true : saved === 'true';
  document.body.classList.toggle('no-animations', !state.animationsEnabled);
  $('#animationsToggle').checked = state.animationsEnabled;
};

const saveAnimationSettings = () => {
  localStorage.setItem(ANIMATIONS_KEY, state.animationsEnabled);
  document.body.classList.toggle('no-animations', !state.animationsEnabled);
};

// Score management
const loadHighScore = () => {
  const saved = localStorage.getItem(HIGH_SCORE_KEY);
  if (saved) state.highScore = parseInt(saved) || 0;
};

const saveHighScore = () => {
  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem(HIGH_SCORE_KEY, state.highScore);
  }
};

// Game state management
const saveGameState = () => {
  if (state.gameOver) return;
  
  const saveData = {
    board: state.board,
    bag: state.bag,
    nextBag: state.nextBag,
    currentPiece: state.currentPiece,
    heldPiece: state.heldPiece,
    score: state.score,
    level: state.level,
    lines: state.lines,
    canHold: state.canHold,
    paused: state.paused
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
};

const loadGameState = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return false;
  
  try {
    const saveData = JSON.parse(saved);
    Object.assign(state, saveData);
    return true;
  } catch (e) {
    console.error('Failed to load game state:', e);
    return false;
  }
};

const clearGameState = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// 7-bag randomizer
const generateBag = () => {
  const types = Object.keys(PIECES);
  const bag = [...types];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
};

const getNextPiece = () => {
  if (state.bag.length === 0) {
    state.bag = state.nextBag.length ? state.nextBag : generateBag();
    state.nextBag = generateBag();
  }
  const type = state.bag.shift();
  const piece = PIECES[type];
  return {
    type,
    shape: piece.shape.map(row => [...row]),
    x: piece.x,
    y: piece.y,
    rotation: 0
  };
};

// Board management
const initBoard = () => {
  state.board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
};

const isValidPosition = (piece, dx = 0, dy = 0) => {
  return piece.shape.every((row, r) => 
    row.every((val, c) => {
      if (!val) return true;
      const newX = piece.x + c + dx;
      const newY = piece.y + r + dy;
      return newX >= 0 && newX < COLS && newY < ROWS && 
             (newY < 0 || !state.board[newY][newX]);
    })
  );
};

// Rotation
const rotateMatrix = matrix => {
  const n = matrix.length;
  const rotated = Array(n).fill().map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      rotated[j][n-1-i] = matrix[i][j];
    }
  }
  return rotated;
};

const rotatePiece = () => {
  if (!state.currentPiece || state.gameOver || state.paused || state.clearingLines || state.hardDropping) return;
  
  const oldRot = state.currentPiece.rotation;
  const newRot = (oldRot + 1) % 4;
  const rotated = {
    ...state.currentPiece,
    shape: rotateMatrix(state.currentPiece.shape),
    rotation: newRot
  };
  
  // Get wall kicks
  const kickData = state.currentPiece.type === 'I' ? WALL_KICKS.I : WALL_KICKS.normal;
  const kickIndex = oldRot * 2 + (newRot === (oldRot + 1) % 4 ? 0 : 1);
  const kicks = kickData[kickIndex] || [[0,0]];
  
  // Try each kick
  for (const [dx, dy] of kicks) {
    rotated.x = state.currentPiece.x + dx;
    rotated.y = state.currentPiece.y + dy;
    if (isValidPosition(rotated)) {
      state.currentPiece = rotated;
      state.moveCount++;
      resetLockDelay();
      updateGhost();
      renderBoard();
      saveGameState();
      return;
    }
  }
};

// Hold piece
const holdPiece = () => {
  if (!state.currentPiece || !state.canHold || state.gameOver || state.paused || state.clearingLines || state.hardDropping) return;
  
  state.canHold = false;
  
  if (state.heldPiece) {
    // Swap with held piece
    const temp = state.currentPiece.type;
    state.currentPiece = {
      ...PIECES[state.heldPiece],
      shape: PIECES[state.heldPiece].shape.map(row => [...row]),
      x: PIECES[state.heldPiece].x,
      y: PIECES[state.heldPiece].y,
      type: state.heldPiece,
      rotation: 0
    };
    state.heldPiece = temp;
  } else {
    // Hold current piece and get next
    state.heldPiece = state.currentPiece.type;
    state.currentPiece = getNextPiece();
    updateNextQueue();
  }
  
  updateGhost();
  updateHoldDisplay();
  renderBoard();
  saveGameState();
};

// Ghost piece
const updateGhost = () => {
  if (!state.currentPiece) return;
  state.ghostPiece = {...state.currentPiece};
  while (isValidPosition(state.ghostPiece, 0, 1)) {
    state.ghostPiece.y++;
  }
};

// Lock delay
const resetLockDelay = () => {
  if (state.moveCount < 15 && state.currentPiece) {
    if (timers.lock) {
      clearTimeout(timers.lock);
      timers.lock = null;
    }
    timers.lock = setTimeout(() => {
      if (state.currentPiece && !isValidPosition(state.currentPiece, 0, 1)) {
        lockPiece();
      }
    }, LOCK_DELAY);
  }
};

// Lock piece
const lockPiece = () => {
  if (!state.currentPiece) return;
  
  if (timers.lock) {
    clearTimeout(timers.lock);
    timers.lock = null;
  }
  
  const {shape, x, y, type} = state.currentPiece;
  
  // Add piece to board
  shape.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val && y + r >= 0) {
        state.board[y + r][x + c] = type;
      }
    });
  });
  
  // Clear current piece before checking lines
  state.currentPiece = null;
  state.canHold = true;
  
  // Check and clear lines
  clearLines();
};

// Clear lines with animation
const clearLines = () => {
  const linesToClear = [];
  
  // Find completed lines
  for (let r = 0; r < ROWS; r++) {
    if (state.board[r].every(cell => cell !== 0)) {
      linesToClear.push(r);
    }
  }
  
  if (linesToClear.length === 0) {
    spawnNextPiece();
    return;
  }
  
  state.clearingLines = true;
  renderBoard();
  
  const animationDuration = state.animationsEnabled ? 200 : 0;
  
  // Animate clearing
  if (state.animationsEnabled) {
    const boardEl = $('#board');
    linesToClear.forEach(row => {
      for (let c = 0; c < COLS; c++) {
        const idx = row * COLS + c;
        boardEl.children[idx]?.classList.add('clearing');
      }
    });
  }
  
  // Wait for animation then clear
  setTimeout(() => {
    // Animate falling pieces first (while blocks are still in old positions)
    if (state.animationsEnabled) {
      animateFallingPieces(linesToClear, () => {
        // After animation, update the board
        updateBoardAfterClear(linesToClear);
      });
    } else {
      // No animation, update immediately
      updateBoardAfterClear(linesToClear);
    }
  }, animationDuration);
};

// Update board after line clear animation
const updateBoardAfterClear = (linesToClear) => {
  // Remove cleared lines and add empty lines at top
  linesToClear.sort((a, b) => b - a).forEach(row => {
    state.board.splice(row, 1);
  });
  
  while (state.board.length < ROWS) {
    state.board.unshift(Array(COLS).fill(0));
  }
  
  // Update score
  const points = [0, 100, 300, 500, 800];
  state.score += points[linesToClear.length] * state.level;
  state.lines += linesToClear.length;
  
  // Check level up
  if (state.lines >= state.level * 10) {
    state.level++;
    updateDropSpeed();
  }
  
  updateStats();
  renderBoard();
  state.clearingLines = false;
  saveGameState();
  spawnNextPiece();
};

// Animate pieces falling after line clear
const animateFallingPieces = (clearedRows, callback) => {
  if (!state.animationsEnabled) {
    callback();
    return;
  }
  
  const boardEl = $('#board');
  const highestClearedRow = Math.min(...clearedRows);
  
  // Small delay to let line clear animation finish
  setTimeout(() => {
    // Add falling animation to blocks above cleared lines
    for (let r = 0; r < highestClearedRow; r++) {
      for (let c = 0; c < COLS; c++) {
        if (state.board[r][c]) {
          const idx = r * COLS + c;
          const cell = boardEl.children[idx];
          if (cell) {
            // Calculate drop distance
            const linesBelow = clearedRows.filter(row => row > r).length;
            
            cell.style.transition = 'transform 0.1s linear';
            cell.style.transform = `translateY(calc(${linesBelow} * var(--cell-size))) scale(0.9)`;
          }
        }
      }
    }
    
    // Wait for animation to complete
    setTimeout(() => {
      // Reset all transforms
      boardEl.querySelectorAll('.cell').forEach(cell => {
        cell.style.transition = '';
        cell.style.transform = '';
      });
      
      // Now update the board and re-render
      callback();
    }, 100);
  }, 0);
};

// Spawn next piece
const spawnNextPiece = () => {
  // Don't spawn if hard dropping is in progress or if game is over
  if (state.hardDropping || state.gameOver) {
    if (!state.gameOver) {
      setTimeout(spawnNextPiece, 50);
    }
    return;
  }
  
  state.moveCount = 0;
  state.currentPiece = getNextPiece();
  updateGhost();
  updateNextQueue();
  
  if (!isValidPosition(state.currentPiece)) {
    endGame();
  } else {
    renderBoard();
    saveGameState();
  }
};

// Movement
const movePiece = (dx, dy) => {
  if (!state.currentPiece || state.gameOver || state.paused || state.clearingLines || state.hardDropping) return false;
  
  if (isValidPosition(state.currentPiece, dx, dy)) {
    state.currentPiece.x += dx;
    state.currentPiece.y += dy;
    
    if (dx !== 0) {
      state.moveCount++;
      if (!isValidPosition(state.currentPiece, 0, 1)) {
        resetLockDelay();
      }
    }
    
    updateGhost();
    renderBoard();
    saveGameState();
    return true;
  }
  return false;
};

// Drop piece
const dropPiece = () => {
  if (state.hardDropping || !state.currentPiece) return;
  
  if (movePiece(0, 1)) {
    if (state.manualDropping) {
      state.score++;
      updateStats();
    }
  } else {
    lockPiece();
  }
};

// Hard drop with animation
const hardDrop = () => {
  if (!state.currentPiece || state.gameOver || state.paused || state.clearingLines || state.hardDropping) return;
  
  state.hardDropping = true;
  
  // Calculate drop distance
  let dropDist = 0;
  let testPiece = {...state.currentPiece};
  
  while (isValidPosition(testPiece, 0, 1)) {
    testPiece.y++;
    dropDist++;
  }
  
  if (dropDist > 0 && state.animationsEnabled) {
    // Animate the fall
    const dropSpeed = Math.max(3, 50 / dropDist);
    let currentDrop = 0;
    
    const animateDrop = () => {
      if (currentDrop < dropDist) {
        if (isValidPosition(state.currentPiece, 0, 1)) {
          state.currentPiece.y++;
          currentDrop++;
          updateGhost();
          renderBoard();
          setTimeout(animateDrop, dropSpeed);
        } else {
          finishDrop(currentDrop);
        }
      } else {
        finishDrop(dropDist);
      }
    };
    
    animateDrop();
  } else if (dropDist > 0) {
    // No animation - drop instantly
    state.currentPiece.y = testPiece.y;
    updateGhost();
    renderBoard();
    finishDrop(dropDist);
  } else {
    // Already at bottom
    state.hardDropping = false;
    lockPiece();
  }
};

const finishDrop = (dropDist) => {
  state.score += dropDist * 2;
  updateStats();
  state.hardDropping = false;
  lockPiece();
};

// Update drop speed
const updateDropSpeed = () => {
  if (timers.drop) {
    clearInterval(timers.drop);
    timers.drop = null;
  }
  const speed = Math.max(50, 1000 - (state.level - 1) * 100);
  timers.drop = setInterval(() => {
    if (!state.gameOver && !state.paused && !state.clearingLines && !state.hardDropping) {
      state.manualDropping = false;
      dropPiece();
    }
  }, speed);
};

// Rendering
const renderBoard = () => {
  const boardEl = $('#board');
  if (!boardEl) return;
  
  boardEl.innerHTML = '';
  
  // Render board cells
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (state.board[r][c]) {
        cell.classList.add('filled', state.board[r][c]);
      }
      boardEl.appendChild(cell);
    }
  }
  
  // Render ghost piece
  if (state.ghostPiece && state.currentPiece && !state.gameOver) {
    state.ghostPiece.shape.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val) {
          const gx = state.ghostPiece.x + c;
          const gy = state.ghostPiece.y + r;
          
          // Check if current piece overlaps
          let overlaps = false;
          state.currentPiece.shape.forEach((prow, pr) => {
            prow.forEach((pval, pc) => {
              if (pval && state.currentPiece.x + pc === gx && state.currentPiece.y + pr === gy) {
                overlaps = true;
              }
            });
          });
          
          if (!overlaps && gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
            const idx = gy * COLS + gx;
            boardEl.children[idx]?.classList.add('ghost', state.currentPiece.type);
          }
        }
      });
    });
  }
  
  // Render current piece
  if (state.currentPiece && !state.gameOver) {
    state.currentPiece.shape.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val) {
          const x = state.currentPiece.x + c;
          const y = state.currentPiece.y + r;
          if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
            const idx = y * COLS + x;
            boardEl.children[idx]?.classList.add('filled', state.currentPiece.type);
          }
        }
      });
    });
  }
};

// Update UI
const updateStats = () => {
  $('#score').textContent = state.score;
  $('#level').textContent = state.level;
  $('#lines').textContent = state.lines;
};

const renderPreview = type => {
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
};

const updateNextQueue = () => {
  const container = $('#nextQueue');
  container.innerHTML = '';
  
  const upcoming = [...state.bag, ...state.nextBag].slice(0, 3);
  upcoming.forEach(type => {
    container.appendChild(renderPreview(type));
  });
};

const updateHoldDisplay = () => {
  const container = $('#holdPreview');
  container.innerHTML = '';
  
  if (state.heldPiece) {
    container.appendChild(renderPreview(state.heldPiece));
  } else {
    const empty = document.createElement('div');
    empty.className = 'empty-hold';
    container.appendChild(empty);
  }
};

// Game control
const togglePause = () => {
  if (state.gameOver) return;
  
  state.paused = !state.paused;
  $('#pausedOverlay').style.display = state.paused ? 'flex' : 'none';
  
  if (state.paused) {
    if (timers.drop) {
      clearInterval(timers.drop);
      timers.drop = null;
    }
    if (timers.lock) {
      clearTimeout(timers.lock);
      timers.lock = null;
    }
  } else {
    updateDropSpeed();
    if (state.currentPiece && !isValidPosition(state.currentPiece, 0, 1)) {
      resetLockDelay();
    }
  }
  
  saveGameState();
};

const startNewGame = () => {
  // Clear all timers first
  if (timers.drop) {
    clearInterval(timers.drop);
    timers.drop = null;
  }
  if (timers.lock) {
    clearTimeout(timers.lock);
    timers.lock = null;
  }
  
  clearGameState();
  $('#app').classList.remove('game-over');
  $('#pausedOverlay').style.display = 'none';
  
  // Reset state
  Object.assign(state, {
    score: 0,
    level: 1,
    lines: 0,
    gameOver: false,
    paused: false,
    clearingLines: false,
    hardDropping: false,
    moveCount: 0,
    canHold: true,
    heldPiece: null,
    bag: generateBag(),
    nextBag: generateBag()
  });
  
  // Initialize game
  initBoard();
  state.currentPiece = getNextPiece();
  updateGhost();
  
  // Update displays
  updateStats();
  updateNextQueue();
  updateHoldDisplay();
  renderBoard();
  
  // Start drop timer
  updateDropSpeed();
};

const endGame = () => {
  state.gameOver = true;
  
  // Clear all timers
  if (timers.drop) {
    clearInterval(timers.drop);
    timers.drop = null;
  }
  if (timers.lock) {
    clearTimeout(timers.lock);
    timers.lock = null;
  }
  if (timers.das) {
    clearTimeout(timers.das);
    timers.das = null;
  }
  if (timers.arr) {
    clearInterval(timers.arr);
    timers.arr = null;
  }
  
  clearGameState();
  saveHighScore();
  
  // Animate game over
  $('#app').classList.add('game-over');
};

// Input handling
let keysHeld = {};

const startDAS = dir => {
  const dx = dir === 'left' ? -1 : 1;
  movePiece(dx, 0);
  
  if (timers.das) {
    clearTimeout(timers.das);
    timers.das = null;
  }
  if (timers.arr) {
    clearInterval(timers.arr);
    timers.arr = null;
  }
  
  timers.das = setTimeout(() => {
    timers.arr = setInterval(() => {
      if (!state.paused && !state.clearingLines) movePiece(dx, 0);
    }, ARR_DELAY);
  }, DAS_DELAY);
};

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
  // Initialize common UI components
  initCommonUI();
  
  // Load settings
  loadHighScore();
  loadAnimationSettings();
  
  // Animation toggle
  $('#animationsToggle').addEventListener('change', e => {
    state.animationsEnabled = e.target.checked;
    saveAnimationSettings();
  });
  
  // Try to load saved game
  if (loadGameState()) {
    updateGhost();
    updateStats();
    updateNextQueue();
    updateHoldDisplay();
    renderBoard();
    
    if (state.paused) {
      $('#pausedOverlay').style.display = 'flex';
    } else {
      updateDropSpeed();
      if (state.currentPiece && !isValidPosition(state.currentPiece, 0, 1)) {
        resetLockDelay();
      }
    }
  } else {
    startNewGame();
  }
  
  // Keyboard controls
  document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (keysHeld[key]) return;
    keysHeld[key] = true;
    
    if (state.gameOver || state.clearingLines || state.hardDropping) return;
    
    switch(key) {
      case 'arrowleft':
      case 'a':
      case 'ф': // Russian 'a'
        e.preventDefault();
        startDAS('left');
        break;
      case 'arrowright':
      case 'd':
      case 'в': // Russian 'd'
        e.preventDefault();
        startDAS('right');
        break;
      case 'arrowdown':
      case 's':
      case 'ы': // Russian 's'
        e.preventDefault();
        state.manualDropping = true;
        dropPiece();
        break;
      case 'arrowup':
      case 'w':
      case 'ц': // Russian 'w'
        e.preventDefault();
        rotatePiece();
        break;
      case ' ':
        e.preventDefault();
        hardDrop();
        break;
      case 'c':
      case 'с': // Russian 'c'
        e.preventDefault();
        holdPiece();
        break;
      case 'p':
      case 'з': // Russian 'p'
        togglePause();
        break;
    }
  });
  
  document.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    keysHeld[key] = false;
    
    if (['arrowleft', 'arrowright', 'a', 'd', 'ф', 'в'].includes(key)) {
      if (timers.das) {
        clearTimeout(timers.das);
        timers.das = null;
      }
      if (timers.arr) {
        clearInterval(timers.arr);
        timers.arr = null;
      }
    }
    
    if (['arrowdown', 's', 'ы'].includes(key)) {
      state.manualDropping = false;
    }
  });
  
  // Mobile controls
  $('#leftBtn').addEventListener('click', () => movePiece(-1, 0));
  $('#rightBtn').addEventListener('click', () => movePiece(1, 0));
  $('#downBtn').addEventListener('click', () => {
    state.manualDropping = true;
    dropPiece();
    setTimeout(() => { state.manualDropping = false; }, 100);
  });
  $('#rotateBtn').addEventListener('click', () => rotatePiece());
  $('#dropBtn').addEventListener('click', () => hardDrop());
  
  // Game buttons
  $('#newBtn').addEventListener('click', startNewGame);
  
  // Help modal
  $('#helpLink').addEventListener('click', e => {
    e.preventDefault();
    if (!state.paused && !state.gameOver) {
      togglePause();
    }
    $('#helpModal').style.display = 'flex';
  });
  
  $('#closeHelp').addEventListener('click', () => {
    $('#helpModal').style.display = 'none';
  });
  
  $('#helpModal').addEventListener('click', e => {
    if (e.target === $('#helpModal')) {
      $('#helpModal').style.display = 'none';
    }
  });
});