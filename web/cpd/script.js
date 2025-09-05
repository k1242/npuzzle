// script.js
// App logic + UI wiring + integration with Flip.reduceComponents.
// All comments in code should be in English.

/** Global state kept minimal in this file */
const state = {
  n: 4,              // tensor size
  r: 7,              // number of components
  components: [],    // array of { u:[], v:[], w:[] }
  activeComponent: 0,
  activeLayer: -1,   // -1 for all layers
  autoRotate: true,
  showConflicts: false
};

/** Initialize component vectors to zeros for current n and r */
function initComponents() {
  state.components = [];
  for (let k = 0; k < state.r; k++) {
    state.components.push({
      u: Array(state.n).fill(0),
      v: Array(state.n).fill(0),
      w: Array(state.n).fill(0)
    });
  }
}

/** Calculate tensor and conflicts (pre-mod2 count -> mod2 + conflict flag) */
function calcTensorWithConflicts() {
  const n = state.n;

  // counts[i][j][k] counts contributions before mod 2
  const counts = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => Array(n).fill(0))
  );

  for (const comp of state.components) {
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

/** Render the component cards with bit toggles */
function renderComponents(engine) {
  const container = document.getElementById('components');
  container.innerHTML = '';

  // Vector labels column
  const labelsDiv = document.createElement('div');
  labelsDiv.className = 'vector-labels';
  ['u', 'v', 'w'].forEach(label => {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'vector-label-item';
    labelDiv.textContent = label;
    labelsDiv.appendChild(labelDiv);
  });
  container.appendChild(labelsDiv);

  // Bit box size per n
  let bitSizeClass = '';
  if (state.n > 8) bitSizeClass = 'tiny';
  else if (state.n > 5) bitSizeClass = 'small';

  state.components.forEach((comp, idx) => {
    const card = document.createElement('div');
    card.className = `component ${idx === state.activeComponent ? 'active' : ''}`;
    card.onclick = () => {
      state.activeComponent = idx;
      renderComponents(engine);
    };

    const vectors = document.createElement('div');
    vectors.className = 'vectors';

    ['u', 'v', 'w'].forEach(vec => {
      const vectorDiv = document.createElement('div');
      vectorDiv.className = 'vector';

      const values = document.createElement('div');
      values.className = 'vector-values';

      for (let i = 0; i < state.n; i++) {
        const bit = document.createElement('div');
        bit.className = `bit ${bitSizeClass} ${comp[vec][i] ? 'on' : ''}`;
        bit.textContent = comp[vec][i] ? '1' : '0';
        bit.onclick = (e) => {
          // Do not trigger card selection
          e.stopPropagation();
          comp[vec][i] ^= 1;

          // Update visualization
          const { tensor, conflicts } = calcTensorWithConflicts();
          engine.update(state.n, tensor, conflicts);
          engine.drawLayers(state.n, tensor, conflicts, onLayerClick);

          // Re-render components to refresh styles
          renderComponents(engine);
        };
        values.appendChild(bit);
      }

      vectorDiv.appendChild(values);
      vectors.appendChild(vectorDiv);
    });

    card.appendChild(vectors);
    container.appendChild(card);
  });

  // Update components count label
  const compVal = document.getElementById('compVal');
  if (compVal) compVal.textContent = state.r;
}

/** Render layer thumbnails by delegating to engine and wiring click handler */
function renderLayers(engine) {
  const { tensor, conflicts } = calcTensorWithConflicts();
  engine.drawLayers(state.n, tensor, conflicts, onLayerClick);
}

/** Layer click handler that toggles active layer and updates engine */
function onLayerClick(newActiveLayer) {
  state.activeLayer = newActiveLayer;
  engine.setActiveLayer(state.activeLayer);

  const { tensor, conflicts } = calcTensorWithConflicts();
  engine.update(state.n, tensor, conflicts);

  // Redraw to update active styling
  renderLayers(engine);
}

// -------------------------- Preset loaders --------------------------

function loadNaive2x2(engine) {
  state.n = 4;
  state.r = 8;
  document.getElementById('sizeVal').textContent = state.n;
  document.getElementById('compVal').textContent = state.r;
  document.getElementById('info').textContent = `${state.n}×${state.n}×${state.n} tensor`;

  const naiveData = {
    u: [
      [1,0,0,0],[1,0,0,0],[0,1,0,0],[0,1,0,0],
      [0,0,1,0],[0,0,1,0],[0,0,0,1],[0,0,0,1]
    ],
    v: [
      [1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1],
      [1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]
    ],
    w: [
      [1,0,0,0],[0,0,1,0],[1,0,0,0],[0,0,1,0],
      [0,1,0,0],[0,0,0,1],[0,1,0,0],[0,0,0,1]
    ]
  };

  state.components = [];
  for (let k = 0; k < state.r; k++) {
    state.components.push({ u: [...naiveData.u[k]], v: [...naiveData.v[k]], w: [...naiveData.w[k]] });
  }

  const { tensor, conflicts } = calcTensorWithConflicts();
  engine.build(state.n, tensor, conflicts);
  renderComponents(engine);
  renderLayers(engine);
}

function loadStrassen(engine) {
  state.n = 4;
  state.r = 7;
  document.getElementById('sizeVal').textContent = state.n;
  document.getElementById('compVal').textContent = state.r;
  document.getElementById('info').textContent = `${state.n}×${state.n}×${state.n} tensor`;

  const strassenData = {
    u: [
      [1,0,0,1],[0,0,1,1],[1,0,0,0],[0,1,0,1],[1,1,0,0],[0,0,0,1],[1,0,1,0]
    ],
    v: [
      [1,0,0,1],[1,0,0,0],[0,1,0,1],[0,0,1,1],[0,0,0,1],[1,0,1,0],[1,1,0,0]
    ],
    w: [
      [1,0,0,1],[0,1,0,1],[0,0,1,1],[1,0,0,0],[1,0,1,0],[1,1,0,0],[0,0,0,1]
    ]
  };

  state.components = [];
  for (let k = 0; k < state.r; k++) {
    state.components.push({ u: [...strassenData.u[k]], v: [...strassenData.v[k]], w: [...strassenData.w[k]] });
  }

  const { tensor, conflicts } = calcTensorWithConflicts();
  engine.build(state.n, tensor, conflicts);
  renderComponents(engine);
  renderLayers(engine);
}

function loadNaive3x3(engine) {
  state.n = 9;
  state.r = 27;
  document.getElementById('sizeVal').textContent = state.n;
  document.getElementById('compVal').textContent = state.r;
  document.getElementById('info').textContent = `${state.n}×${state.n}×${state.n} tensor`;

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

  state.components = [];
  for (let k = 0; k < state.r; k++) {
    state.components.push({ u: [...u[k]], v: [...v[k]], w: [...w[k]] });
  }

  const { tensor, conflicts } = calcTensorWithConflicts();
  engine.build(state.n, tensor, conflicts);
  renderComponents(engine);
  renderLayers(engine);
}

function loadLaderman(engine) {
  state.n = 9;
  state.r = 23;
  document.getElementById('sizeVal').textContent = state.n;
  document.getElementById('compVal').textContent = state.r;
  document.getElementById('info').textContent = `${state.n}×${state.n}×${state.n} tensor`;

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

  state.components = [];
  for (let k = 0; k < state.r; k++) {
    state.components.push({
      u: [...ladermanData.u[k]],
      v: [...ladermanData.v[k]],
      w: [...ladermanData.w[k]]
    });
  }

  const { tensor, conflicts } = calcTensorWithConflicts();
  engine.build(state.n, tensor, conflicts);
  renderComponents(engine);
  renderLayers(engine);
}

// ----------------------- Engine instantiation -----------------------

const engine = new RenderEngine(
  document.getElementById('view3d'),
  document.getElementById('layers')
);

engine.init();

/** Initial components and render */
initComponents();
(function initialBuild() {
  const { tensor, conflicts } = calcTensorWithConflicts();
  engine.build(state.n, tensor, conflicts);
})();

renderComponents(engine);
renderLayers(engine);

// Default preset at load
loadStrassen(engine);

// ----------------------------- Settings -----------------------------

/** Settings: size +/- */
document.getElementById('sizeUp').onclick = () => {
  if (state.n < 9) {
    state.n++;
    document.getElementById('sizeVal').textContent = state.n;
    document.getElementById('info').textContent = `${state.n}×${state.n}×${state.n} tensor`;
    initComponents();

    const { tensor, conflicts } = calcTensorWithConflicts();
    engine.setActiveLayer(state.activeLayer = -1); // reset layer on size change
    engine.build(state.n, tensor, conflicts);
    renderComponents(engine);
    renderLayers(engine);
  }
};

document.getElementById('sizeDown').onclick = () => {
  if (state.n > 2) {
    state.n--;
    document.getElementById('sizeVal').textContent = state.n;
    document.getElementById('info').textContent = `${state.n}×${state.n}×${state.n} tensor`;
    initComponents();

    const { tensor, conflicts } = calcTensorWithConflicts();
    engine.setActiveLayer(state.activeLayer = -1);
    engine.build(state.n, tensor, conflicts);
    renderComponents(engine);
    renderLayers(engine);
  }
};

/** Settings: components +/- */
document.getElementById('compUp').onclick = () => {
  if (state.r < 27) {
    state.r++;
    document.getElementById('compVal').textContent = state.r;
    initComponents();

    const { tensor, conflicts } = calcTensorWithConflicts();
    engine.update(state.n, tensor, conflicts);
    renderComponents(engine);
    renderLayers(engine);
  }
};

document.getElementById('compDown').onclick = () => {
  if (state.r > 1) {
    state.r--;
    document.getElementById('compVal').textContent = state.r;
    state.activeComponent = Math.min(state.activeComponent, state.r - 1);
    initComponents();

    const { tensor, conflicts } = calcTensorWithConflicts();
    engine.update(state.n, tensor, conflicts);
    renderComponents(engine);
    renderLayers(engine);
  }
};

/** Randomize: sparse */
document.getElementById('randomizeSparse').onclick = () => {
  for (const comp of state.components) {
    for (let i = 0; i < state.n; i++) {
      comp.u[i] = Math.random() < 0.3 ? 1 : 0;
      comp.v[i] = Math.random() < 0.3 ? 1 : 0;
      comp.w[i] = Math.random() < 0.3 ? 1 : 0;
    }
  }
  const { tensor, conflicts } = calcTensorWithConflicts();
  engine.update(state.n, tensor, conflicts);
  renderComponents(engine);
  renderLayers(engine);
};

/** Randomize: one-hot */
document.getElementById('randomizeOneHot').onclick = () => {
  for (const comp of state.components) {
    comp.u.fill(0); comp.u[Math.floor(Math.random() * state.n)] = 1;
    comp.v.fill(0); comp.v[Math.floor(Math.random() * state.n)] = 1;
    comp.w.fill(0); comp.w[Math.floor(Math.random() * state.n)] = 1;
  }
  const { tensor, conflicts } = calcTensorWithConflicts();
  engine.update(state.n, tensor, conflicts);
  renderComponents(engine);
  renderLayers(engine);
};

/** Clear */
document.getElementById('clear').onclick = () => {
  initComponents();
  const { tensor, conflicts } = calcTensorWithConflicts();
  engine.update(state.n, tensor, conflicts);
  renderComponents(engine);
  renderLayers(engine);
};

/** Preset buttons */
document.getElementById('naive2x2').onclick = () => loadNaive2x2(engine);
document.getElementById('strassen').onclick = () => loadStrassen(engine);
document.getElementById('naive3x3').onclick = () => loadNaive3x3(engine);
document.getElementById('laderman').onclick = () => loadLaderman(engine);

/** Toggles */
document.getElementById('autoRotate').onchange = (e) => {
  state.autoRotate = e.target.checked;
  engine.setAutoRotate(state.autoRotate);
};

document.getElementById('showConflicts').onchange = (e) => {
  state.showConflicts = e.target.checked;
  engine.setShowConflicts(state.showConflicts);

  const { tensor, conflicts } = calcTensorWithConflicts();
  engine.update(state.n, tensor, conflicts);
  renderLayers(engine);
};

/** Resize handling */
window.addEventListener('resize', () => {
  engine.handleResize();
});

// -------------------------- Reduce button ---------------------------

/**
 * Perform 1,000,000 steps of descent starting from the current scheme,
 * then keep only non-zero terms (u!=0, v!=0, w!=0), update state and UI.
 */
function handleReduceClick() {
  const btn = document.getElementById('reduce');
  if (!btn) return;

  // Disable button while running to prevent re-entry
  btn.disabled = true;
  const prevLabel = btn.textContent;
  btn.textContent = 'Reducing...';

  try {
    // Run descent
    const newComponents = Flip.reduceComponents(state.components, state.n, {
      flipLim: 1_000_000,
      plusLim: 10_000
    });

    // Replace state with filtered non-zero components
    state.components = newComponents;
    state.r = newComponents.length;
    state.activeComponent = Math.min(state.activeComponent, Math.max(0, state.r - 1));

    // Update UI counts
    const compVal = document.getElementById('compVal');
    if (compVal) compVal.textContent = state.r;

    // Refresh visualization
    const { tensor, conflicts } = calcTensorWithConflicts();
    engine.update(state.n, tensor, conflicts);
    engine.drawLayers(state.n, tensor, conflicts, onLayerClick);
    renderComponents(engine);
    renderLayers(engine);
  } catch (err) {
    // Basic error reporting
    console.error(err);
    alert('Reduce failed: ' + (err && err.message ? err.message : String(err)));
  } finally {
    btn.disabled = false;
    btn.textContent = prevLabel || 'Reduce';
  }
}

// Wire the reduce button (index.html should have <button id="reduce">Reduce</button>)
const reduceBtn = document.getElementById('reduce');
if (reduceBtn) {
  reduceBtn.addEventListener('click', handleReduceClick);
}
