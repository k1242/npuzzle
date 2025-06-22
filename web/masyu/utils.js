// Create edge key for consistent edge identification
const edgeKey = (r1, c1, r2, c2) => 
  r1 < r2 || (r1 === r2 && c1 < c2) 
    ? `${r1},${c1}-${r2},${c2}` 
    : `${r2},${c2}-${r1},${c1}`;

// Place circles on the generated loop
const placeCircles = (edges, circlesPercent) => {
  const circles = [];
  const vertices = new Map();
  
  // Build adjacency
  for (const edge of edges) {
    const [u, v] = edge.split('-');
    if (!vertices.has(u)) vertices.set(u, []);
    if (!vertices.has(v)) vertices.set(v, []);
    vertices.get(u).push(v);
    vertices.get(v).push(u);
  }
  
  const validWhite = [], validBlack = [];
  
  for (const [vertex, neighbors] of vertices) {
    if (neighbors.length !== 2) continue;
    
    const [v1, v2] = neighbors;
    const [r, c] = vertex.split(',').map(Number);
    const [r1, c1] = v1.split(',').map(Number);
    const [r2, c2] = v2.split(',').map(Number);
    
    const isStraight = (r === r1 && r === r2) || (c === c1 && c === c2);
    
    if (isStraight) {
      // Check for adjacent turn (white circle requirement)
      let hasAdjacentTurn = false;
      
      for (const neighbor of neighbors) {
        const neighborAdj = vertices.get(neighbor);
        if (neighborAdj?.length === 2) {
          const continuePath = neighborAdj.find(v => v !== vertex);
          if (continuePath) {
            const [nr, nc] = neighbor.split(',').map(Number);
            const [cr, cc] = continuePath.split(',').map(Number);
            
            const pathTurns = !((r === nr && nr === cr) || (c === nc && nc === cc));
            if (pathTurns) {
              hasAdjacentTurn = true;
              break;
            }
          }
        }
      }
      
      if (hasAdjacentTurn) validWhite.push({vr: r, vc: c});
    } else {
      // Check for straight segments (black circle requirement)
      let validBlackCircle = true;
      
      for (const neighbor of neighbors) {
        const neighborAdj = vertices.get(neighbor);
        
        if (!neighborAdj || neighborAdj.length !== 2) {
          validBlackCircle = false;
          break;
        }
        
        const continuePath = neighborAdj.find(v => v !== vertex);
        if (!continuePath) {
          validBlackCircle = false;
          break;
        }
        
        const [nr, nc] = neighbor.split(',').map(Number);
        const [conr, conc] = continuePath.split(',').map(Number);
        
        const pathStraight = (r === nr && nr === conr) || (c === nc && nc === conc);
        if (!pathStraight) {
          validBlackCircle = false;
          break;
        }
      }
      
      if (validBlackCircle) validBlack.push({vr: r, vc: c});
    }
  }
  
  // Calculate circle counts
  const totalValid = validWhite.length + validBlack.length;
  if (!totalValid) return circles;
  
  const numCircles = Math.max(2, Math.floor(totalValid * circlesPercent / 100));
  let numWhite = Math.floor(numCircles / 2);
  let numBlack = numCircles - numWhite;
  
  // Ensure at least one of each if possible
  if (validWhite.length > 0 && validBlack.length > 0) {
    if (numWhite === 0) { numWhite = 1; numBlack = Math.max(1, numCircles - 1); }
    if (numBlack === 0) { numBlack = 1; numWhite = Math.max(1, numCircles - 1); }
  }
  
  numWhite = Math.min(numWhite, validWhite.length);
  numBlack = Math.min(numBlack, validBlack.length);
  
  // Shuffle and pick
  const shuffled = arr => arr.sort(() => Math.random() - 0.5);
  
  shuffled(validWhite).slice(0, numWhite).forEach(({vr, vc}) => 
    circles.push({ vr, vc, type: 'white' }));
  
  shuffled(validBlack).slice(0, numBlack).forEach(({vr, vc}) => 
    circles.push({ vr, vc, type: 'black' }));
  
  return circles;
};

// Get edges connected to a vertex
const getVertexEdges = (vr, vc, lines) => {
  const edges = [];
  const checks = [
    { key: edgeKey(vr, vc, vr-1, vc), dir: 'up', to: [vr-1, vc] },
    { key: edgeKey(vr, vc, vr, vc+1), dir: 'right', to: [vr, vc+1] },
    { key: edgeKey(vr, vc, vr+1, vc), dir: 'down', to: [vr+1, vc] },
    { key: edgeKey(vr, vc, vr, vc-1), dir: 'left', to: [vr, vc-1] }
  ];
  
  checks.forEach(({key, dir, to}) => {
    if (lines[key]) edges.push({dir, to});
  });
  
  return edges;
};

// Validate a single circle
const validateCircle = (circle, lines, maxCoord) => {
  const edges = getVertexEdges(circle.vr, circle.vc, lines);
  
  if (edges.length !== 2) return false;
  
  const dirs = edges.map(e => e.dir);
  const isStraight = (dirs.includes('up') && dirs.includes('down')) || 
                     (dirs.includes('left') && dirs.includes('right'));
  
  if (circle.type === 'white') {
    if (!isStraight) return false;
    
    // Check for adjacent turn
    for (const edge of edges) {
      const [nr, nc] = edge.to;
      if (nr >= 0 && nr <= maxCoord && nc >= 0 && nc <= maxCoord) {
        const neighborEdges = getVertexEdges(nr, nc, lines);
        if (neighborEdges.length === 2) {
          const fromDir = {up: 'down', down: 'up', left: 'right', right: 'left'}[edge.dir];
          const otherEdge = neighborEdges.find(e => e.dir !== fromDir);
          
          if (otherEdge) {
            const isVertical = dir => dir === 'up' || dir === 'down';
            const isHorizontal = dir => dir === 'left' || dir === 'right';
            
            if ((isVertical(edge.dir) && isHorizontal(otherEdge.dir)) ||
                (isHorizontal(edge.dir) && isVertical(otherEdge.dir))) {
              return true;
            }
          }
        }
      }
    }
    return false;
    
  } else { // black circle
    if (isStraight) return false;
    
    // Check straight segments before and after
    for (const edge of edges) {
      const [nr, nc] = edge.to;
      
      if (nr < 0 || nr > maxCoord || nc < 0 || nc > maxCoord) return false;
      
      const neighborEdges = getVertexEdges(nr, nc, lines);
      if (neighborEdges.length !== 2) return false;
      
      const fromDir = {up: 'down', down: 'up', left: 'right', right: 'left'}[edge.dir];
      const continueEdge = neighborEdges.find(e => e.dir !== fromDir);
      
      if (!continueEdge || continueEdge.dir !== edge.dir) return false;
    }
    
    return true;
  }
};

// Validate the entire solution
const validateSolution = (lines, circles, n, isSingleLoopFunc) => {
  const activeEdges = new Set(Object.keys(lines).filter(k => lines[k]));
  const invalidCircles = new Set();
  
  if (!activeEdges.size) {
    return { isValid: false, invalidCircles };
  }
  
  if (!isSingleLoopFunc(activeEdges)) {
    return { isValid: false, invalidCircles };
  }
  
  if (!circles.length) {
    return { isValid: true, invalidCircles };
  }
  
  let allValid = true;
  
  for (const circle of circles) {
    if (!validateCircle(circle, lines, n)) {
      invalidCircles.add(`${circle.vr},${circle.vc}`);
      allValid = false;
    }
  }
  
  return { isValid: allValid, invalidCircles };
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    edgeKey,
    placeCircles,
    getVertexEdges,
    validateCircle,
    validateSolution
  };
}