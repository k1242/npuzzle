// Constants
const MIN_SIZE = 3;
const MAX_SIZE = 15; // Increased for new encoding format

// Game state
const $ = sel => document.querySelector(sel);
const settings = { n: 4, circles: 20 };
let circles = [], lines = {}, solved = false;
let invalidCircles = new Set(), hoverLine = null;

// Load modules (in production these would be imported)
// For now, assuming functions are available in global scope
// Functions from loop-generator.js: generateLoop, isSingleLoop, cellEdges, INITIAL_STEPS, MAX_STEPS, STEP_INCREMENT
// Functions from encoder.js: encode, decode
// Functions from renderer.js: applyCSS, getCellSize, createLine, render
// Functions from storage.js: saveGame, loadGame
// Functions from utils.js: edgeKey, placeCircles, validateSolution

// Update UI values
const updateUIValues = () => {
  $('#nVal').textContent = settings.n;
  $('#circlesVal').textContent = settings.circles + '%';
};

// Check solution and update state
const checkSolution = () => {
  const result = validateSolution(lines, circles, settings.n, isSingleLoop);
  const nowSolved = result.isValid;
  
  if (nowSolved !== solved) {
    solved = nowSolved;
    $('#boardArea').classList.toggle('solved', solved);
    if (solved) {
      CorrectNotification.show();
    } else {
      CorrectNotification.hide();
    }
  }
  
  invalidCircles = result.invalidCircles;
  renderGame();
};

// Render the game
const renderGame = (shouldSave = true) => {
  render(settings, circles, lines, invalidCircles, edgeKey);
  const code = encode(settings, circles);
  $('#codeInput').value = code;
  if (shouldSave) {
    saveGame({ settings, circles, lines, solved });
  }
};

// Generate new game
const newGame = () => {
  let steps = INITIAL_STEPS, edges, validGame;
  
  do {
    const result = generateLoop(settings.n, steps);
    edges = result.edges;
    
    const tempCircles = placeCircles(edges, 100);
    const hasWhite = tempCircles.some(c => c.type === 'white');
    const hasBlack = tempCircles.some(c => c.type === 'black');
    validGame = hasWhite && hasBlack;
    
    if (!validGame) steps += STEP_INCREMENT;
  } while (!validGame && steps < MAX_STEPS);
  
  circles = placeCircles(edges, settings.circles);
  
  // Ensure variety for reasonable density
  if (settings.circles >= 20 && circles.length >= 2) {
    let hasWhite = circles.some(c => c.type === 'white');
    let hasBlack = circles.some(c => c.type === 'black');
    
    let attempts = 0;
    while ((!hasWhite || !hasBlack) && attempts < 5) {
      circles = placeCircles(edges, Math.min(100, settings.circles + attempts * 10));
      hasWhite = circles.some(c => c.type === 'white');
      hasBlack = circles.some(c => c.type === 'black');
      attempts++;
    }
  }
  
  lines = {};
  solved = false;
  invalidCircles.clear();
  $('#boardArea').classList.remove('solved');
  CorrectNotification.hide();
  renderGame();
};

// Input handlers
const handleEdgeClick = e => {
  const edge = e.target.closest('.edge');
  if (!edge) return;
  
  const key = edge.dataset.edge;
  lines[key] = !lines[key];
  checkSolution();
};

const handleEdgeHover = e => {
  const edge = e.target.closest('.edge');
  if (!edge) return;
  
  const key = edge.dataset.edge;
  
  if (hoverLine) {
    hoverLine.remove();
    hoverLine = null;
  }
  
  if (!lines[key]) {
    const [p1, p2] = key.split('-');
    const [r1, c1] = p1.split(',').map(Number);
    const [r2, c2] = p2.split(',').map(Number);
    
    hoverLine = createLine(r1, c1, r2, c2, 'line hover');
    $('#gameGrid').appendChild(hoverLine);
  }
};

const handleMouseLeave = () => {
  if (hoverLine) {
    hoverLine.remove();
    hoverLine = null;
  }
};

// Game-specific handlers
const setupGameHandlers = () => {
  $('#newBtn').onclick = () => {
    newGame();
    $('#panel').classList.remove('open');
    $('#menuBtn').classList.remove('active');
  };
  
  $('#gameGrid').addEventListener('click', handleEdgeClick);
  $('#gameGrid').addEventListener('mouseover', handleEdgeHover);
  $('#gameGrid').addEventListener('mouseleave', handleMouseLeave);
  
  $('#clearBtn').onclick = () => {
    lines = {};
    solved = false;
    invalidCircles.clear();
    $('#boardArea').classList.remove('solved');
    CorrectNotification.hide();
    checkSolution();
  };
  
  $('#loadCodeBtn').onclick = () => {
    const input = $('#codeInput').value.trim();
    const decoded = decode(input);
    if (decoded) {
      settings.n = decoded.n;
      settings.circles = decoded.circlesPercent;
      circles = decoded.circles;
      lines = {};
      solved = false;
      invalidCircles.clear();
      
      applyCSS(settings);
      updateUIValues();
      checkSolution();
    } else {
      alert('Invalid code format. Check the browser console (F12) for details.\n\nValid examples:\n• 4 (empty 4x4 board)\n• 5001110 (5x5 with white at 0,0 and black at 1,1)\n• 6231540 (6x6 with white at 2,3 and white at 5,4)\n\nFormat: [size][col][row][type]...\nSize: 3-F, Coordinates: 0 to size (inclusive), Type: 0=white, 1=black');
    }
  };
  
  $('#codeInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('#loadCodeBtn').click();
  });
  
  // Help modal
  $('#helpLink').onclick = e => {
    e.preventDefault();
    $('#helpModal').style.display = 'flex';
  };
  
  $('#closeHelp').onclick = () => {
    $('#helpModal').style.display = 'none';
  };
  
  $('#helpModal').onclick = e => {
    if (e.target === $('#helpModal')) {
      $('#helpModal').style.display = 'none';
    }
  };
  
  window.addEventListener('resize', () => {
    applyCSS(settings);
    render(settings, circles, lines, invalidCircles, edgeKey);
  });
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize common components
  initCommonUI();
  
  // 2. Initialize steppers
  initSteppers({
    n: (increment) => {
      settings.n = Math.max(MIN_SIZE, Math.min(MAX_SIZE, settings.n + increment));
      updateUIValues();
      applyCSS(settings);
      newGame();
    },
    circles: (increment) => {
      settings.circles = Math.max(0, Math.min(100, settings.circles + increment * 10));
      updateUIValues();
      newGame();
    }
  });
  
  // 3. Initialize copy button
  initCopyButton(() => encode(settings, circles));
  
  // 4. Game-specific handlers
  setupGameHandlers();
  
  // 5. Load saved game or create new
  applyCSS(settings);
  updateUIValues();
  
  const savedGame = loadGame();
  if (savedGame) {
    // Validate saved game data
    if (savedGame.settings.n >= MIN_SIZE && savedGame.settings.n <= MAX_SIZE) {
      settings.n = savedGame.settings.n || 4;
      settings.circles = savedGame.settings.circles || 20;
      circles = savedGame.circles || [];
      lines = savedGame.lines || {};
      solved = savedGame.solved || false;
      applyCSS(settings);
      updateUIValues();
      checkSolution();
    } else {
      // Invalid saved game, start fresh
      newGame();
    }
  } else {
    newGame();
  }
});