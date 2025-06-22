// NumpadView.js - View for number pad
export class NumpadView {
  constructor(container) {
    this.container = container;
    this.buttons = new Map();
    
    // Callback
    this.onNumberClick = null;
    
    this.initializeButtons();
  }

  initializeButtons() {
    // Get all number buttons
    const numButtons = this.container.querySelectorAll('.num-btn');
    
    numButtons.forEach(btn => {
      const num = parseInt(btn.dataset.num);
      if (!isNaN(num)) {
        this.buttons.set(num, btn);
        
        // Add click listener
        btn.addEventListener('click', () => {
          if (this.onNumberClick) {
            this.onNumberClick(num);
          }
        });
      }
    });
  }

  update(state) {
    const { counts, selectedNumber, hasSelectedCell } = state;
    
    // Update each button
    this.buttons.forEach((btn, num) => {
      // Disable if all 9 of this number are placed
      const isDisabled = counts[num] >= 9;
      btn.classList.toggle('disabled', isDisabled);
      
      // Active if this number is selected and no cell is selected
      const isActive = selectedNumber === num && !hasSelectedCell;
      btn.classList.toggle('active', isActive);
    });
  }

  destroy() {
    // Clear references
    this.buttons.clear();
  }
}