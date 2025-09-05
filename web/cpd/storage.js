// storage.js - Centralized state management with localStorage persistence

(function(global) {
  'use strict';

  const STORAGE_KEY = 'cpd-state';
  const STORAGE_VERSION = 1;

  // Default state
  const defaultState = {
    version: STORAGE_VERSION,
    n: 4,
    r: 7,
    components: [],
    activeComponent: 0,
    activeLayer: -1,
    autoRotate: true,
    showConflicts: false,
    showLayers: false,
    // View settings
    cameraPosition: { x: 10, y: 10, z: 10 },
    tensorRotation: { x: -Math.PI / 6, y: Math.PI / 4 }
  };

  class StateManager {
    constructor() {
      this.state = this.loadState();
      this.listeners = [];
    }

    // Load state from localStorage or use defaults
    loadState() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return { ...defaultState };
        
        const parsed = JSON.parse(saved);
        
        // Version check
        if (parsed.version !== STORAGE_VERSION) {
          console.log('Storage version mismatch, using defaults');
          return { ...defaultState };
        }
        
        // Merge with defaults to ensure all properties exist
        return { ...defaultState, ...parsed };
      } catch (e) {
        console.warn('Failed to load state:', e);
        return { ...defaultState };
      }
    }

    // Save current state to localStorage
    saveState() {
      try {
        const toSave = {
          version: this.state.version,
          n: this.state.n,
          r: this.state.r,
          components: this.state.components,
          activeComponent: this.state.activeComponent,
          activeLayer: this.state.activeLayer,
          autoRotate: this.state.autoRotate,
          showConflicts: this.state.showConflicts,
          showLayers: this.state.showLayers,
          cameraPosition: this.state.cameraPosition,
          tensorRotation: this.state.tensorRotation
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch (e) {
        console.warn('Failed to save state:', e);
      }
    }

    // Get state value
    get(key) {
      return this.state[key];
    }

    // Set state value and save
    set(key, value) {
      if (this.state[key] === value) return;
      
      this.state[key] = value;
      this.saveState();
      this.notifyListeners(key, value);
    }

    // Update multiple values at once
    update(updates) {
      let hasChanges = false;
      const changedKeys = [];
      
      for (const [key, value] of Object.entries(updates)) {
        if (this.state[key] !== value) {
          this.state[key] = value;
          changedKeys.push(key);
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        this.saveState();
        changedKeys.forEach(key => this.notifyListeners(key, this.state[key]));
      }
    }

    // Subscribe to state changes
    subscribe(listener) {
      this.listeners.push(listener);
      return () => {
        const idx = this.listeners.indexOf(listener);
        if (idx > -1) this.listeners.splice(idx, 1);
      };
    }

    // Notify listeners of changes
    notifyListeners(key, value) {
      this.listeners.forEach(listener => listener(key, value));
    }

    // Reset to defaults
    reset() {
      this.state = { ...defaultState };
      this.saveState();
      this.listeners.forEach(listener => listener('reset', null));
    }

    // Get all state
    getAll() {
      return { ...this.state };
    }
  }

  // Create singleton instance
  const storage = new StateManager();

  // Export to global scope
  global.Storage = storage;

})(window);