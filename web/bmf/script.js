// script.js - Main game logic
// Requires: utils.js, storage.js, encoder.js, renderer.js, tutorial.js

/* ====== GAME STATE ====== */
const settings = { n: 5, r: 3, mode: 'mod' };
let solved = false, wasSolved = false, state, target;
let editorMode = false;
let savedBeforeEditor = null;
let initializing = true;

/* ====== STATE MANAGEMENT ====== */
const initState = () => {
  state = {
    U: Array.from({ length: settings.r }, () => Array(settings.n).fill(0)),
    V: Array.from({ length: settings.r }, () => Array(settings.n).fill(0)),
    cur: 0
  };
};

const genTarget = () => {
  target = Array.from({ length: settings.n }, () => Array(settings.n).fill(0));
  
  for (let k = 0; k < settings.r; k++) {
    const tU = Array.from({ length: settings.n }, rnd);
    const tV = Array.from({ length: settings.n }, rnd);
    
    for (let i = 0; i < settings.n; i++)
      if (tU[i])
        for (let j = 0; j < settings.n; j++)
          if (tV[j])
            settings.mode === 'bool' ? (target[i][j] = 1) : (target[i][j] ^= 1);
  }
};

const player = () => {
  const P = Array.from({ length: settings.n }, () => Array(settings.n).fill(0));
  for (let k = 0; k < settings.r; k++)
    for (let i = 0; i < settings.n; i++)
      if (state.U[k][i])
        for (let j = 0; j < settings.n; j++)
          if (state.V[k][j])
            settings.mode === 'bool' ? (P[i][j] = 1) : (P[i][j] ^= 1);
  return P;
};

/* ====== EDITOR MODE ====== */
const enterEditorMode = () => {
  // save current state
  savedBeforeEditor = {
    settings: {...settings},
    target: target ? [...target.map(row => [...row])] : null,
    state: state ? JSON.parse(JSON.stringify(state)) : null,
    wasSolved,
    solved
  };
  
  editorMode = true;
  CorrectNotification.hide();
  
  // Clear all toggles
  state.U.forEach(u => u.fill(0));
  state.V.forEach(v => v.fill(0));
  
  render();
};

const exitEditorMode = () => {
  editorMode = false;
  $('#editorToggle').checked = false;
  
  // restore saved state
  if (savedBeforeEditor) {
    Object.assign(settings, savedBeforeEditor.settings);
    target = savedBeforeEditor.target;
    state = savedBeforeEditor.state;
    wasSolved = savedBeforeEditor.wasSolved;
    solved = savedBeforeEditor.solved;
    
    updateUIValues();
    updateModeButtons();
    applyCSS();
    render();
    // Calculate scale after render
    setTimeout(calculateScale, 0);
    
    if (solved) CorrectNotification.show();
  }
  
  savedBeforeEditor = null;
};

/* ====== UI EVENTS ====== */
const setupEventHandlers = () => {
  $('#newBtn').onclick = () => {
    if (editorMode) {
      $('#editorToggle').checked = false;
      exitEditorMode();
    }
    newGame();
    $('#panel').classList.remove('open');
    $('#menuBtn').classList.remove('active');
  };

  // editor mode toggle
  $('#editorToggle').onchange = e => {
    if (e.target.checked) {
      enterEditorMode();
    } else {
      exitEditorMode();
    }
  };

  // delegated events for toggles and cards
  $('#app').addEventListener('click', e => {
    const tgt = e.target.closest('[data-row],[data-col],[data-card]');
    if (!tgt) return;

    if (tgt.dataset.row !== undefined)
      state.U[state.cur][+tgt.dataset.row] ^= 1;
    else if (tgt.dataset.col !== undefined)
      state.V[state.cur][+tgt.dataset.col] ^= 1;
    else
      state.cur = +tgt.dataset.card;

    render();
  });

  $('#clearBtn').onclick = () => {
    state.U.forEach(u => u.fill(0));
    state.V.forEach(v => v.fill(0));
    solved = false;
    render();
  };

  // load code
  $('#loadCodeBtn').onclick = () => {
    if (editorMode) {
      $('#editorToggle').checked = false;
      exitEditorMode();
    }
    if (!loadFromCode($('#codeInput').value.trim())) alert('Invalid code');
  };
  
  $('#codeInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('#loadCodeBtn').click();
  });

  // mode buttons
  $('#orBtn').onclick = () => {
    settings.mode = 'bool';
    updateModeButtons();
    if (!editorMode) newGame();
    else render();
  };
  
  $('#xorBtn').onclick = () => {
    settings.mode = 'mod';
    updateModeButtons();
    if (!editorMode) newGame();
    else render();
  };

  $('#helpLink').onclick = e => {
    e.preventDefault();
    if (editorMode) exitEditorMode();
    Tutorial.start();
  };

  // window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      applyCSS();
      render();
      setTimeout(calculateScale, 0);
    }, 100);
  });
};

/* ====== GAME OPERATIONS ====== */
const newGame = () => {
  applyCSS();
  initState();
  genTarget();
  solved = false;
  wasSolved = false;
  render();
  // Calculate scale after render
  setTimeout(calculateScale, 0);
};

/* ====== INITIALIZATION ====== */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize common UI
  initCommonUI();
  
  // Initialize steppers
  initSteppers({
    n: (inc) => {
      settings.n = Math.max(2, Math.min(10, settings.n + inc));
      $('#nVal').textContent = settings.n;
      if (!editorMode) newGame();
      else {
        applyCSS();
        initState();
        render();
        setTimeout(calculateScale, 0);
      }
    },
    r: (inc) => {
      settings.r = Math.max(1, Math.min(6, settings.r + inc));
      $('#rVal').textContent = settings.r;
      if (!editorMode) newGame();
      else {
        initState();
        render();
      }
    }
  });
  
  // Initialize copy button
  initCopyButton(() => encode());
  
  // Setup game-specific handlers
  setupEventHandlers();
  updateUIValues();

  // Load saved game or create new
  if (!loadSavedGame()) {
    newGame();
  } else {
    render();
    // Calculate scale after render
    setTimeout(calculateScale, 0);
  }
  
  initializing = false;
});