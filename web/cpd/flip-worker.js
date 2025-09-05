// flip-worker.js - Web Worker for descent algorithm

// Convert 0/1 array to BigInt bitmask
const packBits = (arr) => {
  let val = 0n;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) val |= (1n << BigInt(i));
  }
  return val;
};

// Convert BigInt bitmask to 0/1 array
const unpackBits = (n, big) => {
  const out = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    out[i] = Number((BigInt(big) >> BigInt(i)) & 1n);
  }
  return out;
};

// Convert UI components to flat BigInt array
const componentsToFlat = (components) => {
  const flat = [];
  for (const c of components) {
    flat.push(packBits(c.u), packBits(c.v), packBits(c.w));
  }
  return flat;
};

// Convert flat BigInt array to UI components
const flatToComponents = (flat, n) => {
  const out = [];
  for (let i = 0; i < flat.length; i += 3) {
    out.push({
      u: unpackBits(n, flat[i]),
      v: unpackBits(n, flat[i + 1]),
      w: unpackBits(n, flat[i + 2])
    });
  }
  return out;
};

// Scheme class for descent algorithm
class Scheme {
  constructor(dataFlat) {
    this.data = dataFlat.map(x => BigInt(x));
    
    // Maps for finding duplicate values
    this.unique = [new Map(), new Map(), new Map()];
    
    // Arrays of flippable values (multiplicity >= 2)
    this.flippable = [[], [], []];
    this.flippableIdx = [new Map(), new Map(), new Map()];
    
    // Non-zero term tracking
    this.nonZero = [];
    this.nonZeroPos = new Map();

    // Build indices
    const nTerms = this.data.length / 3;
    for (let i = 0; i < nTerms; i++) {
      if (this.data[3 * i] !== 0n) {
        this.nonZeroPos.set(i, this.nonZero.length);
        this.nonZero.push(i);
        this._add(i, 0, this.data[3 * i]);
        this._add(i, 1, this.data[3 * i + 1]);
        this._add(i, 2, this.data[3 * i + 2]);
      }
    }
  }

  rank() { return this.nonZero.length; }

  flip() {
    const pair = this._samplePair();
    if (!pair) return false;

    const { type, j1, j2 } = pair;
    const tn = (type + 1) % 3;
    const tp = (type + 2) % 3;

    const n1 = this.data[3 * j1 + tn];
    const n2 = this.data[3 * j2 + tn];
    const p1 = this.data[3 * j1 + tp];
    const p2 = this.data[3 * j2 + tp];

    this._set(j1, tn, n1 ^ n2);
    this._set(j2, tp, p1 ^ p2);

    return true;
  }

  _add(termIdx, comp, val) {
    if (val === 0n) return;
    const m = this.unique[comp];
    let arr = m.get(val);
    if (!arr) {
      m.set(val, [termIdx]);
    } else {
      arr.push(termIdx);
      if (arr.length === 2) {
        // Became flippable
        const list = this.flippable[comp];
        this.flippableIdx[comp].set(val, list.length);
        list.push(val);
      }
    }
  }

  _del(termIdx, comp, val) {
    if (val === 0n) return;
    const m = this.unique[comp];
    const arr = m.get(val);
    if (!arr) return;

    const pos = arr.indexOf(termIdx);
    if (pos !== -1) {
      arr[pos] = arr[arr.length - 1];
      arr.pop();
    }
    
    if (arr.length === 1) {
      // No longer flippable
      const list = this.flippable[comp];
      const idxMap = this.flippableIdx[comp];
      const i = idxMap.get(val);
      if (i !== undefined) {
        const lastVal = list[list.length - 1];
        list[i] = lastVal;
        idxMap.set(lastVal, i);
        list.pop();
        idxMap.delete(val);
      }
    } else if (arr.length === 0) {
      m.delete(val);
    }
  }

  _set(termIdx, comp, newVal) {
    const idx = termIdx * 3 + comp;
    const oldVal = this.data[idx];
    if (oldVal === newVal) return;

    if (newVal === 0n) {
      // Zero out entire term
      this._zeroOutTerm(termIdx);
      return;
    }

    this._del(termIdx, comp, oldVal);
    this.data[idx] = newVal;
    this._add(termIdx, comp, newVal);
  }

  _zeroOutTerm(termIdx) {
    for (let c = 0; c < 3; c++) {
      const val = this.data[3 * termIdx + c];
      this._del(termIdx, c, val);
      this.data[3 * termIdx + c] = 0n;
    }

    const pos = this.nonZeroPos.get(termIdx);
    if (pos !== undefined) {
      const lastIdx = this.nonZero[this.nonZero.length - 1];
      this.nonZero[pos] = lastIdx;
      this.nonZeroPos.set(lastIdx, pos);
      this.nonZero.pop();
      this.nonZeroPos.delete(termIdx);
    }
  }

  _samplePair() {
    const s0 = this.flippable[0].length;
    const s1 = this.flippable[1].length;
    const s2 = this.flippable[2].length;
    const total = s0 + s1 + s2;
    
    if (total === 0) return null;

    let x = Math.floor(Math.random() * total);
    let type = 0;
    
    if (x < s0) {
      type = 0;
    } else if (x < s0 + s1) {
      type = 1;
      x -= s0;
    } else {
      type = 2;
      x -= (s0 + s1);
    }

    const val = this.flippable[type][x];
    const block = this.unique[type].get(val);
    if (!block || block.length < 2) return null;

    const i1 = Math.floor(Math.random() * block.length);
    let i2 = Math.floor(Math.random() * (block.length - 1));
    if (i2 >= i1) i2++;
    
    return { type, j1: block[i1], j2: block[i2] };
  }
}

// Run descent algorithm with progress reporting
function runDescent(inputData, flipLim = 1_000_000) {
  const scheme = new Scheme(inputData);
  const initialRank = scheme.rank();
  let bestRank = initialRank;
  const updateInterval = 10000; // Update every 10k flips

  for (let i = 0; i < flipLim; i++) {
    if (!scheme.flip()) break;
    const rank = scheme.rank();
    if (rank < bestRank) bestRank = rank;
    
    // Report progress
    if (i % updateInterval === 0) {
      postMessage({
        type: 'progress',
        current: i,
        total: flipLim,
        currentRank: rank,
        bestRank: bestRank
      });
    }
  }

  return {
    data: scheme.data,
    initialRank,
    finalRank: bestRank
  };
}

// Handle messages from main thread
onmessage = function(e) {
  const { components, n, flipLim = 1_000_000 } = e.data;
  
  const flat = componentsToFlat(components);
  const result = runDescent(flat, flipLim);
  
  // Filter out zero terms
  const filtered = [];
  for (let i = 0; i < result.data.length; i += 3) {
    if (result.data[i] !== 0n && result.data[i + 1] !== 0n && result.data[i + 2] !== 0n) {
      filtered.push(result.data[i], result.data[i + 1], result.data[i + 2]);
    }
  }
  
  const reducedComponents = flatToComponents(filtered, n);
  
  postMessage({
    type: 'complete',
    components: reducedComponents,
    initialRank: result.initialRank,
    finalRank: result.finalRank
  });
};