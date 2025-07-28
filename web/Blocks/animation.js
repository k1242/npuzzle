// ====== ANIMATION MANAGER ======

import { Config } from './config.js';
import { GameEvents } from './events.js';

export class AnimationManager {
  constructor(boardEl, eventBus) {
    this.boardEl = boardEl;
    this.events = eventBus;
    this.enabled = true;
    this.activeAnimations = new Set();
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Listen for animation toggle
    this.events.on(GameEvents.ANIMATION_TOGGLE, (enabled) => {
      this.setEnabled(enabled);
    });
    
    // Listen for line clear events
    this.events.on(GameEvents.LINES_CLEARED, (data) => {
      this.animateLineClear(data.lines, data.callback);
    });
  }
  
  setEnabled(enabled) {
    this.enabled = enabled;
    document.body.classList.toggle('no-animations', !enabled);
    
    // Cancel any active animations if disabling
    if (!enabled) {
      this.cancelAllAnimations();
    }
  }
  
  // Line clear animation
  animateLineClear(lines, callback) {
    if (!this.enabled || !this.boardEl) {
      callback();
      return;
    }
    
    const animationId = Symbol('lineClear');
    this.activeAnimations.add(animationId);
    
    // Add clearing class to cells
    lines.forEach(row => {
      for (let c = 0; c < Config.BOARD.COLS; c++) {
        const idx = row * Config.BOARD.COLS + c;
        this.boardEl.children[idx]?.classList.add('clearing');
      }
    });
    
    // Wait for clear animation then trigger falling
    setTimeout(() => {
      this.animateFallingPieces(lines, () => {
        this.activeAnimations.delete(animationId);
        callback();
      });
    }, Config.TIMING.LINE_CLEAR_ANIMATION);
  }
  
  // Falling pieces animation after line clear
  animateFallingPieces(clearedRows, callback) {
    if (!this.enabled || !this.boardEl) {
      callback();
      return;
    }
    
    const highestClearedRow = Math.min(...clearedRows);
    
    // Small delay to let line clear animation finish
    setTimeout(() => {
      // Add falling animation to blocks above cleared lines
      for (let r = 0; r < highestClearedRow; r++) {
        for (let c = 0; c < Config.BOARD.COLS; c++) {
          const idx = r * Config.BOARD.COLS + c;
          const cell = this.boardEl.children[idx];
          if (cell && cell.classList.contains('filled')) {
            // Calculate drop distance
            const linesBelow = clearedRows.filter(row => row > r).length;
            
            cell.style.transition = 'transform 0.1s linear';
            cell.style.transform = `translateY(calc(${linesBelow} * var(--cell-size))) scale(0.9)`;
          }
        }
      }
      
      // Wait for animation to complete
      setTimeout(() => {
        // Reset all transforms
        this.boardEl.querySelectorAll('.cell').forEach(cell => {
          cell.style.transition = '';
          cell.style.transform = '';
        });
        
        callback();
      }, Config.TIMING.FALLING_ANIMATION);
    }, 0);
  }
  
  // Hard drop animation
  animateHardDrop(piece, dropDistance, onFrame, onComplete) {
    if (!this.enabled || dropDistance === 0) {
      // Skip to end position
      piece.y += dropDistance;
      onFrame();
      onComplete();
      return;
    }
    
    const animationId = Symbol('hardDrop');
    this.activeAnimations.add(animationId);
    
    const dropSpeed = Math.max(Config.TIMING.HARD_DROP_SPEED, 50 / dropDistance);
    let currentDrop = 0;
    
    const animate = () => {
      if (currentDrop < dropDistance && this.activeAnimations.has(animationId)) {
        piece.y++;
        currentDrop++;
        onFrame();
        
        if (currentDrop < dropDistance) {
          setTimeout(animate, dropSpeed);
        } else {
          this.activeAnimations.delete(animationId);
          onComplete();
        }
      } else {
        this.activeAnimations.delete(animationId);
        onComplete();
      }
    };
    
    animate();
  }
  
  // Piece spawn animation
  animatePieceSpawn(callback) {
    if (!this.enabled) {
      callback();
      return;
    }
    
    // Could add a spawn animation here
    callback();
  }
  
  // Game over animation
  animateGameOver() {
    const app = document.getElementById('app');
    if (app) {
      app.classList.add('game-over');
    }
  }
  
  // Reset game over animation
  resetGameOver() {
    const app = document.getElementById('app');
    if (app) {
      app.classList.remove('game-over');
    }
  }
  
  // Cancel all active animations
  cancelAllAnimations() {
    this.activeAnimations.clear();
    
    // Reset any CSS transforms
    if (this.boardEl) {
      this.boardEl.querySelectorAll('.cell').forEach(cell => {
        cell.style.transition = '';
        cell.style.transform = '';
        cell.classList.remove('clearing');
      });
    }
  }
  
  // Clean up
  destroy() {
    this.cancelAllAnimations();
  }
}