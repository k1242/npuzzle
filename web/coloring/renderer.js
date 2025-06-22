/* ====== RENDERING ====== */

const render = () => {
  renderGraph();
  
  // Check solution
  const nowSolved = checkSolution();
  if (!solved && nowSolved) {
    solved = true;
    CorrectNotification.show();
  } else if (solved && !nowSolved) {
    solved = false;
    CorrectNotification.hide();
  }
  
  // Save game state
  saveGame();
};

const renderGraph = () => {
  const svg = $('#graphCanvas');
  if (!svg) return;
  
  // Clear existing content
  svg.innerHTML = '';
  
  // Calculate dynamic vertex radius based on vertex count
  // For 3 vertices: ~7px, for 20 vertices: 4px, for 50 vertices: 2.5px
  const vertexRadius = Math.max(2.5, 7.5 - vertexCount * 0.175);
  
  // Calculate bounds - assuming coordinates are 0-100
  const padding = 10;
  let minX = -padding;
  let maxX = 100 + padding;
  let minY = -padding;
  let maxY = 100 + padding;
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Set viewBox
  svg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  
  // Check if all vertices are colored
  const allColored = vertexColors.every(c => c !== 0);
  
  // Get conflicts (only if all vertices are colored)
  const conflicts = allColored ? findConflicts() : new Set();
  
  // Create edge set for conflict checking
  const conflictEdges = new Set();
  if (allColored) {
    for (let i = 0; i < edgesStart.length; i++) {
      const v1 = edgesStart[i];
      const v2 = edgesEnd[i];
      if (conflicts.has(v1) && conflicts.has(v2) && 
          vertexColors[v1] === vertexColors[v2] && 
          vertexColors[v1] !== 0) {
        conflictEdges.add(i);
      }
    }
  }
  
  // Draw edges first (so they appear behind vertices)
  const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  edgeGroup.id = 'edges';
  
  for (let i = 0; i < edgesStart.length; i++) {
    const v1 = edgesStart[i];
    const v2 = edgesEnd[i];
    
    const edge = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    edge.setAttribute('x1', verticesX[v1]);
    edge.setAttribute('y1', verticesY[v1]);
    edge.setAttribute('x2', verticesX[v2]);
    edge.setAttribute('y2', verticesY[v2]);
    edge.classList.add('edge');
    
    // Dynamic edge width - thin
    edge.style.strokeWidth = Math.max(1, vertexRadius * 0.25) + 'px';
    
    if (conflictEdges.has(i)) {
      edge.classList.add('conflict');
      edge.style.strokeWidth = Math.max(1.5, vertexRadius * 0.4) + 'px';
    }
    
    edgeGroup.appendChild(edge);
  }
  
  svg.appendChild(edgeGroup);
  
  // Draw vertices
  const vertexGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  vertexGroup.id = 'vertices';
  
  for (let i = 0; i < vertexCount; i++) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('vertex');
    g.setAttribute('data-vertex', i);
    g.setAttribute('data-color', vertexColors[i]);
    
    if (fixedVertices.has(i)) {
      g.classList.add('fixed');
    }
    
    if (allColored && conflicts.has(i) && vertexColors[i] !== 0) {
      g.classList.add('conflict');
    }
    
    // Circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', verticesX[i]);
    circle.setAttribute('cy', verticesY[i]);
    circle.setAttribute('r', vertexRadius);
    circle.setAttribute('fill', COLORS[vertexColors[i]]);
    
    // Adjust stroke width based on vertex size - much thinner
    const strokeWidth = Math.max(0.3, vertexRadius / 15);
    circle.style.strokeWidth = strokeWidth + 'px';
    
    // Override stroke width for special cases
    if (fixedVertices.has(i)) {
      circle.style.strokeWidth = Math.max(0.5, vertexRadius / 12) + 'px';
    }
    
    if (allColored && conflicts.has(i) && vertexColors[i] !== 0) {
      circle.style.strokeWidth = Math.max(0.8, vertexRadius / 8) + 'px';
    }
    
    // Click handler
    g.onclick = () => handleVertexClick(i);
    
    g.appendChild(circle);
    vertexGroup.appendChild(g);
  }
  
  svg.appendChild(vertexGroup);
  
  // Adjust canvas size
  const canvasWrap = $('#canvasWrap');
  if (canvasWrap) {
    const wrapSize = Math.min(canvasWrap.offsetWidth - 40, canvasWrap.offsetHeight - 40);
    
    // Since we have a square viewBox (120x120), scale to fit the square canvas
    const scale = wrapSize / 120; // 120 = 100 + 2*padding
    
    const finalSize = 120 * scale;
    
    svg.style.width = `${finalSize}px`;
    svg.style.height = `${finalSize}px`;
  }
};

// Make render function globally accessible
window.render = render;