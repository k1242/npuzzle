// script.js - Main application logic with worker integration
/* global Storage, RenderEngine, Flip, PRESETS */

let engine = null;

// Initialize empty components
function initComponents() {
  const { n, r } = Storage;
  Storage.components = Array(r).fill(null).map(() => ({
    u: Array(n).fill(0),
    v: Array(n).fill(0),
    w: Array(n).fill(0)
  }));
}

// Calculate tensor and conflicts from components
function calcTensor() {
  const { n, components } = Storage;
  
  const counts = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => Array(n).fill(0))
  );

  // Count contributions
  for (const c of components) {
    for (let i = 0; i < n; i++) {
      if (!c.u[i]) continue;
      for (let j = 0; j < n; j++) {
        if (!c.v[j]) continue;
        for (let k = 0; k < n; k++) {
          if (c.w[k]) counts[i][j][k]++;
        }
      }
    }
  }

  // Build tensor and conflicts
  const tensor = [];
  const conflicts = [];
  
  for (let i = 0; i < n; i++) {
    tensor[i] = [];
    conflicts[i] = [];
    for (let j = 0; j < n; j++) {
      tensor[i][j] = [];
      conflicts[i][j] = [];
      for (let k = 0; k < n; k++) {
        const c = counts[i][j][k];
        tensor[i][j][k] = c % 2;
        conflicts[i][j][k] = c > 0 && (c % 2 === 0);
      }
    }
  }

  return { tensor, conflicts };
}

// Update all visualizations
function updateViz(rebuild = false) {
  const { tensor, conflicts } = calcTensor();
  const { n } = Storage;
  
  if (rebuild) {
    engine.build(n, tensor, conflicts);
  } else {
    engine.update(n, tensor, conflicts);
  }
  
  renderComponents();
  renderLayers(tensor, conflicts);
  updateInfo();
}

// Update info label
function updateInfo() {
  const { n, components } = Storage;
  
  // Count non-empty terms
  let nonEmpty = 0;
  for (const c of components) {
    if (c.u.some(b => b) && c.v.some(b => b) && c.w.some(b => b)) {
      nonEmpty++;
    }
  }
  
  document.getElementById('info').textContent = `${n}×${n}×${n} tensor (${nonEmpty} terms)`;
  document.getElementById('sizeVal').textContent = n;
  document.getElementById('compVal').textContent = Storage.r;
}

// Render component cards
function renderComponents() {
  const container = document.getElementById('components');
  const { components, n, activeComponent } = Storage;
  
  container.innerHTML = '';

  // Vector labels
  const labels = document.createElement('div');
  labels.className = 'vector-labels';
  labels.innerHTML = '<div class="vector-label-item">u</div><div class="vector-label-item">v</div><div class="vector-label-item">w</div>';
  container.appendChild(labels);

  // Bit size class
  const bitClass = n > 8 ? 'tiny' : n > 5 ? 'small' : '';

  // Component cards
  components.forEach((comp, idx) => {
    const card = document.createElement('div');
    card.className = `component ${idx === activeComponent ? 'active' : ''}`;
    card.onclick = () => {
      Storage.activeComponent = idx;
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
        bit.className = `bit ${bitClass} ${comp[vec][i] ? 'on' : ''}`;
        bit.textContent = comp[vec][i] ? '1' : '0';
        bit.onclick = (e) => {
          e.stopPropagation();
          comp[vec][i] ^= 1;
          Storage.components = components;
          updateViz();
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

// Render layer thumbnails
function renderLayers(tensor, conflicts) {
  engine.drawLayers(Storage.n, tensor, conflicts, (k) => {
    Storage.activeLayer = (Storage.activeLayer === k) ? -1 : k;
    updateViz();
  });
}

// Load preset
function loadPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  
  // Handle generated presets
  const data = preset.generate ? preset.generate() : preset;
  
  const components = [];
  for (let i = 0; i < preset.r; i++) {
    components.push({
      u: [...data.u[i]],
      v: [...data.v[i]],
      w: [...data.w[i]]
    });
  }
  
  Storage.update({
    n: preset.n,
    r: preset.r,
    components,
    activeLayer: -1,
    activeComponent: 0
  });
  
  updateViz(true);
}

// Setup stepper controls
function setupStepper(upId, downId, getValue, setValue, min, max, onChange) {
  document.getElementById(upId).onclick = () => {
    const val = getValue();
    if (val < max) {
      setValue(val + 1);
      onChange();
    }
  };
  
  document.getElementById(downId).onclick = () => {
    const val = getValue();
    if (val > min) {
      setValue(val - 1);
      onChange();
    }
  };
}

// Setup random generators
function randomize(sparse = false) {
  const { components, n } = Storage;
  
  if (sparse) {
    // Sparse random
    components.forEach(c => {
      ['u', 'v', 'w'].forEach(vec => {
        for (let i = 0; i < n; i++) {
          c[vec][i] = Math.random() < 0.3 ? 1 : 0;
        }
      });
    });
  } else {
    // One-hot random
    components.forEach(c => {
      ['u', 'v', 'w'].forEach(vec => {
        c[vec].fill(0);
        c[vec][Math.floor(Math.random() * n)] = 1;
      });
    });
  }
  
  Storage.components = components;
  updateViz();
}

// Reduce handler with progress
function handleReduce() {
  const btn = document.getElementById('reduce');
  const originalContent = btn.innerHTML;
  
  // Add progress bar structure
  btn.innerHTML = '<span class="btn-text">Reducing...</span><div class="btn-progress"><div class="btn-progress-bar"></div></div>';
  btn.disabled = true;
  
  const progressBar = btn.querySelector('.btn-progress-bar');
  
  // Get initial term count
  const { components, n } = Storage;
  const initialTerms = components.filter(c => 
    c.u.some(b => b) && c.v.some(b => b) && c.w.some(b => b)
  ).length;
  
  Flip.reduceComponents(components, n, {
    onProgress: (data) => {
      // Update progress bar
      const percent = (data.current / data.total) * 100;
      progressBar.style.width = percent + '%';
    }
  }).then(result => {
    const { components: reduced, initialRank, finalRank } = result;
    
    Storage.update({
      components: reduced,
      r: reduced.length,
      activeComponent: Math.min(Storage.activeComponent, reduced.length - 1)
    });
    
    updateViz();
    
    // Show result for 3 seconds
    btn.innerHTML = `<span class="btn-text">Reduced: ${initialRank} → ${finalRank}</span>`;
    btn.classList.add('success');
    
    setTimeout(() => {
      btn.innerHTML = originalContent;
      btn.disabled = false;
      btn.classList.remove('success');
    }, 3000);
    
  }).catch(err => {
    console.error(err);
    alert('Reduce failed: ' + err.message);
    btn.innerHTML = originalContent;
    btn.disabled = false;
  });
}

// Mobile menu setup
function setupMobileMenu() {
  const toggle = document.getElementById('menuToggle');
  const settings = document.getElementById('settings');
  const overlay = document.getElementById('settingsOverlay');
  const close = document.getElementById('closeSettings');
  
  const openMenu = () => {
    settings.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
  
  const closeMenu = () => {
    settings.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };
  
  toggle.onclick = () => settings.classList.contains('active') ? closeMenu() : openMenu();
  overlay.onclick = closeMenu;
  close.onclick = closeMenu;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Create engine
  engine = new RenderEngine(
    document.getElementById('view3d'),
    document.getElementById('layers')
  );

  // Initialize components if needed
  if (!Storage.components || !Storage.components.length) {
    initComponents();
  }

  // Setup checkboxes
  ['autoRotate', 'showConflicts', 'showLayers'].forEach(id => {
    const el = document.getElementById(id);
    el.checked = Storage[id];
    el.onchange = (e) => {
      Storage[id] = e.target.checked;
      if (id === 'showLayers') {
        document.getElementById('container').classList.toggle('layers-visible', e.target.checked);
        engine.handleResize();
      } else {
        updateViz();
      }
    };
  });

  // Setup steppers
  setupStepper('sizeUp', 'sizeDown', 
    () => Storage.n, 
    (v) => { Storage.n = v; },
    2, 9,
    () => {
      Storage.activeLayer = -1;
      initComponents();
      updateViz(true);
    }
  );
  
  setupStepper('compUp', 'compDown',
    () => Storage.r,
    (v) => { Storage.r = v; },
    1, 27,
    () => {
      Storage.activeComponent = Math.min(Storage.activeComponent, Storage.r - 1);
      initComponents();
      updateViz();
    }
  );

  // Setup buttons
  document.getElementById('randomizeSparse').onclick = () => randomize(true);
  document.getElementById('randomizeOneHot').onclick = () => randomize(false);
  document.getElementById('clear').onclick = () => { initComponents(); updateViz(); };
  document.getElementById('reduce').onclick = handleReduce;

  // Preset buttons
  ['naive2x2', 'strassen', 'naive3x3', 'laderman'].forEach(id => {
    document.getElementById(id).onclick = () => loadPreset(id);
  });

  // Mobile menu
  setupMobileMenu();

  // Window resize
  window.addEventListener('resize', () => engine.handleResize());

  // Initial layers visibility
  document.getElementById('container').classList.toggle('layers-visible', Storage.showLayers);

  // Initial render
  updateViz(true);

  // Load default preset if empty
  if (Storage.components.every(c => !c.u.some(b => b) && !c.v.some(b => b) && !c.w.some(b => b))) {
    loadPreset('strassen');
  }
});