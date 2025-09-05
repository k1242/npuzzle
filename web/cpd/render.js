// render.js - Refactored rendering engine
// Clean architecture for 3D visualization and layer thumbnails

/* global THREE */

class RenderEngine {
  constructor(viewContainer, layersContainer) {
    this.viewContainer = viewContainer;
    this.layersContainer = layersContainer;

    // Three.js core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.tensorGroup = null;
    this.cubes = [];

    // Interaction state
    this.mouseDown = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.initialDistance = 0;

    // Visualization settings
    this.autoRotate = true;
    this.activeLayer = -1;
    this.showConflicts = false;

    // Bind animation loop
    this._animate = this._animate.bind(this);
  }

  // -------------------------- Initialization --------------------------

  init() {
    this._initScene();
    this._initLights();
    this._initControls();
    requestAnimationFrame(this._animate);
  }

  _initScene() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);

    // Camera setup
    const width = this.viewContainer.clientWidth;
    const height = this.viewContainer.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.viewContainer.appendChild(this.renderer.domElement);
  }

  _initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dir1 = new THREE.DirectionalLight(0xffffff, 0.4);
    dir1.position.set(5, 10, 5);
    this.scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0xffffff, 0.2);
    dir2.position.set(-5, -5, -5);
    this.scene.add(dir2);
  }

  _initControls() {
    this._initMouseControls();
    this._initTouchControls();
  }

  _initMouseControls() {
    this.viewContainer.addEventListener('mousedown', (e) => {
      this.mouseDown = true;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    this.viewContainer.addEventListener('mousemove', (e) => {
      if (!this.mouseDown || !this.tensorGroup) return;
      const dx = e.clientX - this.mouseX;
      const dy = e.clientY - this.mouseY;
      this.tensorGroup.rotation.y += dx * 0.01;
      this.tensorGroup.rotation.x += dy * 0.01;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    const endDrag = () => { this.mouseDown = false; };
    this.viewContainer.addEventListener('mouseup', endDrag);
    this.viewContainer.addEventListener('mouseleave', endDrag);

    this.viewContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const scale = e.deltaY > 0 ? 0.9 : 1.1;
      this.camera.position.multiplyScalar(scale);

      if (window.Storage) {
        window.Storage.set('cameraPosition', this.getCameraPosition());
      }
    }, { passive: false });
  }

  _initTouchControls() {
    this.viewContainer.addEventListener('touchstart', (e) => {
      e.preventDefault();
      
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.initialDistance = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: false });

    this.viewContainer.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.tensorGroup) return;

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - this.touchStartX;
        const dy = touch.clientY - this.touchStartY;
        
        this.tensorGroup.rotation.y += dx * 0.01;
        this.tensorGroup.rotation.x += dy * 0.01;
        
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
      } else if (e.touches.length === 2 && this.initialDistance > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        
        const scale = currentDistance / this.initialDistance;
        this.camera.position.multiplyScalar(scale);
        this.initialDistance = currentDistance;

        if (window.Storage) {
          window.Storage.set('cameraPosition', this.getCameraPosition());
        }
      }
    }, { passive: false });

    this.viewContainer.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        this.initialDistance = 0;
      }
    }, { passive: false });
  }

  // -------------------------- Animation Loop --------------------------

  _animate() {
    if (this.tensorGroup && this.activeLayer === -1 && this.autoRotate) {
      this.tensorGroup.rotation.y += 0.002;
    }
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._animate);
  }

  // -------------------------- Tensor Building --------------------------

  build(n, tensor, conflicts) {
    // Remove previous group
    if (this.tensorGroup) {
      this.scene.remove(this.tensorGroup);
    }
    
    this.tensorGroup = new THREE.Group();
    this.cubes = [];

    const spacing = 1.2;
    const offset = -(n - 1) * spacing / 2;
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < n; k++) {
          const cube = this._createCube(
            geometry,
            tensor[i][j][k],
            conflicts[i][j][k],
            offset + i * spacing,
            offset + j * spacing,
            offset + k * spacing
          );
          
          cube.userData = { i, j, k, active: tensor[i][j][k], conflict: conflicts[i][j][k] };
          this.tensorGroup.add(cube);
          this.cubes.push(cube);
        }
      }
    }

    // Set initial rotation
    this.tensorGroup.rotation.x = -Math.PI / 6;
    this.tensorGroup.rotation.y = Math.PI / 4;

    this.scene.add(this.tensorGroup);
  }

  _createCube(geometry, active, conflict, x, y, z) {
    const { color, emissive, opacity, edgeColor } = this._getCubeStyle(active, conflict);

    const material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity,
      emissive,
      emissiveIntensity: 0.1
    });

    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(x, y, z);

    // Add edges
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: 0.6
    });
    const edgeMesh = new THREE.LineSegments(edges, lineMaterial);
    cube.add(edgeMesh);

    return cube;
  }

  _getCubeStyle(active, conflict) {
    if (this.showConflicts && conflict) {
      return {
        color: 0xff4444,
        emissive: 0xff4444,
        opacity: 0.85,
        edgeColor: 0xdd3333
      };
    } else if (active) {
      return {
        color: 0x6c63ff,
        emissive: 0x6c63ff,
        opacity: 0.85,
        edgeColor: 0x5c53ef
      };
    } else {
      return {
        color: 0xe0e0e0,
        emissive: 0x000000,
        opacity: 0.2,
        edgeColor: 0xcccccc
      };
    }
  }

  // -------------------------- Tensor Update --------------------------

  update(n, tensor, conflicts) {
    let idx = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < n; k++) {
          const cube = this.cubes[idx++];
          const active = !!tensor[i][j][k];
          const conflict = !!conflicts[i][j][k];

          this._updateCube(cube, active, conflict, k);
        }
      }
    }
  }

  _updateCube(cube, active, conflict, layerK) {
    const { color, emissive, opacity, edgeColor } = this._getCubeStyle(active, conflict);
    
    cube.material.color.setHex(color);
    cube.material.emissive.setHex(emissive);

    // Adjust opacity based on active layer
    if (this.activeLayer === -1) {
      cube.material.opacity = opacity;
    } else {
      cube.material.opacity = (layerK === this.activeLayer) 
        ? (active || (this.showConflicts && conflict) ? 0.9 : 0.25)
        : (active || (this.showConflicts && conflict) ? 0.2 : 0.04);
    }

    // Update edge styling
    const edgeMesh = cube.children[0];
    if (edgeMesh) {
      edgeMesh.material.color.setHex(edgeColor);
      edgeMesh.material.opacity = (this.activeLayer === -1 || layerK === this.activeLayer) ? 0.6 : 0.2;
    }
  }

  // -------------------------- Layer Thumbnails --------------------------

  drawLayers(n, tensor, conflicts, onLayerClick) {
    this.layersContainer.innerHTML = '';
    
    for (let k = 0; k < n; k++) {
      const wrapper = this._createLayerThumbnail(n, tensor, conflicts, k);
      
      wrapper.addEventListener('click', () => {
        const newActive = (this.activeLayer === k) ? -1 : k;
        if (onLayerClick) onLayerClick(newActive);
      });
      
      this.layersContainer.appendChild(wrapper);
    }
  }

  _createLayerThumbnail(n, tensor, conflicts, k) {
    const wrapper = document.createElement('div');
    wrapper.className = `layer-cube ${this.activeLayer === k ? 'active' : ''}`;

    const canvas = document.createElement('canvas');
    canvas.className = 'layer-canvas';
    canvas.width = 80;
    canvas.height = 80;

    const ctx = canvas.getContext('2d');
    const cell = 80 / n;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (this.showConflicts && conflicts[i][j][k]) {
          ctx.fillStyle = '#ff4444';
        } else if (tensor[i][j][k]) {
          ctx.fillStyle = '#6c63ff';
        } else {
          ctx.fillStyle = '#e0e0e0';
        }
        ctx.fillRect(i * cell, j * cell, cell - 1, cell - 1);
      }
    }

    wrapper.appendChild(canvas);
    return wrapper;
  }

  // -------------------------- Settings --------------------------

  setAutoRotate(flag) { 
    this.autoRotate = !!flag; 
  }

  setActiveLayer(k) { 
    this.activeLayer = k; 
  }

  setShowConflicts(flag) { 
    this.showConflicts = !!flag; 
  }

  handleResize() {
    const width = this.viewContainer.clientWidth;
    const height = this.viewContainer.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  getCameraPosition() {
    return {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    };
  }

  setCameraPosition(pos) {
    if (pos && pos.x && pos.y && pos.z) {
      this.camera.position.set(pos.x, pos.y, pos.z);
    }
  }
}

// Export to global scope
window.RenderEngine = RenderEngine;