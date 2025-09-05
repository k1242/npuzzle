// script.js - Fixed initialization and visibility issues

// Engine will be initialized after DOM ready
let engine = null;

// Presets data (unchanged)
const PRESETS = {
  naive2x2: {
    n: 4, r: 8,
    u: [[1,0,0,0],[1,0,0,0],[0,1,0,0],[0,1,0,0],[0,0,1,0],[0,0,1,0],[0,0,0,1],[0,0,0,1]],
    v: [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1],[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]],
    w: [[1,0,0,0],[0,0,1,0],[1,0,0,0],[0,0,1,0],[0,1,0,0],[0,0,0,1],[0,1,0,0],[0,0,0,1]]
  },
  strassen: {
    n: 4, r: 7,
    u: [[1,0,0,1],[0,0,1,1],[1,0,0,0],[0,1,0,1],[1,1,0,0],[0,0,0,1],[1,0,1,0]],
    v: [[1,0,0,1],[1,0,0,0],[0,1,0,1],[0,0,1,1],[0,0,0,1],[1,0,1,0],[1,1,0,0]],
    w: [[1,0,0,1],[0,1,0,1],[0,0,1,1],[1,0,0,0],[1,0,1,0],[1,1,0,0],[0,0,0,1]]
  }
};

// Helper functions
const isMobile = () => window.innerWidth <= 768;

function initComponents() {
  const n = Storage.get('n');
  const r = Storage.get('r');
  const components = Array(r).fill(null).map(() => ({
    u: Array(n).fill(0),
    v: Array(n).fill(0),
    w: Array(n).fill(0)
  }));
  Storage.set('components', components);
}

function calcTensorWithConflicts() {
  const n = Storage.get('n');
  const components = Storage.get('components');
  
  const counts = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => Array(n).fill(0))
  );

  for (const comp of components) {
    for (let i = 0; i < n; i++) {
      if (!comp.u[i]) continue;
      for (let j = 0; j < n; j++) {
        if (!comp.v[j]) continue;
        for (let k = 0; k < n; k++) {
          if (comp.w[k]) counts[i][j][k]++;
        }
      }
    }
  }

  const tensor = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => Array(n).fill(0))
  );
  const conflicts = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => Array(n).fill(0))
  );

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        const c = counts[i][j][k];
        tensor[i][j][k] = c % 2;
        conflicts[i][j][k] = c > 0 && (c % 2 === 0);
      }
    }
  }

  return { tensor, conflicts };
}

function updateVisualization(rebuild = false) {
  const { tensor, conflicts } = calcTensorWithConflicts();
  const n = Storage.get('n');
  
  if (rebuild) {
    engine.build(n, tensor, conflicts);
  } else {
    engine.update(n, tensor, conflicts);
  }
  
  renderComponents();
  renderLayers();
}

// Updated updateInfo to show term count
function updateInfo() {
  const n = Storage.get('n');
  const r = Storage.get('r');
  
  // Count non-empty terms
  const components = Storage.get('components');
  let nonEmptyCount = 0;
  
  if (components) {
    for (const comp of components) {
      // Check if at least one vector in the component is non-zero
      const hasU = comp.u.some(bit => bit === 1);
      const hasV = comp.v.some(bit => bit === 1);
      const hasW = comp.w.some(bit => bit === 1);
      if (hasU && hasV && hasW) {
        nonEmptyCount++;
      }
    }
  }
  
  document.getElementById('info').textContent = `${n}×${n}×${n} tensor (${nonEmptyCount} terms)`;
  document.getElementById('sizeVal').textContent = n;
  document.getElementById('compVal').textContent = r;
}

/** Update layers visibility - Fixed version */
function updateLayersVisibility() {
  const showLayers = Storage.get('showLayers');
  const container = document.getElementById('container');
  
  console.log('Updating layers visibility:', showLayers);

  if (container) {
    if (showLayers) {
      container.classList.add('layers-visible');
    } else {
      container.classList.remove('layers-visible');
    }
  }
  
  // Immediate resize
  if (engine) {
    engine.handleResize();
  }
}

// Render component cards
function renderComponents() {
  const container = document.getElementById('components');
  const components = Storage.get('components');
  const n = Storage.get('n');
  const activeComponent = Storage.get('activeComponent');
  
  container.innerHTML = '';

  const labelsDiv = document.createElement('div');
  labelsDiv.className = 'vector-labels';
  ['u', 'v', 'w'].forEach(label => {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'vector-label-item';
    labelDiv.textContent = label;
    labelsDiv.appendChild(labelDiv);
  });
  container.appendChild(labelsDiv);

  let bitSizeClass = '';
  if (n > 8) bitSizeClass = 'tiny';
  else if (n > 5) bitSizeClass = 'small';

  components.forEach((comp, idx) => {
    const card = document.createElement('div');
    card.className = `component ${idx === activeComponent ? 'active' : ''}`;
    card.onclick = () => {
      Storage.set('activeComponent', idx);
      renderComponents();
    };

    const vectors = document.createElement('div');
    vectors.className = 'vectors';

    ['u', 'v', 'w'].forEach(vec => {
      const vectorDiv = document.createElement('div');
      vectorDiv.className = 'vector';

      const values = document.createElement('div');
      values.className = 'vector-values';

      for (let i = 0; i < n; i++) {
        const bit = document.createElement('div');
        bit.className = `bit ${bitSizeClass} ${comp[vec][i] ? 'on' : ''}`;
        bit.textContent = comp[vec][i] ? '1' : '0';
        bit.onclick = (e) => {
          e.stopPropagation();
          comp[vec][i] ^= 1;
          Storage.set('components', components);
          updateVisualization();
          updateInfo(); // Update term count when bits change
        };
        values.appendChild(bit);
      }

      vectorDiv.appendChild(values);
      vectors.appendChild(vectorDiv);
    });

    card.appendChild(vectors);
    container.appendChild(card);
  });
}

function renderLayers() {
  const { tensor, conflicts } = calcTensorWithConflicts();
  const n = Storage.get('n');
  engine.drawLayers(n, tensor, conflicts, onLayerClick);
}

function onLayerClick(newActiveLayer) {
  Storage.set('activeLayer', newActiveLayer);
  engine.setActiveLayer(newActiveLayer);
  updateVisualization();
}

// Preset loading functions (unchanged)
function loadPreset(presetName) {
  const preset = PRESETS[presetName];
  if (!preset) {
    if (presetName === 'naive3x3') loadNaive3x3();
    else if (presetName === 'laderman') loadLaderman();
    return;
  }
  
  const components = [];
  for (let k = 0; k < preset.r; k++) {
    components.push({
      u: [...preset.u[k]],
      v: [...preset.v[k]],
      w: [...preset.w[k]]
    });
  }
  
  Storage.update({
    n: preset.n,
    r: preset.r,
    components: components,
    activeLayer: -1
  });
  
  engine.setActiveLayer(-1);
  updateInfo();
  updateVisualization(true);
}

function loadNaive3x3() {
  const n = 9;
  const r = 27;
  
  const u = [
    [1,0,0,0,0,0,0,0,0],[0,1,0,0,0,0,0,0,0],[0,0,1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0,0,0],[0,1,0,0,0,0,0,0,0],[0,0,1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0,0,0],[0,1,0,0,0,0,0,0,0],[0,0,1,0,0,0,0,0,0],
    [0,0,0,1,0,0,0,0,0],[0,0,0,0,1,0,0,0,0],[0,0,0,0,0,1,0,0,0],
    [0,0,0,1,0,0,0,0,0],[0,0,0,0,1,0,0,0,0],[0,0,0,0,0,1,0,0,0],
    [0,0,0,1,0,0,0,0,0],[0,0,0,0,1,0,0,0,0],[0,0,0,0,0,1,0,0,0],
    [0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,1,0],[0,0,0,0,0,0,0,0,1],
    [0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,1,0],[0,0,0,0,0,0,0,0,1],
    [0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,1,0],[0,0,0,0,0,0,0,0,1]
  ];
  const v = [
    [1,0,0,0,0,0,0,0,0],[0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,1,0,0],
    [0,1,0,0,0,0,0,0,0],[0,0,0,0,1,0,0,0,0],[0,0,0,0,0,0,0,1,0],
    [0,0,1,0,0,0,0,0,0],[0,0,0,0,0,1,0,0,0],[0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0],[0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,1,0,0],
    [0,1,0,0,0,0,0,0,0],[0,0,0,0,1,0,0,0,0],[0,0,0,0,0,0,0,1,0],
    [0,0,1,0,0,0,0,0,0],[0,0,0,0,0,1,0,0,0],[0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0],[0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,1,0,0],
    [0,1,0,0,0,0,0,0,0],[0,0,0,0,1,0,0,0,0],[0,0,0,0,0,0,0,1,0],
    [0,0,1,0,0,0,0,0,0],[0,0,0,0,0,1,0,0,0],[0,0,0,0,0,0,0,0,1]
  ];
  const w = [
    [1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,0,0,0],
    [0,1,0,0,0,0,0,0,0],[0,1,0,0,0,0,0,0,0],[0,1,0,0,0,0,0,0,0],
    [0,0,1,0,0,0,0,0,0],[0,0,1,0,0,0,0,0,0],[0,0,1,0,0,0,0,0,0],
    [0,0,0,1,0,0,0,0,0],[0,0,0,1,0,0,0,0,0],[0,0,0,1,0,0,0,0,0],
    [0,0,0,0,1,0,0,0,0],[0,0,0,0,1,0,0,0,0],[0,0,0,0,1,0,0,0,0],
    [0,0,0,0,0,1,0,0,0],[0,0,0,0,0,1,0,0,0],[0,0,0,0,0,1,0,0,0],
    [0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,1,0,0],
    [0,0,0,0,0,0,0,1,0],[0,0,0,0,0,0,0,1,0],[0,0,0,0,0,0,0,1,0],
    [0,0,0,0,0,0,0,0,1],[0,0,0,0,0,0,0,0,1],[0,0,0,0,0,0,0,0,1]
  ];

  const components = [];
  for (let k = 0; k < r; k++) {
    components.push({ u: [...u[k]], v: [...v[k]], w: [...w[k]] });
  }

  Storage.update({
    n: n,
    r: r,
    components: components,
    activeLayer: -1
  });
  
  engine.setActiveLayer(-1);
  updateInfo();
  updateVisualization(true);
}

function loadLaderman() {
  const n = 9;
  const r = 23;

  const ladermanData = {
    u: [
      [1,1,1,1,1,0,0,1,1],[1,0,0,1,0,0,0,0,0],[0,0,0,0,1,0,0,0,0],
      [1,0,0,1,1,0,0,0,0],[0,0,0,1,1,0,0,0,0],[1,0,0,0,0,0,0,0,0],
      [1,0,0,0,0,0,1,1,0],[1,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,1,1,0],
      [1,1,1,0,1,1,1,1,0],[0,0,0,0,0,0,0,1,0],[0,0,1,0,0,0,0,1,1],
      [0,0,1,0,0,0,0,0,1],[0,0,1,0,0,0,0,0,0],[0,0,0,0,0,0,0,1,1],
      [0,0,1,0,1,1,0,0,0],[0,0,1,0,0,1,0,0,0],[0,0,0,0,1,1,0,0,0],
      [0,1,0,0,0,0,0,0,0],[0,0,0,0,0,1,0,0,0],[0,0,0,1,0,0,0,0,0],
      [0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,0,1]
    ],
    v: [
      [0,0,0,0,1,0,0,0,0],[0,1,0,0,1,0,0,0,0],[1,1,0,1,1,1,1,0,1],
      [1,1,0,0,1,0,0,0,0],[1,1,0,0,0,0,0,0,0],[1,0,0,0,0,0,0,0,0],
      [1,0,1,0,0,1,0,0,0],[0,0,1,0,0,1,0,0,0],[1,0,1,0,0,0,0,0,0],
      [0,0,0,0,0,1,0,0,0],[1,0,1,1,1,1,1,1,0],[0,0,0,0,1,0,1,1,0],
      [0,0,0,0,1,0,0,1,0],[0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,1,1,0],
      [0,0,0,0,0,1,1,0,1],[0,0,0,0,0,1,0,0,1],[0,0,0,0,0,0,1,0,1],
      [0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,1,0],[0,0,1,0,0,0,0,0,0],
      [0,1,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,1]
    ],
    w: [
      [0,1,0,0,0,0,0,0,0],[0,0,0,1,1,0,0,0,0],[0,0,0,1,0,0,0,0,0],
      [0,1,0,1,1,0,0,0,0],[0,1,0,0,1,0,0,0,0],[1,1,1,1,1,0,1,0,1],
      [0,0,1,0,0,0,1,0,1],[0,0,0,0,0,0,1,0,1],[0,0,1,0,0,0,0,0,1],
      [0,0,1,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0],[0,1,0,0,0,0,1,1,0],
      [0,0,0,0,0,0,1,1,0],[1,1,1,1,0,1,1,1,0],[0,1,0,0,0,0,0,1,0],
      [0,0,1,1,0,1,0,0,0],[0,0,0,1,0,1,0,0,0],[0,0,1,0,0,1,0,0,0],
      [1,0,0,0,0,0,0,0,0],[0,0,0,0,1,0,0,0,0],[0,0,0,0,0,1,0,0,0],
      [0,0,0,0,0,0,0,1,0],[0,0,0,0,0,0,0,0,1]
    ]
  };

  const components = [];
  for (let k = 0; k < r; k++) {
    components.push({
      u: [...ladermanData.u[k]],
      v: [...ladermanData.v[k]],
      w: [...ladermanData.w[k]]
    });
  }

  Storage.update({
    n: n,
    r: r,
    components: components,
    activeLayer: -1
  });
  
  engine.setActiveLayer(-1);
  updateInfo();
  updateVisualization(true);
}

// Updated mobile menu without auto-close
function setupMobileMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const settings = document.getElementById('settings');
  const overlay = document.getElementById('settingsOverlay');
  const closeBtn = document.getElementById('closeSettings');
  
  const openSettings = () => {
    settings.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
  
  const closeSettings = () => {
    settings.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };
  
  menuToggle.addEventListener('click', () => {
    settings.classList.contains('active') ? closeSettings() : openSettings();
  });
  
  overlay.addEventListener('click', closeSettings);
  closeBtn.addEventListener('click', closeSettings);
  
  // Removed auto-close on button clicks
}

function handleReduceClick() {
  const btn = document.getElementById('reduce');
  if (!btn) return;

  btn.disabled = true;
  const prevLabel = btn.textContent;
  btn.textContent = 'Reducing...';

  try {
    const components = Storage.get('components');
    const n = Storage.get('n');
    
    const newComponents = Flip.reduceComponents(components, n, {
      flipLim: 1_000_000,
      plusLim: 10_000
    });

    const newActiveComponent = Math.min(
      Storage.get('activeComponent'), 
      Math.max(0, newComponents.length - 1)
    );
    
    Storage.update({
      components: newComponents,
      r: newComponents.length,
      activeComponent: newActiveComponent
    });

    updateInfo();
    updateVisualization();
  } catch (err) {
    console.error(err);
    alert('Reduce failed: ' + (err?.message || String(err)));
  } finally {
    btn.disabled = false;
    btn.textContent = prevLabel || 'Reduce';
  }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Create render engine
  engine = new RenderEngine(
    document.getElementById('view3d'),
    document.getElementById('layers')
  );
  
  engine.init();

  const savedCameraPos = Storage.get('cameraPosition');
  if (savedCameraPos) {
    engine.setCameraPosition(savedCameraPos);
  }
  
  // Initialize settings from storage
  const autoRotate = Storage.get('autoRotate');
  const showConflicts = Storage.get('showConflicts');
  const showLayers = Storage.get('showLayers');
  const activeLayer = Storage.get('activeLayer');
  
  // Update checkboxes to reflect saved state
  document.getElementById('autoRotate').checked = autoRotate;
  document.getElementById('showConflicts').checked = showConflicts;
  document.getElementById('showLayers').checked = showLayers;
  
  // Apply settings to engine
  engine.setAutoRotate(autoRotate);
  engine.setActiveLayer(activeLayer);
  engine.setShowConflicts(showConflicts);
  
  // Initialize state from storage
  if (!Storage.get('components') || Storage.get('components').length === 0) {
    initComponents();
  }

  updateLayersVisibility();
  
  // Subscribe to storage changes
  Storage.subscribe((key, value) => {
    switch (key) {
      case 'autoRotate':
        engine.setAutoRotate(value);
        document.getElementById('autoRotate').checked = value;
        break;
      case 'showConflicts':
        engine.setShowConflicts(value);
        document.getElementById('showConflicts').checked = value;
        break;
      case 'showLayers':
        updateLayersVisibility();
        document.getElementById('showLayers').checked = value;
        break;
    }
  });
  
  // Initial render
  updateVisualization(true);
  updateInfo();
  
  // Load default preset if no components
  if (Storage.get('components').every(c => 
    c.u.every(v => !v) && c.v.every(v => !v) && c.w.every(v => !v)
  )) {
    loadPreset('strassen');
  }
  
  setupMobileMenu();
  
  // Event Bindings
  document.getElementById('sizeUp').onclick = () => {
    const n = Storage.get('n');
    if (n < 9) {
      Storage.update({
        n: n + 1,
        activeLayer: -1
      });
      initComponents();
      engine.setActiveLayer(-1);
      updateInfo();
      updateVisualization(true);
    }
  };
  
  document.getElementById('sizeDown').onclick = () => {
    const n = Storage.get('n');
    if (n > 2) {
      Storage.update({
        n: n - 1,
        activeLayer: -1
      });
      initComponents();
      engine.setActiveLayer(-1);
      updateInfo();
      updateVisualization(true);
    }
  };
  
  document.getElementById('compUp').onclick = () => {
    const r = Storage.get('r');
    if (r < 27) {
      Storage.set('r', r + 1);
      initComponents();
      updateInfo();
      updateVisualization();
    }
  };
  
  document.getElementById('compDown').onclick = () => {
    const r = Storage.get('r');
    const activeComponent = Storage.get('activeComponent');
    if (r > 1) {
      Storage.update({
        r: r - 1,
        activeComponent: Math.min(activeComponent, r - 2)
      });
      initComponents();
      updateInfo();
      updateVisualization();
    }
  };
  
  document.getElementById('randomizeSparse').onclick = () => {
    const components = Storage.get('components');
    const n = Storage.get('n');
    
    components.forEach(comp => {
      for (let i = 0; i < n; i++) {
        comp.u[i] = Math.random() < 0.3 ? 1 : 0;
        comp.v[i] = Math.random() < 0.3 ? 1 : 0;
        comp.w[i] = Math.random() < 0.3 ? 1 : 0;
      }
    });
    
    Storage.set('components', components);
    updateInfo();
    updateVisualization();
  };
  
  document.getElementById('randomizeOneHot').onclick = () => {
    const components = Storage.get('components');
    const n = Storage.get('n');
    
    components.forEach(comp => {
      comp.u.fill(0); comp.u[Math.floor(Math.random() * n)] = 1;
      comp.v.fill(0); comp.v[Math.floor(Math.random() * n)] = 1;
      comp.w.fill(0); comp.w[Math.floor(Math.random() * n)] = 1;
    });
    
    Storage.set('components', components);
    updateInfo();
    updateVisualization();
  };
  
  document.getElementById('clear').onclick = () => {
    initComponents();
    updateInfo();
    updateVisualization();
  };
  
  document.getElementById('naive2x2').onclick = () => loadPreset('naive2x2');
  document.getElementById('strassen').onclick = () => loadPreset('strassen');
  document.getElementById('naive3x3').onclick = () => loadPreset('naive3x3');
  document.getElementById('laderman').onclick = () => loadPreset('laderman');
  
  document.getElementById('reduce').onclick = handleReduceClick;
  
  document.getElementById('autoRotate').onchange = (e) => {
    Storage.set('autoRotate', e.target.checked);
  };
  
  document.getElementById('showConflicts').onchange = (e) => {
    Storage.set('showConflicts', e.target.checked);
    updateVisualization();
  };
  
  document.getElementById('showLayers').onchange = (e) => {
    Storage.set('showLayers', e.target.checked);
  };
  
  window.addEventListener('resize', () => {
    engine.handleResize();
  });
});

window.updateLayersVisibility = updateLayersVisibility;