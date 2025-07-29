// ====== STORAGE MANAGER ======

export class StorageManager {
  constructor(config) {
    this.config = config;
  }
  
  // Game state
  saveGameState(state) {
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
    
    localStorage.setItem(this.config.STORAGE.GAME_STATE, JSON.stringify(saveData));
  }
  
  loadGameState() {
    const saved = localStorage.getItem(this.config.STORAGE.GAME_STATE);
    if (!saved) return null;
    
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load game state:', e);
      return null;
    }
  }
  
  clearGameState() {
    localStorage.removeItem(this.config.STORAGE.GAME_STATE);
  }
  
  // High score
  loadHighScore() {
    const saved = localStorage.getItem(this.config.STORAGE.HIGH_SCORE);
    return saved ? parseInt(saved) || 0 : 0;
  }
  
  saveHighScore(score) {
    localStorage.setItem(this.config.STORAGE.HIGH_SCORE, score);
  }
  
  // Settings
  loadSettings() {
    const animSaved = localStorage.getItem(this.config.STORAGE.ANIMATIONS_ENABLED);
    const mouseSaved = localStorage.getItem(this.config.STORAGE.MOUSE_CONTROL_ENABLED);
    
    return {
      animationsEnabled: animSaved === null ? true : animSaved === 'true',
      mouseControlEnabled: mouseSaved === 'true'
    };
  }
  
  saveSettings(settings) {
    localStorage.setItem(this.config.STORAGE.ANIMATIONS_ENABLED, settings.animationsEnabled);
    localStorage.setItem(this.config.STORAGE.MOUSE_CONTROL_ENABLED, settings.mouseControlEnabled);
  }
}