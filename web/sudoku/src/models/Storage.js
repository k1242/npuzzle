// Storage.js - Handle localStorage operations
export class Storage {
  constructor(storageKey = 'sudokuState') {
    this.storageKey = storageKey;
  }

  // Save game state
  save(state) {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(this.storageKey, serialized);
      return true;
    } catch (e) {
      console.error('Failed to save game state:', e);
      return false;
    }
  }

  // Load game state
  load() {
    try {
      const serialized = localStorage.getItem(this.storageKey);
      if (!serialized) return null;
      
      const state = JSON.parse(serialized);
      
      // Validate basic structure
      if (!state || typeof state !== 'object') {
        return null;
      }
      
      // Ensure required fields exist
      if (!state.board || !Array.isArray(state.board)) {
        return null;
      }
      
      return state;
    } catch (e) {
      console.error('Failed to load game state:', e);
      return null;
    }
  }

  // Clear saved game
  clear() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (e) {
      console.error('Failed to clear saved game:', e);
      return false;
    }
  }

  // Check if save exists
  hasSave() {
    return localStorage.getItem(this.storageKey) !== null;
  }
}