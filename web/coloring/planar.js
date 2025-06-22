// Random planar graph generator using Delaunay triangulation

// Minimal Delaunator implementation (simplified from the library)
class Delaunator {
  constructor(coords) {
    const n = coords.length >> 1;
    if (n < 3) throw new Error("Need at least 3 points");
    
    this.coords = coords;
    this.triangles = new Uint32Array(Math.max(2 * n - 5, 0) * 3);
    this.halfedges = new Int32Array(this.triangles.length);
    
    // Simplified triangulation for this use case
    this._triangulate();
  }
  
  _triangulate() {
    const n = this.coords.length >> 1;
    const ids = new Uint32Array(n);
    
    // Initialize point indices
    for (let i = 0; i < n; i++) ids[i] = i;
    
    // Sort points lexicographically
    ids.sort((i, j) => {
      const d = this.coords[2 * i] - this.coords[2 * j];
      return d !== 0 ? d : this.coords[2 * i + 1] - this.coords[2 * j + 1];
    });
    
    // Build triangulation (simplified version)
    this.hull = [];
    let trianglesLen = 0;
    
    // Start with first triangle
    if (n >= 3) {
      const i0 = ids[0], i1 = ids[1], i2 = ids[2];
      this.triangles[trianglesLen++] = i0;
      this.triangles[trianglesLen++] = i1;
      this.triangles[trianglesLen++] = i2;
      this.hull.push(i0, i1, i2);
    }
    
    // Add remaining points (simplified incremental construction)
    for (let k = 3; k < n; k++) {
      const i = ids[k];
      const x = this.coords[2 * i];
      const y = this.coords[2 * i + 1];
      
      // Find visible edges and add triangles
      let start = 0;
      for (let j = 0; j < this.hull.length; j++) {
        const p0 = this.hull[j];
        const p1 = this.hull[(j + 1) % this.hull.length];
        
        const x0 = this.coords[2 * p0];
        const y0 = this.coords[2 * p0 + 1];
        const x1 = this.coords[2 * p1];
        const y1 = this.coords[2 * p1 + 1];
        
        // Check if edge is visible from point
        const cross = (x1 - x0) * (y - y0) - (y1 - y0) * (x - x0);
        if (cross < 0) {
          this.triangles[trianglesLen++] = p0;
          this.triangles[trianglesLen++] = p1;
          this.triangles[trianglesLen++] = i;
        }
      }
    }
    
    // Trim arrays
    this.triangles = this.triangles.subarray(0, trianglesLen);
    this.halfedges.fill(-1);
  }
}

// Compute Voronoi cell for Lloyd's relaxation
function computeVoronoiCell(i, points, triangles) {
  const n = points.length >> 1;
  const x = points[2 * i];
  const y = points[2 * i + 1];
  
  // Find triangles containing this point
  const cell = [];
  for (let t = 0; t < triangles.length; t += 3) {
    if (triangles[t] === i || triangles[t + 1] === i || triangles[t + 2] === i) {
      // Compute circumcenter
      const j = triangles[t], k = triangles[t + 1], l = triangles[t + 2];
      const ax = points[2 * j], ay = points[2 * j + 1];
      const bx = points[2 * k], by = points[2 * k + 1];
      const cx = points[2 * l], cy = points[2 * l + 1];
      
      const dx = bx - ax, dy = by - ay;
      const ex = cx - ax, ey = cy - ay;
      const bl = dx * dx + dy * dy;
      const cl = ex * ex + ey * ey;
      const d = 0.5 / (dx * ey - dy * ex);
      
      const ccx = ax + (ey * bl - dy * cl) * d;
      const ccy = ay + (dx * cl - ex * bl) * d;
      
      cell.push([ccx, ccy]);
    }
  }
  
  return cell;
}

// Compute centroid of polygon
function centroid(polygon) {
  let x = 0, y = 0, area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const v = polygon[i][0] * polygon[j][1] - polygon[j][0] * polygon[i][1];
    area += v;
    x += (polygon[i][0] + polygon[j][0]) * v;
    y += (polygon[i][1] + polygon[j][1]) * v;
  }
  area *= 0.5;
  return area > 0 ? [x / (6 * area), y / (6 * area)] : polygon[0];
}

// Lloyd's relaxation
function lloydRelaxation(points, iterations = 2) {
  const n = points.length >> 1;
  let coords = Float64Array.from(points);
  
  for (let iter = 0; iter < iterations; iter++) {
    // Triangulate current points
    const delaunay = new Delaunator(coords);
    
    // Move each point to centroid of its Voronoi cell
    const newCoords = new Float64Array(coords.length);
    for (let i = 0; i < n; i++) {
      const cell = computeVoronoiCell(i, coords, delaunay.triangles);
      if (cell.length > 2) {
        const c = centroid(cell);
        // Keep points within unit square
        newCoords[2 * i] = Math.max(0, Math.min(1, c[0]));
        newCoords[2 * i + 1] = Math.max(0, Math.min(1, c[1]));
      } else {
        newCoords[2 * i] = coords[2 * i];
        newCoords[2 * i + 1] = coords[2 * i + 1];
      }
    }
    coords = newCoords;
  }
  
  return coords;
}

// Generate random planar graph
function generatePlanarGraph(n = 50, relaxationIterations = 2, seed = null) {
  // Simple seedable random number generator
  let rng = seed !== null ? seed : Date.now();
  const random = () => {
    rng = (rng * 9301 + 49297) % 233280;
    return rng / 233280;
  };
  
  // Generate random points in unit square
  const points = new Float64Array(n * 2);
  for (let i = 0; i < n; i++) {
    points[2 * i] = random();
    points[2 * i + 1] = random();
  }
  
  // Apply Lloyd's relaxation
  const relaxedPoints = lloydRelaxation(points, relaxationIterations);
  
  // Triangulate to get edges
  const delaunay = new Delaunator(relaxedPoints);
  
  // Build edge list (unique edges only)
  const edges = new Set();
  for (let i = 0; i < delaunay.triangles.length; i += 3) {
    const a = delaunay.triangles[i];
    const b = delaunay.triangles[i + 1];
    const c = delaunay.triangles[i + 2];
    
    // Add edges (sorted to avoid duplicates)
    edges.add(a < b ? `${a}-${b}` : `${b}-${a}`);
    edges.add(b < c ? `${b}-${c}` : `${c}-${b}`);
    edges.add(a < c ? `${a}-${c}` : `${c}-${a}`);
  }
  
  // Convert to edge array
  const edgeArray = Array.from(edges).map(e => {
    const [a, b] = e.split('-').map(Number);
    return [a, b];
  });
  
  // Convert points to array format
  const vertices = [];
  for (let i = 0; i < n; i++) {
    vertices.push({
      id: i,
      x: relaxedPoints[2 * i],
      y: relaxedPoints[2 * i + 1]
    });
  }
  
  return {
    vertices,
    edges: edgeArray,
    triangles: Array.from(delaunay.triangles)
  };
}
