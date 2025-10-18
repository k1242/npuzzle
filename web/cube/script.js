class CubeApp {
  constructor() {
    this.player = document.getElementById('cube');
    this.statusEl = document.getElementById('status');
    this.solutionEl = document.getElementById('solution');
    this.solveBtn = document.getElementById('solveBtn');
    
    this.currentAlg = '';
    this.isAnimating = false;
    this.isInitialized = false;
    
    this.worker = new Worker('./worker.js');
    this.setupWorker();
    this.init();
  }

  setupWorker() {
    this.worker.onmessage = (e) => {
      const { type, success, moves, solution, step, total, error } = e.data;
      
      switch (type) {
        case 'init':
          if (success) {
            this.isInitialized = true;
            this.setStatus('Ready');
          }
          break;
          
        case 'scramble':
          this.applyScramble(moves);
          break;
          
        case 'solved':
          this.applySolution(solution);
          break;
          
        case 'progress':
          this.solveBtn.textContent = `Step ${step}/${total}`;
          break;
          
        case 'error':
          this.setStatus('Error: ' + error, 'error');
          this.isAnimating = false;
          this.setButtonsEnabled(true);
          this.solveBtn.textContent = 'Solve';
          break;
      }
    };
  }

  async init() {
    try {
      this.setStatus('Loading model...');
      this.worker.postMessage({ type: 'init' });
    } catch (error) {
      this.setStatus('Failed to load model', 'error');
    }
  }

  setStatus(message, type = '') {
    this.statusEl.textContent = message;
    this.statusEl.className = `status ${type}`;
  }

  showSolution(moves) {
    this.solutionEl.innerHTML = `<strong>Solution (${moves.length} moves):</strong>${moves.join(' ')}`;
    this.solutionEl.classList.add('visible');
  }

  hideSolution() {
    this.solutionEl.classList.remove('visible');
  }

  setButtonsEnabled(enabled) {
    document.querySelectorAll('button').forEach(btn => {
      btn.disabled = !enabled;
    });
  }

  async rotate(move) {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.setButtonsEnabled(false);
    this.hideSolution();
    
    this.currentAlg += (this.currentAlg ? ' ' : '') + move;
    this.player.alg = this.currentAlg;
    this.player.tempoScale = 3;
    await this.player.play();
    
    this.isAnimating = false;
    this.setButtonsEnabled(true);
  }

  async scramble() {
    if (this.isAnimating || !this.isInitialized) return;
    this.isAnimating = true;
    this.setButtonsEnabled(false);
    this.hideSolution();
    this.setStatus('Generating scramble...');
    
    this.worker.postMessage({ type: 'scramble', data: { numMoves: 50 } });
  }

  async applyScramble(moves) {
    this.currentAlg = moves.join(' ');
    this.player.alg = this.currentAlg;
    this.player.timestamp = 0;
    this.player.tempoScale = 15;
    this.setStatus('Scrambling...');
    
    await this.player.play();
    this.isAnimating = false;
    this.setButtonsEnabled(true);
    this.setStatus('Scrambled 50 times');
  }

  async solve() {
    if (this.isAnimating || !this.isInitialized) return;
    if (!this.currentAlg) {
      this.setStatus('Cube is already solved!', 'solved');
      return;
    }
    
    this.isAnimating = true;
    this.setButtonsEnabled(false);
    this.hideSolution();
    this.solveBtn.textContent = 'Step 0/50';
    this.setStatus('Solving...', 'solving');
    
    this.worker.postMessage({ type: 'solve', data: { alg: this.currentAlg } });
  }

  async applySolution(solution) {
    this.solveBtn.textContent = 'Solve';
    
    if (!solution || solution.length === 0) {
      this.setStatus('Already solved!', 'solved');
      this.isAnimating = false;
      this.setButtonsEnabled(true);
      return;
    }
    
    if (!solution) {
      this.setStatus('No solution found', 'error');
      this.isAnimating = false;
      this.setButtonsEnabled(true);
      return;
    }
    
    this.showSolution(solution);
    this.currentAlg += ' ' + solution.join(' ');
    this.player.alg = this.currentAlg;
    this.player.tempoScale = 3;
    this.setStatus('Solution found! Playing...');
    
    await this.player.play();
    this.setStatus(`Solved in ${solution.length} moves!`, 'solved');
    this.isAnimating = false;
    this.setButtonsEnabled(true);
  }

  reset() {
    if (this.isAnimating) return;
    this.currentAlg = '';
    this.player.alg = '';
    this.player.timestamp = 0;
    this.hideSolution();
    this.setStatus('Reset - ready');
    this.solveBtn.textContent = 'Solve';
  }
}

window.app = new CubeApp();