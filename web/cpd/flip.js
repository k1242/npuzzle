// flip.js - Wrapper for Web Worker-based reduction
(function(global) {
  'use strict';

  let worker = null;
  let currentResolve = null;
  let currentReject = null;
  let progressCallback = null;

  // Initialize worker
  function initWorker() {
    if (worker) return;
    
    worker = new Worker('./flip-worker.js');
    
    worker.onmessage = (e) => {
      const { type } = e.data;
      
      if (type === 'progress') {
        if (progressCallback) {
          progressCallback(e.data);
        }
      } else if (type === 'complete') {
        if (currentResolve) {
          currentResolve({
            components: e.data.components,
            initialRank: e.data.initialRank,
            finalRank: e.data.finalRank
          });
          currentResolve = null;
          currentReject = null;
          progressCallback = null;
        }
      }
    };
    
    worker.onerror = (err) => {
      if (currentReject) {
        currentReject(err);
        currentResolve = null;
        currentReject = null;
        progressCallback = null;
      }
    };
  }

  // Main API: reduce components with progress callback
  function reduceComponents(components, n, options = {}) {
    const { flipLim = 1_000_000, onProgress } = options;
    
    initWorker();
    
    return new Promise((resolve, reject) => {
      if (currentResolve) {
        reject(new Error('Reduction already in progress'));
        return;
      }
      
      currentResolve = resolve;
      currentReject = reject;
      progressCallback = onProgress;
      
      worker.postMessage({
        components,
        n,
        flipLim
      });
    });
  }

  global.Flip = { reduceComponents };

})(window);