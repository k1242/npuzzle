// Storage key
const STORAGE_KEY = 'masyuGame';

// Save game state to localStorage
const saveGame = state => {
  try {
    const data = {
      settings: {
        n: state.settings.n,
        circles: state.settings.circles
      },
      circles: state.circles,
      lines: state.lines,
      solved: state.solved,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Failed to save game:', e);
    return false;
  }
};

// Load game state from localStorage
const loadGame = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    
    const data = JSON.parse(saved);
    
    // Validate loaded data
    if (!data.settings || !data.circles) {
      return null;
    }
    
    return {
      settings: data.settings,
      circles: data.circles || [],
      lines: data.lines || {},
      solved: data.solved || false
    };
  } catch (e) {
    console.error('Failed to load game:', e);
    return null;
  }
};

// Clear saved game
const clearSavedGame = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('Failed to clear saved game:', e);
    return false;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STORAGE_KEY,
    saveGame,
    loadGame,
    clearSavedGame
  };
}