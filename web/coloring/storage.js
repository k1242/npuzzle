/* ====== STORAGE FUNCTIONS ====== */

const STORAGE_KEY = 'graphColoringState';

const saveGame = () => {
  // Ensure variables exist
  if (!vertexColors || vertexColors.length === 0) {
    console.warn('Game state not initialized');
    return;
  }
  
  const snapshot = {
    currentPuzzleIndex,
    vertexColors: [...vertexColors],
    solved
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
};

const loadSavedGame = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;
    
    const data = JSON.parse(saved);
    
    // Validate saved data
    if (typeof data.currentPuzzleIndex !== 'number' || 
        !Array.isArray(data.vertexColors)) {
      return false;
    }
    
    // Load the puzzle first
    if (!loadPuzzle(data.currentPuzzleIndex)) {
      return false;
    }
    
    // Apply saved colors (but respect fixed vertices)
    for (let i = 0; i < vertexCount && i < data.vertexColors.length; i++) {
      if (!fixedVertices.has(i)) {
        vertexColors[i] = data.vertexColors[i] || 0;
      }
    }
    
    solved = data.solved || false;
    
    // Update UI
    updatePuzzleNumber();
    CorrectNotification.hide();
    
    // Render the loaded state
    setTimeout(() => render(), 0);
    
    return true;
  } catch (e) {
    console.warn('Failed to load saved game:', e);
    return false;
  }
};

const clearSavedGame = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear saved game:', e);
  }
};

// Make storage functions globally accessible
window.saveGame = saveGame;
window.loadSavedGame = loadSavedGame;
window.clearSavedGame = clearSavedGame;