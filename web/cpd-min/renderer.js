// renderer.js - PNG export functionality
/* global THREE */

class TensorPNGExporter {
  constructor(renderer, scene, camera, dpi, frameSize = 1.0) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.dpi = dpi;
    this.frameSize = frameSize;
  }
  
  export() {
    const originalBg = this.scene.background;
    const originalSize = this.renderer.getSize(new THREE.Vector2());
    const originalPixelRatio = this.renderer.getPixelRatio();
    const originalAspect = this.camera.aspect;
    
    // Calculate size based on DPI (assuming 96 base DPI)
    const scale = this.dpi / 96;
    const baseSize = Math.min(originalSize.x, originalSize.y) * this.frameSize;
    const size = Math.floor(baseSize * scale);
    
    // Set transparent background
    this.scene.background = null;
    
    // Set square aspect ratio for export
    this.camera.aspect = 1.0;
    this.camera.updateProjectionMatrix();
    
    // Temporarily render to square canvas
    this.renderer.setSize(size, size);
    this.renderer.setPixelRatio(1);
    
    // Render
    this.renderer.render(this.scene, this.camera);
    
    // Get PNG data
    const dataURL = this.renderer.domElement.toDataURL('image/png');
    
    // Restore original settings
    this.scene.background = originalBg;
    this.camera.aspect = originalAspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(originalSize.x, originalSize.y);
    this.renderer.setPixelRatio(originalPixelRatio);
    
    // Re-render with original settings
    this.renderer.render(this.scene, this.camera);
    
    return dataURL;
  }
}

window.TensorPNGExporter = TensorPNGExporter;