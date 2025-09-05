// storage.js - Simplified state management
(function(global) {
  'use strict';

  const STORAGE_KEY = 'cpd-state';

  // Default state
  const defaults = {
    n: 4,
    r: 7,
    components: [],
    activeComponent: 0,
    activeLayer: -1,
    autoRotate: true,
    showConflicts: false,
    showLayers: false,
    cameraDistance: 17.3 // simplified from x,y,z position
  };

  // Load state from localStorage
  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaults, ...JSON.parse(saved) } : { ...defaults };
    } catch {
      return { ...defaults };
    }
  }

  // Save state to localStorage
  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }

  // Create state object with auto-save on property changes
  const state = new Proxy(load(), {
    set(target, prop, value) {
      if (target[prop] !== value) {
        target[prop] = value;
        save(target);
      }
      return true;
    }
  });

  // Helper to update multiple properties at once
  state.update = function(updates) {
    Object.assign(this, updates);
    save(this);
  };

  // Reset to defaults
  state.reset = function() {
    Object.assign(this, defaults);
    save(this);
  };

  global.Storage = state;

})(window);