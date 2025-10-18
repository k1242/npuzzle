// Rubik's Cube Solver Web Worker
importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/ort.min.js');

// Configure WASM paths for ONNX Runtime
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/';
ort.env.wasm.numThreads = 1; // Single thread to avoid CORS issues

const BEAM_WIDTH = 2048;
const MAX_STEPS = 50;
const BATCH_SIZE = 128;
const STATE_SIZE = 54;

// Hash vector for state hashing
const hashVec = new BigInt64Array(STATE_SIZE);
for (let i = 0; i < STATE_SIZE; i++) {
  hashVec[i] = BigInt(Math.floor(Math.random() * 1e15));
}

class RubiksSolver {
  constructor() {
    this.session = null;
    this.moves = null;
    this.moveNames = null;
    this.solvedState = new Int32Array([
      0,0,0,0,0,0,0,0,0, 1,1,1,1,1,1,1,1,1, 2,2,2,2,2,2,2,2,2,
      3,3,3,3,3,3,3,3,3, 4,4,4,4,4,4,4,4,4, 5,5,5,5,5,5,5,5,5
    ]);
    this.ready = false;
  }

  async init() {
    if (this.ready) return;
    try {
      this.session = await ort.InferenceSession.create('./model2.onnx');
      const response = await fetch('./moves.json');
      const data = await response.json();
      this.moves = data.actions.map(m => new Int32Array(m));
      this.moveNames = data.names;
      this.ready = true;
    } catch (error) {
      throw error;
    }
  }

  simpleHash(state) {
    let hash = 0n;
    for (let i = 0; i < STATE_SIZE; i++) {
      hash += hashVec[i] * BigInt(state[i]);
    }
    return Number(hash % BigInt(Number.MAX_SAFE_INTEGER));
  }

  applyMove(state, move) {
    const result = new Int32Array(STATE_SIZE);
    for (let i = 0; i < STATE_SIZE; i++) {
      result[i] = state[move[i]];
    }
    return result;
  }

  isSolved(state) {
    for (let i = 0; i < STATE_SIZE; i++) {
      if (state[i] !== this.solvedState[i]) return false;
    }
    return true;
  }

  async batchPredict(states) {
    const batchSize = states.length;
    const inputData = new BigInt64Array(batchSize * STATE_SIZE);
    for (let i = 0; i < batchSize; i++) {
      for (let j = 0; j < STATE_SIZE; j++) {
        inputData[i * STATE_SIZE + j] = BigInt(states[i][j]);
      }
    }
    const tensor = new ort.Tensor('int64', inputData, [batchSize, STATE_SIZE]);
    const results = await this.session.run({ input: tensor });
    return Array.from(results.output.data);
  }

  quickselect(arr, k, left = 0, right = arr.length - 1) {
    while (right > left) {
      const pivotIndex = this.partition(arr, left, right);
      if (pivotIndex === k) break;
      if (pivotIndex < k) left = pivotIndex + 1;
      else right = pivotIndex - 1;
    }
  }

  partition(arr, left, right) {
    const pivot = arr[right].value;
    let i = left;
    for (let j = left; j < right; j++) {
      if (arr[j].value < pivot) {
        [arr[i], arr[j]] = [arr[j], arr[i]];
        i++;
      }
    }
    [arr[i], arr[right]] = [arr[right], arr[i]];
    return i;
  }

  async solve(initialState) {
    if (!this.ready) await this.init();
    const numMoves = this.moves.length;
    const nodes = [{parentId: -1, move: -1}];
    let beam = [{state: initialState, nodeId: 0}];
    
    for (let step = 0; step < MAX_STEPS; step++) {
      postMessage({ type: 'progress', step: step + 1, total: MAX_STEPS });
      
      const candidates = [];
      for (const item of beam) {
        for (let m = 0; m < numMoves; m++) {
          candidates.push({
            state: this.applyMove(item.state, this.moves[m]),
            parentNodeId: item.nodeId,
            move: m
          });
        }
      }
      
      const seen = new Map();
      const unique = [];
      for (const cand of candidates) {
        const hash = this.simpleHash(cand.state);
        if (!seen.has(hash)) {
          seen.set(hash, true);
          unique.push(cand);
        }
      }
      
      if (unique.length === 0) break;
      
      for (const u of unique) {
        u.nodeId = nodes.length;
        nodes.push({parentId: u.parentNodeId, move: u.move});
      }
      
      const values = [];
      for (let i = 0; i < unique.length; i += BATCH_SIZE) {
        const batch = unique.slice(i, Math.min(i + BATCH_SIZE, unique.length));
        const batchStates = batch.map(u => u.state);
        const batchVals = await this.batchPredict(batchStates);
        values.push(...batchVals);
      }
      
      for (let i = 0; i < unique.length; i++) {
        unique[i].value = values[i];
      }
      
      const k = Math.min(BEAM_WIDTH, unique.length);
      this.quickselect(unique, k);
      const topK = unique.slice(0, k);
      
      for (const candidate of topK) {
        if (this.isSolved(candidate.state)) {
          return this.reconstructPath(nodes, candidate.nodeId);
        }
      }
      
      beam = topK.map(u => ({state: u.state, nodeId: u.nodeId}));
    }
    return null;
  }

  reconstructPath(nodes, solvedNodeId) {
    const path = [];
    let nodeId = solvedNodeId;
    while (nodes[nodeId].parentId !== -1) {
      path.unshift(nodes[nodeId].move);
      nodeId = nodes[nodeId].parentId;
    }
    return path.map(i => this.moveNames[i]);
  }

  createScrambledState(numMoves = 50) {
    let state = new Int32Array(this.solvedState);
    const scrambleMoves = [];
    for (let i = 0; i < numMoves; i++) {
      const moveIdx = Math.floor(Math.random() * this.moves.length);
      state = this.applyMove(state, this.moves[moveIdx]);
      scrambleMoves.push(this.moveNames[moveIdx]);
    }
    return { state, moves: scrambleMoves };
  }

  algToState(alg) {
    const moveStrs = alg.trim().split(/\s+/).filter(m => m);
    let state = new Int32Array(this.solvedState);
    for (const moveStr of moveStrs) {
      const idx = this.moveNames.indexOf(moveStr);
      if (idx !== -1) {
        state = this.applyMove(state, this.moves[idx]);
      }
    }
    return state;
  }
}

const solver = new RubiksSolver();

// Handle messages from main thread
onmessage = async (e) => {
  const { type, data } = e.data;
  
  try {
    switch (type) {
      case 'init':
        await solver.init();
        postMessage({ type: 'init', success: true });
        break;
        
      case 'scramble':
        const scramble = solver.createScrambledState(data.numMoves);
        postMessage({ type: 'scramble', moves: scramble.moves });
        break;
        
      case 'solve':
        const currentState = solver.algToState(data.alg);
        if (solver.isSolved(currentState)) {
          postMessage({ type: 'solved', solution: [] });
        } else {
          const solution = await solver.solve(currentState);
          postMessage({ type: 'solved', solution });
        }
        break;
    }
  } catch (error) {
    postMessage({ type: 'error', error: error.message });
  }
};