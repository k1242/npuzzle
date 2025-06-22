// renderer.js - Rendering functions
// Requires: global settings, state, target variables from script.js

/* ====== CSS & SCALING ====== */
const applyCSS = () => {
  const root = document.documentElement.style;
  root.setProperty('--n', settings.n);
  root.setProperty('--size', calcSize() + 'px');
  root.setProperty('--gap', (innerWidth <= 600 ? 4 : 6) + 'px');
};

const calculateScale = () => {
  const app = $('#app');
  const editWrap = $('#app .editWrap');
  if (!editWrap || !app) return;
  
  // Reset scale for measurement
  app.style.transform = 'scale(1)';
  
  // Give browser time to recalculate layout
  requestAnimationFrame(() => {
    // Get available space
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight - 140; // header + footer
    
    // Calculate content size
    const contentW = editWrap.offsetWidth + 40; // padding
    const contentH = app.offsetHeight;
    
    // Calculate scale to fit
    const scaleX = viewportW / contentW;
    const scaleY = viewportH / contentH;
    let scale = Math.min(scaleX, scaleY, 1); // never scale up
    
    // Apply minimum scale
    scale = Math.max(scale, 0.5);
    
    // Apply scale
    app.style.transform = `scale(${scale})`;
    app.style.transformOrigin = 'top center';
  });
};

/* ====== GRID RENDERING ====== */
const gridHTML = (n, getCls) =>
  Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      `<div class="tile ${getCls(i, j)}"></div>`
    ).join('')
  ).join('');

const tileCls = (t, p, c) => {
  if (editorMode) {
    // in editor mode, just show current state
    return (c ? 'good' : 'zero');
  }
  return settings.mode === 'bool'
    ? (t ? (c ? 'good' : (p ? 'zero' : 'want')) : (c ? 'bad' : 'zero'))
    : (t ^ (p ^ c) ? (c ? 'good' : 'want') : (c ? 'bad' : 'zero'));
};

/* ====== MAIN RENDER ====== */
const render = () => {
  const P = player();
  const k = state.cur;
  const showPreviews = editorMode || (typeof Tutorial !== 'undefined' && Tutorial.isActive());

  // main grid
  $('#editGrid').innerHTML = gridHTML(settings.n, (i, j) =>
    tileCls(target[i][j], P[i][j], state.U[k][i] && state.V[k][j])
  );

  // toggles
  $('#rowToggles').innerHTML = state.U[k]
    .map((v, i) => `<button class="toggle ${v ? 'on' : ''}" data-row="${i}"></button>`)
    .join('');

  $('#colToggles').innerHTML = state.V[k]
    .map((v, j) => `<button class="toggle ${v ? 'on' : ''}" data-col="${j}"></button>`)
    .join('');

  // layer cards
  $('#cards').innerHTML = Array.from({ length: settings.r }, (_, d) => {
    const mini = gridHTML(settings.n, (i, j) =>
      tileCls(target[i][j], P[i][j], state.U[d][i] && state.V[d][j])
    );
    return `<div class="card ${d === k ? 'active' : ''}" data-card="${d}">
              <div class="grid mini">${mini}</div>
            </div>`;
  }).join('');

  // previews
  if (showPreviews) {
    if (editorMode) {
      // in editor mode, only show "You" preview
      $('#previews').innerHTML = 
        `<div class="gridCard">
           <div class="label">You</div>
           <div class="grid mini">${gridHTML(settings.n, (i, j) => (P[i][j] ? 'good' : 'zero'))}</div>
         </div>`;
    } else {
      // in tutorial mode, show both
      $('#previews').innerHTML = 
        `<div class="gridCard">
           <div class="label">Target</div>
           <div class="grid mini">${gridHTML(settings.n, (i, j) => (target[i][j] ? 'good' : 'zero'))}</div>
         </div>
         <div class="gridCard">
           <div class="label">You</div>
           <div class="grid mini">${gridHTML(settings.n, (i, j) => (P[i][j] ? 'good' : 'zero'))}</div>
         </div>`;
    }
  } else {
    $('#previews').innerHTML = '';
  }

  // check solution (only in normal mode)
  if (!editorMode) {
    const nowSolved = matEq(P, target);
    if (!solved && nowSolved) {
      solved = true;
      wasSolved = true;
      CorrectNotification.show();
    } else if (solved && !nowSolved) {
      solved = false;
      CorrectNotification.hide();
    }
  }

  $('#codeInput').value = encode();

  if (!initializing && !editorMode) {
    // Save after a small delay to ensure DOM is stable
    setTimeout(saveGame, 50);
  }
};