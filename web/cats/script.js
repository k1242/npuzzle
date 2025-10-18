/* ====== MAIN GAME CONTROLLER ====== */

// Game instances
let engine = null;
let renderer = null;
let storage = null;

// New game confirmation state
let confirmingNewGame = false;
let confirmTimeout = null;

// Settings storage key
const SETTINGS_KEY = 'cats-game-settings';

// Load settings from localStorage
function loadSettings() {
  try {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return {
    boopingEnabled: true
  };
}

// Save settings to localStorage
function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// Initialize game
function initGame() {
  engine = new GameEngine();
  renderer = new GameRenderer();
  storage = new GameStorage();
  
  // Load settings
  const settings = loadSettings();
  
  // Setup event handlers
  setupEventHandlers();
  
  // Apply settings to UI
  const boopToggle = document.getElementById('enableBoop');
  if (boopToggle) {
    boopToggle.checked = settings.boopingEnabled;
  }
  
  // Check for saved game
  if (storage.hasSavedGame()) {
    const savedState = storage.loadGame();
    if (savedState && !savedState.gameOver) {
      engine.state = savedState;
      // Apply booping setting from saved settings, not from saved game state
      engine.setBoopingEnabled(settings.boopingEnabled);
    } else {
      // Apply settings to new game
      engine.setBoopingEnabled(settings.boopingEnabled);
    }
  } else {
    // Apply settings to new game
    engine.setBoopingEnabled(settings.boopingEnabled);
  }
  
  // Auto-select first available piece
  autoSelectPiece();
  
  // Initial render
  render();
}

// Setup all event handlers
function setupEventHandlers() {
  // Common UI initialization
  initCommonUI();
  
  // New game button
  const newBtn = document.getElementById('newBtn');
  newBtn.addEventListener('click', handleNewGame);
  
  // Cancel confirmation on outside click
  document.addEventListener('click', (e) => {
    if (confirmingNewGame && !e.target.closest('#newBtn')) {
      cancelNewGameConfirmation();
    }
  });
  
  // Board clicks
  document.getElementById('board').addEventListener('click', handleBoardClick);
  
  // Piece selection clicks
  document.getElementById('pieceOptions').addEventListener('click', handlePieceSelection);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);
  
  // Boop toggle
  const boopToggle = document.getElementById('enableBoop');
  if (boopToggle) {
    boopToggle.addEventListener('change', handleBoopToggle);
  }
  
  // Save game on state changes
  window.addEventListener('beforeunload', () => {
    if (!engine.getState().gameOver) {
      storage.saveGame(engine.getState());
    }
  });
}

// Handle new game with confirmation
function handleNewGame(e) {
  e.stopPropagation();
  const newBtn = document.getElementById('newBtn');
  
  if (confirmingNewGame) {
    // Confirmed - start new game
    engine.initializeState();
    // Reapply settings to new game
    const settings = loadSettings();
    engine.setBoopingEnabled(settings.boopingEnabled);
    storage.clearSavedGame();
    autoSelectPiece();
    render();
    cancelNewGameConfirmation();
  } else if (!engine.getState().gameOver) {
    // First click - show confirmation
    confirmingNewGame = true;
    newBtn.textContent = 'Confirm?';
    newBtn.classList.add('btn-danger');
    
    // Auto-cancel after 3 seconds
    confirmTimeout = setTimeout(cancelNewGameConfirmation, 3000);
  } else {
    // Game is over, no confirmation needed
    engine.initializeState();
    // Reapply settings to new game
    const settings = loadSettings();
    engine.setBoopingEnabled(settings.boopingEnabled);
    storage.clearSavedGame();
    autoSelectPiece();
    render();
  }
}

// Cancel new game confirmation
function cancelNewGameConfirmation() {
  if (!confirmingNewGame) return;
  
  confirmingNewGame = false;
  const newBtn = document.getElementById('newBtn');
  newBtn.textContent = 'New Game';
  newBtn.classList.remove('btn-danger');
  
  if (confirmTimeout) {
    clearTimeout(confirmTimeout);
    confirmTimeout = null;
  }
}

// Handle board clicks
function handleBoardClick(event) {
  const cell = event.target.closest('.cell');
  if (!cell) return;
  
  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);
  const state = engine.getState();
  
  if (state.graduationMode) {
    handleGraduationClick(row, col);
  } else if (!state.gameOver && state.selectedPiece) {
    handlePiecePlacement(row, col);
  }
}

// Handle piece selection
function handlePieceSelection(event) {
  const button = event.target.closest('.piece-btn');
  if (!button) return;
  
  const piece = button.dataset.piece;
  if (engine.selectPiece(piece)) {
    render();
  }
}

// Handle keyboard shortcuts
function handleKeyboard(event) {
  const state = engine.getState();
  
  if (event.code === 'Space' && !state.gameOver && !state.graduationMode) {
    event.preventDefault();
    togglePieceSelection();
  }
}

// Handle boop toggle
function handleBoopToggle(event) {
  const enabled = event.target.checked;
  engine.setBoopingEnabled(enabled);
  
  // Save setting to localStorage
  const settings = loadSettings();
  settings.boopingEnabled = enabled;
  saveSettings(settings);
}

// Handle piece placement
function handlePiecePlacement(row, col) {
  const state = engine.getState();
  
  if (state.board[row][col] !== null) {
    // Square is occupied - just ignore the click
    return;
  }
  
  if (engine.placePiece(row, col)) {
    // Auto-select piece for next turn if not in graduation mode
    if (!engine.getState().graduationMode) {
      autoSelectPiece();
    }
    
    // Save game state
    if (!engine.getState().gameOver) {
      storage.saveGame(engine.getState());
    } else {
      storage.clearSavedGame();
    }
    
    render();
  }
}

// Handle graduation cell selection
function handleGraduationClick(row, col) {
  if (engine.selectGraduationCell(row, col)) {
    if (!engine.getState().graduationMode) {
      // Graduation completed
      autoSelectPiece();
      
      // Save or clear storage based on game state
      if (!engine.getState().gameOver) {
        storage.saveGame(engine.getState());
      } else {
        storage.clearSavedGame();
      }
    }
    render();
  }
}

// Toggle between available pieces
function togglePieceSelection() {
  const availablePieces = engine.getAvailablePieces();
  const currentPiece = engine.getState().selectedPiece;
  
  if (availablePieces.length > 1) {
    const currentIndex = availablePieces.indexOf(currentPiece);
    const nextIndex = (currentIndex + 1) % availablePieces.length;
    engine.selectPiece(availablePieces[nextIndex]);
    render();
  }
}

// Auto-select first available piece
function autoSelectPiece() {
  const availablePieces = engine.getAvailablePieces();
  if (availablePieces.length > 0) {
    // Prefer kitten over cat
    const player = engine.getState().currentPlayer;
    const kittenType = player === 1 ? 'a' : 'b';
    
    if (availablePieces.includes(kittenType)) {
      engine.selectPiece(kittenType);
    } else {
      engine.selectPiece(availablePieces[0]);
    }
  }
}

// Render current game state
function render() {
  renderer.render(engine.getState());
}

// Make newGame globally available
window.newGame = handleNewGame;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initGame);