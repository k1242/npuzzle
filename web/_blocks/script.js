// ====== BLOCKS GAME - MAIN SCRIPT ======

import { GameEngine } from './engine.js';
import { Renderer } from './renderer.js';
import { InputController } from './controller.js';
import { GameEvents } from './events.js';

// Settings keys
const ANIMATIONS_KEY = 'blocks_animations_enabled';
const MOUSE_CONTROL_KEY = 'blocks_mouse_control_enabled';

// App state
const app = {
  engine: null,
  renderer: null,
  controller: null,
  settings: {
    animationsEnabled: true,
    mouseControlEnabled: false,
    pausedBySettings: false,
    wasGamePaused: false
  }
};

// DOM helper
const $ = sel => document.querySelector(sel);

// Settings management
const loadSettings = () => {
  // Load animations setting
  const animSaved = localStorage.getItem(ANIMATIONS_KEY);
  app.settings.animationsEnabled = animSaved === null ? true : animSaved === 'true';
  
  // Load mouse control setting
  const mouseSaved = localStorage.getItem(MOUSE_CONTROL_KEY);
  app.settings.mouseControlEnabled = mouseSaved === 'true';
  
  // Apply settings to UI
  $('#animationsToggle').checked = app.settings.animationsEnabled;
  $('#mouseControlToggle').checked = app.settings.mouseControlEnabled;
};

const saveSettings = () => {
  localStorage.setItem(ANIMATIONS_KEY, app.settings.animationsEnabled);
  localStorage.setItem(MOUSE_CONTROL_KEY, app.settings.mouseControlEnabled);
};

// Settings panel pause handling
const handleSettingsPanelToggle = (isOpen) => {
  const state = app.engine.getState();
  if (state.gameOver) return;
  
  if (isOpen) {
    // Opening settings
    app.settings.wasGamePaused = state.paused;
    if (!state.paused) {
      app.settings.pausedBySettings = true;
      app.engine.togglePause();
    }
  } else {
    // Closing settings
    if (app.settings.pausedBySettings && state.paused) {
      app.settings.pausedBySettings = false;
      app.engine.togglePause();
    }
  }
};

// Initialize game
const initGame = () => {
  // Create game engine (which is also the event bus)
  app.engine = new GameEngine();
  
  // Create renderer with DOM elements
  app.renderer = new Renderer({
    board: $('#board'),
    score: $('#score'),
    level: $('#level'),
    lines: $('#lines'),
    nextQueue: $('#nextQueue'),
    nextQueueDesktop: $('#nextQueueDesktop'),
    holdPreview: $('#holdPreview'),
    pausedOverlay: $('#pausedOverlay'),
    app: $('#app'),
    // Mobile elements
    scoreMobile: $('#score-mobile'),
    levelMobile: $('#level-mobile'),
    linesMobile: $('#lines-mobile')
  }, app.engine); // Pass event bus
  
  // Create input controller
  app.controller = new InputController(app.engine, app.renderer);
  
  // Subscribe to controller-specific events
  app.engine.on(GameEvents.GAME_OVER, () => {
    app.controller.reset();
  });
  
  app.engine.on(GameEvents.PIECE_SPAWNED, () => {
    app.controller.onNewPiece();
  });
  
  // Apply loaded settings
  app.renderer.setAnimationsEnabled(app.settings.animationsEnabled);
  app.engine.setAnimationsEnabled(app.settings.animationsEnabled);
  app.controller.setMouseControl(app.settings.mouseControlEnabled);
  
  // Try to load saved game
  if (app.engine.loadState()) {
    app.engine.updateGhost();
    // Emit all necessary events to update the UI
    app.engine.emit(GameEvents.STATS_UPDATE, app.engine.getState());
    app.engine.emit(GameEvents.NEXT_QUEUE_UPDATE, app.engine.getState());
    app.engine.emit(GameEvents.HOLD_UPDATE, app.engine.getState());
    app.engine.emit(GameEvents.BOARD_UPDATE, app.engine.getState());
    
    const state = app.engine.getState();
    if (state.paused) {
      app.engine.emit(GameEvents.GAME_PAUSE);
    }
  } else {
    app.engine.startNewGame();
  }
};

// Setup UI handlers
const setupUIHandlers = () => {
  // New game button
  $('#newBtn').addEventListener('click', () => {
    app.engine.startNewGame();
  });
  
  // Settings toggles
  $('#animationsToggle').addEventListener('change', e => {
    app.settings.animationsEnabled = e.target.checked;
    app.renderer.setAnimationsEnabled(app.settings.animationsEnabled);
    app.engine.setAnimationsEnabled(app.settings.animationsEnabled);
    app.engine.emit(GameEvents.ANIMATION_TOGGLE, app.settings.animationsEnabled);
    saveSettings();
  });
  
  $('#mouseControlToggle').addEventListener('change', e => {
    app.settings.mouseControlEnabled = e.target.checked;
    app.controller.setMouseControl(app.settings.mouseControlEnabled);
    app.engine.emit(GameEvents.MOUSE_CONTROL_TOGGLE, app.settings.mouseControlEnabled);
    saveSettings();
  });
  
  // Override common.js menu behavior to add pause handling
  const menuBtn = $('#menuBtn');
  const panel = $('#panel');
  
  if (menuBtn && panel) {
    // Remove the default handler
    menuBtn.onclick = null;
    
    // Add our custom handler
    menuBtn.addEventListener('click', () => {
      const isOpening = !panel.classList.contains('open');
      panel.classList.toggle('open');
      menuBtn.classList.toggle('active');
      handleSettingsPanelToggle(isOpening);
    });
  }
  
  // Help modal
  $('#helpLink').addEventListener('click', e => {
    e.preventDefault();
    const state = app.engine.getState();
    if (!state.paused && !state.gameOver) {
      app.engine.togglePause();
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
  
  // Handle window resize
  window.addEventListener('resize', () => {
    app.controller.updateBoardRect();
    app.renderer.updateCellSize();
  });
};

// Handle next queue duplication for desktop
const syncNextQueues = () => {
  const mobileNext = $('#nextQueue');
  const desktopNext = $('#nextQueueDesktop');
  
  if (mobileNext && desktopNext) {
    // Mirror content from mobile to desktop
    app.engine.on(GameEvents.NEXT_QUEUE_UPDATE, () => {
      // Small delay to ensure mobile is rendered first
      setTimeout(() => {
        desktopNext.innerHTML = mobileNext.innerHTML;
      }, 0);
    });
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize common UI components
  initCommonUI();
  
  // Load settings
  loadSettings();
  
  // Initialize game
  initGame();
  
  // Setup UI handlers
  setupUIHandlers();
  
  // Setup next queue syncing
  syncNextQueues();
});