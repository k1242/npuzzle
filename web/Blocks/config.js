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
    
    // Settings events
    ANIMATION_TOGGLE: 'settings:animation',
    MOUSE_CONTROL_TOGGLE: 'settings:mouse_control'
  },
  
  // Timing (ms)
  TIMING: {
    LOCK_DELAY: 500,
    DAS_DELAY: 150,  // Delayed Auto Shift
    ARR_DELAY: 30,   // Auto Repeat Rate
    LINE_CLEAR_ANIMATION: 200,
    FALLING_ANIMATION: 100,
    HARD_DROP_SPEED: 3, // min ms per cell
    TOUCH_SWIPE_THRESHOLD: 50,
    TOUCH_MOVE_THRESHOLD: 10,
    MOUSE_SMOOTHING_WINDOW: 50
  },
  
  // Scoring
  SCORING: {
    LINES: [0, 100, 300, 500, 800], // 0-4 lines
    SOFT_DROP: 1,
    HARD_DROP: 2,
    LINES_PER_LEVEL: 10
  },
  
  // Movement
  MOVEMENT: {
    MAX_MOVES_BEFORE_LOCK: 15
  },
  
  // Storage keys
  STORAGE: {
    GAME_STATE: 'blocks_game_state',
    HIGH_SCORE: 'blocks_high_score',
    ANIMATIONS_ENABLED: 'blocks_animations_enabled',
    MOUSE_CONTROL_ENABLED: 'blocks_mouse_control_enabled'
  },
  
  // Visual
  VISUAL: {
    CELL_SIZE: {
      DESKTOP: 26,
      TABLET: 28,
      MOBILE: 22
    },
    NEXT_PIECES_COUNT: 3,
    GHOST_OPACITY: 0.25
  },
  
  // Responsive breakpoints
  BREAKPOINTS: {
    MOBILE: 768,
    NARROW: 400
  },
  
  // Speed calculation
  getDropSpeed(level) {
    return Math.max(50, 1000 - (level - 1) * 100);
  }
};