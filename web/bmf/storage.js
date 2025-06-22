// storage.js - Local storage operations
// Requires: global settings, state, target variables from script.js

const STORAGE_KEY = 'bmfGameState';

const saveGame = () => {
  if (typeof Tutorial !== 'undefined' && Tutorial.isActive()) return;
  if (editorMode) return; // don't save in editor mode
  
  const snapshot = {
    settings: {
      n: settings.n,
      r: settings.r,
      mode: settings.mode
    },
    target,
    state,
    wasSolved
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    // ignore quota errors
  }
};

const loadSavedGame = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  let snap;
  try {
    snap = JSON.parse(raw);
  } catch {
    return false;
  }

  if (!snap.settings || !snap.target || !snap.state) return false;

  // Apply saved settings
  settings.n = snap.settings.n || 5;
  settings.r = snap.settings.r || 3;
  settings.mode = snap.settings.mode || 'mod';
  
  target = snap.target;
  state = snap.state;
  wasSolved = snap.wasSolved || false;

  // validate structure
  if (!Array.isArray(target) || !Array.isArray(state.U) || !Array.isArray(state.V)) 
    return false;

  applyCSS();
  updateModeButtons();
  updateUIValues();
  // Don't calculate scale here - will do after render

  // recalc solved state
  solved = matEq(player(), target);

  return true;
};