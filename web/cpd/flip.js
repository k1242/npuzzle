// flip.js
// Descent engine + helpers for converting between UI components and flat BigInt triples.
// All comments in code should be in English.

(function (global) {
  'use strict';

  // --------------------------- Utilities ---------------------------

  /** Ensure BigInt */
  const toBig = (x) => (typeof x === 'bigint' ? x : BigInt(x));

  /** Random integer in [0, n) */
  const randInt = (n) => Math.floor(Math.random() * n);

  /** Pack a 0/1 array into a BigInt bitmask (LSB = index 0) */
  function packBits01(arr) {
    let val = 0n;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i]) val |= (1n << BigInt(i));
    }
    return val;
  }

  /** Unpack a BigInt bitmask into a 0/1 array of fixed length n (LSB = index 0) */
  function unpackBits01(n, big) {
    big = toBig(big);
    const out = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      out[i] = Number((big >> BigInt(i)) & 1n);
    }
    return out;
  }

  /** Convert UI {u:[],v:[],w:[]}[] to flat [u0,v0,w0, u1,v1,w1, ...] BigInt[] */
  function componentsToFlat(components) {
    const flat = [];
    for (const comp of components) {
      flat.push(
        packBits01(comp.u),
        packBits01(comp.v),
        packBits01(comp.w)
      );
    }
    return flat;
  }

  /** Convert flat BigInt[] back to UI components with fixed bit-length n */
  function flatToComponents(flat, n) {
    const out = [];
    for (let i = 0; i < flat.length; i += 3) {
      const u = unpackBits01(n, flat[i + 0]);
      const v = unpackBits01(n, flat[i + 1]);
      const w = unpackBits01(n, flat[i + 2]);
      out.push({ u, v, w });
    }
    return out;
  }

  /** Keep only terms where all three components are non-zero BigInt */
  function filterNonZeroAll(flat) {
    const kept = [];
    for (let i = 0; i < flat.length; i += 3) {
      const u = toBig(flat[i + 0]);
      const v = toBig(flat[i + 1]);
      const w = toBig(flat[i + 2]);
      if (u !== 0n && v !== 0n && w !== 0n) {
        kept.push(u, v, w);
      }
    }
    return kept;
  }

  // ------------------------ Descent Engine -------------------------

  /**
   * Single-threaded descent for flip-graph search over triples with XOR.
   * Input/Output data format: flat BigInt array [..., u_i, v_i, w_i, ...] of length multiple of 3.
   *
   * Options:
   *  - flipLim: maximum number of flip attempts
   *  - plusLim: number of consecutive non-improving flips before performing one plus-transition
   */
  function runDescent(inputData, { flipLim = 10_000_000, plusLim = 10_000 } = {}) {
    // Validate and normalize input
    if (!Array.isArray(inputData) || inputData.length % 3 !== 0) {
      throw new Error("data must be a flat array with length divisible by 3");
    }
    const data = inputData.map(toBig);

    // ---- Scheme implementation (adapted for BigInt/XOR) ----

    class Scheme {
      /**
       * @param {bigint[]} dataFlat - flat array [u0,v0,w0, u1,v1,w1, ...]
       */
      constructor(dataFlat) {
        // Copy to avoid mutating caller-owned buffer
        this.data = dataFlat.slice();

        // unique[comp]: Map<bigint, number[]> of term indices having this value
        this.unique = [new Map(), new Map(), new Map()];

        // flippable[comp]: array of values (bigint) with multiplicity >= 2
        this.flippable = [[], [], []];

        // flippableIdx[comp]: Map<bigint, number> index within flippable[comp]
        this.flippableIdx = [new Map(), new Map(), new Map()];

        // Maintain a dynamic list of non-zero term indices for fast sampling
        this.nonZero = [];
        this.nonZeroPos = new Map(); // term_idx -> position in nonZero array

        const nTerms = this.data.length / 3;

        // Build indices
        for (let i = 0; i < nTerms; i++) {
          const u = this.data[3 * i + 0];
          if (u !== 0n) {
            // Only terms whose first component is non-zero are considered "present"
            this.nonZeroPos.set(i, this.nonZero.length);
            this.nonZero.push(i);
            // Add each component to its map
            this._add(i, 0, this.data[3 * i + 0]);
            this._add(i, 1, this.data[3 * i + 1]);
            this._add(i, 2, this.data[3 * i + 2]);
          }
        }
      }

      // ---- public API ----

      getData() {
        return this.data.slice();
      }

      rank() {
        // Rank is the number of non-zero terms (based on u != 0)
        return this.nonZero.length;
      }

      // Perform a single flip; returns false if not possible
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

        // No extra reduction pass here; zeroing is handled inside _set when a component becomes 0.
        return true;
      }

      // Perform a single plus transition; returns false if not possible
      plus() {
        let attempts = 0;
        const maxAttempts = 64; // avoid pathological infinite loops
        while (attempts++ < maxAttempts) {
          const pair = this._sampleAnyPair();
          if (!pair) return false;
          const { idx1, idx2 } = pair;

          const a1 = this.data[3 * idx1 + 0];
          const b1 = this.data[3 * idx1 + 1];
          const c1 = this.data[3 * idx1 + 2];

          const a2 = this.data[3 * idx2 + 0];
          const b2 = this.data[3 * idx2 + 1];
          const c2 = this.data[3 * idx2 + 2];

          // Skip pairs that share any identical component
          if (a1 === a2 || b1 === b2 || c1 === c2) continue;

          // New values (bitwise XOR over BigInt)
          const new_b1 = b1 ^ b2;

          const new_a2 = a1;
          const new_c2 = c1 ^ c2;

          const new_a3 = a1 ^ a2;
          const new_b3 = b2;
          const new_c3 = c2;

          // Update idx1: only component 1 (b)
          this._del(idx1, 1, b1);
          this.data[3 * idx1 + 1] = new_b1;
          this._add(idx1, 1, new_b1);

          // Update idx2: components 0 (a) and 2 (c)
          this._del(idx2, 0, a2);
          this._del(idx2, 2, c2);
          this.data[3 * idx2 + 0] = new_a2;
          this.data[3 * idx2 + 2] = new_c2;
          this._add(idx2, 0, new_a2);
          this._add(idx2, 2, new_c2);

          // Add the new third term
          this._addTerm(new_a3, new_b3, new_c3);

          return true;
        }
        return false;
      }

      // ---- internal: indices maintenance ----

      _add(termIdx, comp, val) {
        if (val === 0n) return;
        const m = this.unique[comp];
        let arr = m.get(val);
        if (!arr) {
          arr = [termIdx];
          m.set(val, arr);
        } else {
          arr.push(termIdx);
          if (arr.length === 2) {
            // Became flippable
            this._flippableAdd(comp, val);
          }
        }
      }

      _del(termIdx, comp, val) {
        if (val === 0n) return;
        const m = this.unique[comp];
        const arr = m.get(val);
        if (!arr) return;

        // Remove termIdx by swap-with-last
        const pos = arr.indexOf(termIdx);
        if (pos !== -1) {
          const last = arr[arr.length - 1];
          arr[pos] = last;
          arr.pop();
        }
        if (arr.length === 1) {
          // No longer flippable
          this._flippableRemove(comp, val);
        }
        if (arr.length === 0) {
          m.delete(val);
        }
      }

      _flippableAdd(comp, val) {
        const list = this.flippable[comp];
        const idxMap = this.flippableIdx[comp];
        idxMap.set(val, list.length);
        list.push(val);
      }

      _flippableRemove(comp, val) {
        const list = this.flippable[comp];
        const idxMap = this.flippableIdx[comp];
        const i = idxMap.get(val);
        if (i === undefined) return;
        const lastVal = list[list.length - 1];
        list[i] = lastVal;
        idxMap.set(lastVal, i);
        list.pop();
        idxMap.delete(val);
      }

      _addTerm(u, v, w) {
        // Find first zero triple to reuse; else append
        const nTerms = this.data.length / 3;
        let slot = -1;
        for (let i = 0; i < nTerms; i++) {
          if (this.data[3 * i + 0] === 0n) {
            slot = i;
            break;
          }
        }
        if (slot === -1) {
          this.data.push(u, v, w);
          slot = nTerms;
        } else {
          this.data[3 * slot + 0] = u;
          this.data[3 * slot + 1] = v;
          this.data[3 * slot + 2] = w;
        }

        // Mark as non-zero term
        this.nonZeroPos.set(slot, this.nonZero.length);
        this.nonZero.push(slot);

        // Update indices
        this._add(slot, 0, u);
        this._add(slot, 1, v);
        this._add(slot, 2, w);
      }

      _zeroOutTerm(termIdx) {
        const u = this.data[3 * termIdx + 0];
        const v = this.data[3 * termIdx + 1];
        const w = this.data[3 * termIdx + 2];

        this._del(termIdx, 0, u);
        this._del(termIdx, 1, v);
        this._del(termIdx, 2, w);

        this.data[3 * termIdx + 0] = 0n;
        this.data[3 * termIdx + 1] = 0n;
        this.data[3 * termIdx + 2] = 0n;

        // Remove from nonZero array by swap-with-last
        const pos = this.nonZeroPos.get(termIdx);
        if (pos !== undefined) {
          const lastIdx = this.nonZero[this.nonZero.length - 1];
          this.nonZero[pos] = lastIdx;
          this.nonZeroPos.set(lastIdx, pos);
          this.nonZero.pop();
          this.nonZeroPos.delete(termIdx);
        }
      }

      _set(termIdx, comp, newVal) {
        const idx = termIdx * 3 + comp;
        const oldVal = this.data[idx];
        if (oldVal === newVal) return;

        if (newVal === 0n) {
          // Setting a component to 0 via this path zeros the entire term
          this._zeroOutTerm(termIdx);
          return;
        }

        this._del(termIdx, comp, oldVal);
        this.data[idx] = newVal;
        this._add(termIdx, comp, newVal);
      }

      // ---- sampling ----

      // Sample a random pair of terms that share a duplicate value in some component
      _samplePair() {
        const s0 = this.flippable[0].length;
        const s1 = this.flippable[1].length;
        const s2 = this.flippable[2].length;

        const total = s0 + s1 + s2;
        if (total === 0) return null;

        let x = randInt(total);
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

        const l = block.length;
        let j1, j2;
        if (l === 2) {
          if (randInt(2) === 0) {
            j1 = block[0]; j2 = block[1];
          } else {
            j1 = block[1]; j2 = block[0];
          }
        } else {
          const i1 = randInt(l);
          let i2 = randInt(l - 1);
          if (i2 >= i1) i2++;
          j1 = block[i1];
          j2 = block[i2];
        }
        return { type, j1, j2 };
      }

      // Sample any two distinct non-zero terms
      _sampleAnyPair() {
        const n = this.nonZero.length;
        if (n < 2) return null;
        const i1 = randInt(n);
        let i2 = randInt(n - 1);
        if (i2 >= i1) i2++;
        return { idx1: this.nonZero[i1], idx2: this.nonZero[i2] };
      }
    }

    // ---- main loop ----

    const scheme = new Scheme(data);
    let bestRank = scheme.rank();
    let flipsSinceImprovement = 0;

    for (let i = 0; i < flipLim; i++) {
      if (!scheme.flip()) break;

      const currentRank = scheme.rank();
      if (currentRank < bestRank) {
        bestRank = currentRank;
        flipsSinceImprovement = 0;
      } else {
        flipsSinceImprovement++;
      }

      // if (flipsSinceImprovement >= plusLim) {
      //   if (scheme.plus()) {
      //     flipsSinceImprovement = 0;
      //     const r = scheme.rank();
      //     if (r < bestRank) bestRank = r;
      //   }
      // }
    }

    return scheme.getData();
  }

  // --------------------------- API facade --------------------------

  /**
   * Run 1+ steps of descent on current components and return a filtered UI component list.
   * Filter keeps only terms where all 3 components are non-zero.
   */
  function reduceComponents(components, n, { flipLim = 1_000_000, plusLim = 10_000_000 } = {}) {
    const flat = componentsToFlat(components);
    const resultFlat = runDescent(flat, { flipLim, plusLim });
    const filteredFlat = filterNonZeroAll(resultFlat);
    return flatToComponents(filteredFlat, n);
  }

  // Expose to global
  global.Flip = {
    runDescent,
    reduceComponents,
    componentsToFlat,
    flatToComponents,
    packBits01,
    unpackBits01
  };

})(window);