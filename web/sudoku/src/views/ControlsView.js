// ControlsView.js - View for control buttons (pencil, marker, eraser, undo)
export class ControlsView {
  constructor(container) {
    this.container = container;
    
    // Get button elements
    this.pencilBtn = container.querySelector('#pencilBtn');
    this.markerBtn = container.querySelector('#markerBtn');
    this.eraserBtn = container.querySelector('#eraserBtn');
    this.undoBtn = container.querySelector('#undoBtn');
    
    // Callbacks
    this.onPencilClick = null;
    this.onMarkerClick = null;
    this.onEraserClick = null;
    this.onUndoClick = null;
    this.onMarkerDoubleClick = null;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.pencilBtn) {
      this.pencilBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onPencilClick) this.onPencilClick();
      });
    }
    
    if (this.markerBtn) {
      this.markerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onMarkerClick) this.onMarkerClick();
      });
      
      this.markerBtn.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        if (this.onMarkerDoubleClick) this.onMarkerDoubleClick();
      });
    }
    
    if (this.eraserBtn) {
      this.eraserBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onEraserClick) this.onEraserClick();
      });
    }
    
    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onUndoClick) this.onUndoClick();
      });
    }
  }

  update(state) {
    // Update button states
    if (this.pencilBtn) {
      this.pencilBtn.classList.toggle('active', state.pencilMode);
    }
    
    if (this.markerBtn) {
      this.markerBtn.classList.toggle('active', state.markerMode);
    }
    
    if (this.eraserBtn) {
      this.eraserBtn.classList.toggle('active', state.eraserMode);
    }
    
    if (this.undoBtn) {
      this.undoBtn.classList.toggle('disabled', !state.canUndo);
    }
  }

  destroy() {
    // Remove event listeners if needed
  }
}