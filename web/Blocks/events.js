// ====== EVENT SYSTEM ======

export class EventEmitter {
  constructor() {
    this.events = {};
  }
  
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
    
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
  
  once(event, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }
  
  clear() {
    this.events = {};
  }
}

// Game events constants
export const GameEvents = {
  // Board events
  BOARD_UPDATE: 'board:update',
  LINES_CLEARED: 'board:lines_cleared',
  
  // Piece events
  PIECE_SPAWNED: 'piece:spawned',
  PIECE_LOCKED: 'piece:locked',
  PIECE_MOVED: 'piece:moved',
  PIECE_ROTATED: 'piece:rotated',
  
  // Game state events
  GAME_START: 'game:start',
  GAME_OVER: 'game:over',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  
  // Score events
  SCORE_UPDATE: 'score:update',
  LEVEL_UPDATE: 'level:update',
  STATS_UPDATE: 'stats:update',
  
  // Hold/Next events
  HOLD_UPDATE: 'hold:update',
  NEXT_QUEUE_UPDATE: 'next:update',
  
  // Settings events
  ANIMATION_TOGGLE: 'settings:animation',
  MOUSE_CONTROL_TOGGLE: 'settings:mouse_control'
};