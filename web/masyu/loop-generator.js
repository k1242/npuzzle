// Constants
const INITIAL_STEPS = 5000;
const MAX_STEPS = 10000;
const STEP_INCREMENT = 10;

// Get edges of a cell
const cellEdges = (r, c) => [
  [[r, c], [r, c+1]],
  [[r, c+1], [r+1, c+1]], 
  [[r+1, c+1], [r+1, c]],
  [[r+1, c], [r, c]]
].map(([[r1,c1],[r2,c2]]) => 
  r1 < r2 || (r1 === r2 && c1 < c2) ? [[r1,c1],[r2,c2]] : [[r2,c2],[r1,c1]]
);

// Check if edges form a single loop
const isSingleLoop = edges => {
  if (!edges.size) return false;
  
  const deg = new Map(), adj = new Map();
  
  for (const edge of edges) {
    const [u, v] = edge.split('-');
    deg.set(u, (deg.get(u) || 0) + 1);
    deg.set(v, (deg.get(v) || 0) + 1);
    if (deg.get(u) > 2 || deg.get(v) > 2) return false;
    
    if (!adj.has(u)) adj.set(u, []);
    if (!adj.has(v)) adj.set(v, []);
    adj.get(u).push(v);
    adj.get(v).push(u);
  }
  
  // Check all degree 2
  for (const [v, d] of deg) if (d !== 2) return false;
  
  // Check connected
  const start = deg.keys().next().value;
  const stack = [start], seen = new Set([start]);
  
  while (stack.length) {
    const v = stack.pop();
    for (const w of (adj.get(v) || [])) {
      if (!seen.has(w)) {
        seen.add(w);
        stack.push(w);
      }
    }
  }
  
  return seen.size === deg.size;
};

// Generate a random loop
const generateLoop = (n, steps = INITIAL_STEPS, beta = 1.0) => {
  // beta parameter reserved for future use (e.g., controlling loop complexity)
  
  const start = [Math.floor(Math.random() * n), Math.floor(Math.random() * n)];
  const selected = new Set([`${start[0]},${start[1]}`]);
  const edges = new Set();
  
  for (const [u, v] of cellEdges(...start)) {
    edges.add(`${u[0]},${u[1]}-${v[0]},${v[1]}`);
  }
  
  for (let i = 0; i < steps; i++) {
    const r = Math.floor(Math.random() * n);
    const c = Math.floor(Math.random() * n);
    const key = `${r},${c}`;
    
    const cellE = cellEdges(r, c);
    const backup = new Set(edges);
    
    // Toggle edges
    for (const [u, v] of cellE) {
      const edge = `${u[0]},${u[1]}-${v[0]},${v[1]}`;
      if (edges.has(edge)) edges.delete(edge);
      else edges.add(edge);
    }
    
    // Revert if not single loop
    if (!isSingleLoop(edges)) {
      edges.clear();
      backup.forEach(e => edges.add(e));
    } else {
      if (selected.has(key)) selected.delete(key);
      else selected.add(key);
    }
  }
  
  return { edges, selected };
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateLoop,
    isSingleLoop,
    cellEdges,
    INITIAL_STEPS,
    MAX_STEPS,
    STEP_INCREMENT
  };
}