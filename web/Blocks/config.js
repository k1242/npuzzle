// ====== GAME CONFIGURATION ======

export const Config = {
  // Board dimensions
  BOARD: {
    ROWS: 18,
    COLS: 10
  },
  
  // Game events
  EVENTS: {
    // Unified state update event
    STATE_UPDATE: 'state:update',
    
    // Game flow events
    GAME_START: 'game:start',
    GAME_OVER: 'game:over',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    
    // Animation events
    LINES_CLEARED: 'lines:cleared',
    HARD_DROP_START: 'hard_drop:start',
    PIECE_SPAWNED: 'piece:spawned',
    
    // Special moves
    T_SPIN: 't_spin:detected',
    COMBO: 'combo:achieved',
    BACK_TO_BACK: 'back_to_back:achieved',
    PERFECT_CLEAR: 'perfect_clear:achieved',
    
    // Settings events
    ANIMATION_TOGGLE: 'settings:animation',
    MOUSE_CONTROL_TOGGLE: 'settings:mouse_control',
    TOUCH_BUTTONS_TOGGLE: 'settings:touch_buttons',
    
    // Touch events
    FIRST_TOUCH: 'touch:first'
  },
  
  // Timing (ms) - According to Tetris Guidelines
  TIMING: {
    LOCK_DELAY: 500,          // Standard lock delay
    DAS_DELAY: 133,           // Delayed Auto Shift (standard)
    ARR_DELAY: 10,            // Auto Repeat Rate (faster than before)
    SOFT_DROP_DELAY: 50,
    ARE_DELAY: 0,             // Entry delay (0 for modern Tetris)
    LINE_CLEAR_DELAY: 300,    // Line clear delay before ARE
    LINE_CLEAR_ANIMATION: 200,
    FALLING_ANIMATION: 100,
    HARD_DROP_SPEED: 3,
    MOUSE_SMOOTHING_WINDOW: 50
  },
  
  // Scoring - Tetris Guidelines scoring system
  SCORING: {
    // Base line clear points
    LINES: {
      0: 0,
      1: 100,    // Single
      2: 300,    // Double
      3: 500,    // Triple
      4: 800     // Tetris
    },
    
    // T-Spin points
    T_SPIN: {
      MINI: {
        0: 100,   // Mini T-Spin no lines
        1: 200,   // Mini T-Spin Single
        2: 400    // Mini T-Spin Double (rare)
      },
      REGULAR: {
        0: 400,   // T-Spin no lines
        1: 800,   // T-Spin Single
        2: 1200,  // T-Spin Double
        3: 1600   // T-Spin Triple
      }
    },
    
    // Multipliers
    BACK_TO_BACK_MULTIPLIER: 1.5,  // For difficult line clears
    PERFECT_CLEAR_BONUS: {
      1: 800,   // Single line PC
      2: 1200,  // Double line PC
      3: 1800,  // Triple line PC
      4: 2000   // Tetris PC
    },
    
    // Combo points (50 × combo count × level)
    COMBO_MULTIPLIER: 50,
    
    // Drop points
    SOFT_DROP: 1,
    HARD_DROP: 2,
    
    LINES_PER_LEVEL: 10
  },
  
  // Movement
  MOVEMENT: {
    MAX_MOVES_BEFORE_LOCK: 15,   // Standard infinity
    MAX_LOCK_RESETS: 15          // Maximum lock delay resets
  },
  
  // Storage keys
  STORAGE: {
    GAME_STATE: 'blocks_game_state',
    HIGH_SCORE: 'blocks_high_score',
    ANIMATIONS_ENABLED: 'blocks_animations_enabled',
    MOUSE_CONTROL_ENABLED: 'blocks_mouse_control_enabled',
    TOUCH_BUTTONS_ENABLED: 'blocks_touch_buttons_enabled'
  },
  
  // Visual
  VISUAL: {
    NEXT_PIECES_COUNT: 3,
    GHOST_OPACITY: 0.25
  },
  
  // Speed calculation - Modern Tetris speed curve
  getDropSpeed(level) {
    // Speed curve based on Tetris Guidelines
    const speeds = [
      1000,  // Level 1
      793,   // Level 2
      618,   // Level 3
      473,   // Level 4
      355,   // Level 5
      262,   // Level 6
      190,   // Level 7
      135,   // Level 8
      94,    // Level 9
      64,    // Level 10
      43,    // Level 11
      28,    // Level 12
      18,    // Level 13
      11,    // Level 14
      7,     // Level 15
      5,     // Level 16+
    ];
    
    if (level <= 0) return speeds[0];
    if (level > speeds.length) return speeds[speeds.length - 1];
    return speeds[level - 1];
  }
};