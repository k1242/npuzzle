/* ====== GAME STORAGE ====== */

class GameStorage {
  constructor() {
    this.storageKey = 'cats-game-state';
  }

  // Save game state to localStorage
  saveGame(gameState) {
    try {
      // Convert Set to Array for JSON serialization
      const stateToSave = {
        ...gameState,
        selectedGraduationCells: Array.from(gameState.selectedGraduationCells)
      };
      
      // Don't save booping setting with game state (it's saved separately)
      delete stateToSave.boopingEnabled;
      
      localStorage.setItem(this.storageKey, JSON.stringify(stateToSave));
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }

  // Load game state from localStorage
  loadGame() {
    try {
      const savedState = localStorage.getItem(this.storageKey);
      if (!savedState) return null;
      
      const parsedState = JSON.parse(savedState);
      
      // Convert Array back to Set
      if (parsedState.selectedGraduationCells) {
        parsedState.selectedGraduationCells = new Set(parsedState.selectedGraduationCells);
      }
      
      // Ensure winningCells is an array (for older saved games)
      if (!parsedState.winningCells) {
        parsedState.winningCells = [];
      }
      
      // Ensure fullBoardGraduation flag exists (for older saved games)
      if (parsedState.fullBoardGraduation === undefined) {
        parsedState.fullBoardGraduation = false;
      }
      
      return parsedState;
    } catch (error) {
      console.error('Failed to load game:', error);
      return null;
    }
  }

  // Clear saved game
  clearSavedGame() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('Failed to clear saved game:', error);
      return false;
    }
  }

  // Check if saved game exists
  hasSavedGame() {
    return localStorage.getItem(this.storageKey) !== null;
  }
}

// Export for use in other modules
window.GameStorage = GameStorage;