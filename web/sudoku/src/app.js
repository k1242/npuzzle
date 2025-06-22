// app.js - Application entry point
import { GameController } from './controllers/GameController.js';
import { initCommonUI } from './utils/common-ui.js';

// Global app instance
let app = null;

// Initialize application
function initApp() {
  // Check if all required elements exist
  const requiredElements = ['board', 'numpad'];
  const missingElements = requiredElements.filter(id => !document.getElementById(id));
  
  if (missingElements.length > 0) {
    console.error('Missing required elements:', missingElements);
    return;
  }
  
  // Initialize common UI components (hamburger menu, game switcher, etc.)
  initCommonUI();
  
  // Create and start the game controller
  app = new GameController();
  
  // Make app accessible globally for debugging
  window.sudokuApp = app;
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Clean up on page unload
window.addEventListener('pagehide', () => {
  if (app) {
    app.destroy();
  }
});