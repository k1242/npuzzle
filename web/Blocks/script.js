// ====== BLOCKS GAME - MAIN SCRIPT ======

import { GameEngine } from './engine.js';
import { Renderer } from './renderer.js';
import { InputController } from './controller.js';
import { StorageManager } from './storage.js';
import { Config } from './config.js';

// App state
const app = {
  engine: null,
  renderer: null,
  controller: null,
  storage: null,
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
  // Create storage manager if not exists
  if (!app.storage) {
    app.storage = new StorageManager(Config);
  }
  
  app.settings = app.storage.loadSettings();
  
  // Apply settings to UI
  $('#animationsToggle').checked = app.settings.animationsEnabled;
  $('#mouseControlToggle').checked = app.settings.mouseControlEnabled;
};

const saveSettings = () => {
  if (app.storage) {
    app.storage.saveSettings(app.settings);
  }
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
  // Create storage manager if not exists
  if (!app.storage) {
    app.storage = new StorageManager(Config);
  }
  
  // Create game engine (which is also the event bus)
  app.engine = new GameEngine();
  
  // Create renderer with DOM elements
  app.renderer = new Renderer({
    board: $('#board'),
    score: $('#score'),
    level: $('#level'),
    lines: $('#lines'),
    scoreMobile: $('#scoreMobile'),
    levelMobile: $('#levelMobile'),
    linesMobile: $('#linesMobile'),
    nextQueue: $('#nextQueue'),
    nextQueueMobile: $('#nextQueueMobile'),
    holdPreview: $('#holdPreview'),
    holdPreviewMobile: $('#holdPreviewMobile'),
    pausedOverlay: $('#pausedOverlay'),
    app: $('#app')
  }, app.engine); // Pass event bus
  
  // Create input controller
  app.controller = new InputController(app.engine, app.renderer);
  
  // Subscribe to controller-specific events
  app.engine.on(Config.EVENTS.GAME_OVER, () => {
    app.controller.reset();
  });
  
  app.engine.on(Config.EVENTS.PIECE_SPAWNED, () => {
    app.controller.onNewPiece();
  });
  
  // Apply loaded settings
  app.renderer.setAnimationsEnabled(app.settings.animationsEnabled);
  app.controller.setMouseControl(app.settings.mouseControlEnabled);
  
  // Try to load saved game
  if (app.engine.loadState()) {
    app.engine.updateGhost();
    app.engine.emitStateUpdate();
    
    const state = app.engine.getState();
    if (state.paused) {
      app.engine.emit(Config.EVENTS.GAME_PAUSE);
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
    app.engine.emit(Config.EVENTS.ANIMATION_TOGGLE, app.settings.animationsEnabled);
    saveSettings();
  });
  
  $('#mouseControlToggle').addEventListener('change', e => {
    app.settings.mouseControlEnabled = e.target.checked;
    app.controller.setMouseControl(app.settings.mouseControlEnabled);
    app.engine.emit(Config.EVENTS.MOUSE_CONTROL_TOGGLE, app.settings.mouseControlEnabled);
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
});