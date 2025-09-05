// render.js

/* global THREE */
/* RenderEngine: everything related to visualization (3D scene and layer thumbnails) */
(function (global) {
  'use strict';

  /**
   * RenderEngine encapsulates:
   * - Three.js scene (setup, lights, camera, animation loop)
   * - Building and updating tensor cubes
   * - Drawing 2D layer previews (w-dimension slices)
   */
  class RenderEngine {
    /**
     * @param {HTMLElement} viewContainer - container for 3D renderer
     * @param {HTMLElement} layersContainer - container for 2D layer thumbnails
     */
    constructor(viewContainer, layersContainer) {
      this.viewContainer = viewContainer;
      this.layersContainer = layersContainer;

      // Three.js core
      this.scene = null;
      this.camera = null;
      this.renderer = null;

      // Tensor mesh management
      this.tensorGroup = null;
      this.cubes = [];

      // Interaction
      this.mouseDown = false;
      this.mouseX = 0;
      this.mouseY = 0;
      this.autoRotate = true;

      // Cached flags to adjust materials
      this.activeLayer = -1;
      this.showConflicts = false;

      // Animation loop bound function
      this._animate = this._animate.bind(this);
    }

    /** Initialize Three.js scene and begin animation loop */
    init() {
      // Scene and background
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xf5f5f5);

      // Camera
      const width = this.viewContainer.clientWidth;
      const height = this.viewContainer.clientHeight;
      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      this.camera.position.set(10, 10, 10);
      this.camera.lookAt(0, 0, 0);

      // Renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.viewContainer.appendChild(this.renderer.domElement);

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambientLight);

      const dir1 = new THREE.DirectionalLight(0xffffff, 0.4);
      dir1.position.set(5, 10, 5);
      this.scene.add(dir1);

      const dir2 = new THREE.DirectionalLight(0xffffff, 0.2);
      dir2.position.set(-5, -5, -5);
      this.scene.add(dir2);

      // Mouse controls (simple drag rotate + wheel zoom)
      this._setupControls();

      // Start render loop
      requestAnimationFrame(this._animate);
    }

    /** Private: setup basic mouse controls without external libs */
    _setupControls() {
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
      }, { passive: false });
    }

    /** Private: render loop */
    _animate() {
      if (this.tensorGroup && this.activeLayer === -1 && this.autoRotate) {
        this.tensorGroup.rotation.y += 0.002;
      }
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(this._animate);
    }

    /**
     * Build tensor visualization from scratch (called when size changes).
     * @param {number} n
     * @param {number[][][]} tensor
     * @param {number[][][]} conflicts
     */
    build(n, tensor, conflicts) {
      // Remove previous group if any
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
            const active = !!tensor[i][j][k];
            const conflict = !!conflicts[i][j][k];

            // Determine initial colors
            let color, emissive;
            if (this.showConflicts && conflict) {
              color = 0xff4444;
              emissive = 0xff4444;
            } else if (active) {
              color = 0x6c63ff;
              emissive = 0x6c63ff;
            } else {
              color = 0xe0e0e0;
              emissive = 0x000000;
            }

            const material = new THREE.MeshPhongMaterial({
              color,
              transparent: true,
              opacity: (active || (this.showConflicts && conflict)) ? 0.85 : 0.2,
              emissive,
              emissiveIntensity: 0.1
            });

            const cube = new THREE.Mesh(geometry, material);
            cube.position.set(
              offset + i * spacing,
              offset + j * spacing,
              offset + k * spacing
            );
            cube.userData = { i, j, k, active, conflict };

            // Edge lines
            const edges = new THREE.EdgesGeometry(geometry);
            const edgeColor = (this.showConflicts && conflict) ? 0xdd3333 :
              (active ? 0x5c53ef : 0xcccccc);
            const lineMaterial = new THREE.LineBasicMaterial({
              color: edgeColor,
              transparent: true,
              opacity: 0.6
            });
            const edgeMesh = new THREE.LineSegments(edges, lineMaterial);
            cube.add(edgeMesh);

            this.tensorGroup.add(cube);
            this.cubes.push(cube);
          }
        }
      }

      // Pleasant isometric-ish start
      this.tensorGroup.rotation.x = -Math.PI / 6;
      this.tensorGroup.rotation.y = Math.PI / 4;

      this.scene.add(this.tensorGroup);
    }

    /**
     * Update colors/opacities without rebuilding meshes (called when vector bits change).
     * @param {number} n
     * @param {number[][][]} tensor
     * @param {number[][][]} conflicts
     */
    update(n, tensor, conflicts) {
      let idx = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          for (let k = 0; k < n; k++) {
            const cube = this.cubes[idx++];
            const active = !!tensor[i][j][k];
            const conflict = !!conflicts[i][j][k];

            // Colors
            let color, emissive;
            if (this.showConflicts && conflict) {
              color = 0xff4444;
              emissive = 0xff4444;
            } else if (active) {
              color = 0x6c63ff;
              emissive = 0x6c63ff;
            } else {
              color = 0xe0e0e0;
              emissive = 0x000000;
            }
            cube.material.color.setHex(color);
            cube.material.emissive.setHex(emissive);

            // Opacity layer-dependent
            if (this.activeLayer === -1) {
              cube.material.opacity = (active || (this.showConflicts && conflict)) ? 0.85 : 0.2;
            } else {
              if (k === this.activeLayer) {
                cube.material.opacity = (active || (this.showConflicts && conflict)) ? 0.9 : 0.25;
              } else {
                cube.material.opacity = (active || (this.showConflicts && conflict)) ? 0.4 : 0.08;
              }
            }

            // Edge styling
            const edgeMesh = cube.children[0];
            if (edgeMesh) {
              const edgeColor = (this.showConflicts && conflict) ? 0xdd3333 :
                (active ? 0x5c53ef : 0xcccccc);
              edgeMesh.material.color.setHex(edgeColor);
              edgeMesh.material.opacity = this.activeLayer === -1 || k === this.activeLayer ? 0.6 : 0.2;
            }
          }
        }
      }
    }

    /**
     * Draw 2D previews for each w-layer.
     * This recreates the DOM content of layers container.
     * @param {number} n
     * @param {number[][][]} tensor
     * @param {number[][][]} conflicts
     * @param {(k:number)=>void} onLayerClick
     */
    drawLayers(n, tensor, conflicts, onLayerClick) {
      this.layersContainer.innerHTML = '';
      for (let k = 0; k < n; k++) {
        const wrapper = document.createElement('div');
        wrapper.className = `layer-cube ${this.activeLayer === k ? 'active' : ''}`;
        wrapper.addEventListener('click', () => {
          // Toggle selection
          const newActive = (this.activeLayer === k) ? -1 : k;
          if (typeof onLayerClick === 'function') onLayerClick(newActive);
        });

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
            // Slight gap to show grid
            ctx.fillRect(i * cell, j * cell, cell - 1, cell - 1);
          }
        }

        wrapper.appendChild(canvas);
        this.layersContainer.appendChild(wrapper);
      }
    }

    /** Update auto-rotation flag */
    setAutoRotate(flag) { this.autoRotate = !!flag; }

    /** Update active layer (k or -1) */
    setActiveLayer(k) { this.activeLayer = k; }

    /** Update showConflicts flag */
    setShowConflicts(flag) { this.showConflicts = !!flag; }

    /** Handle container resize */
    handleResize() {
      const width = this.viewContainer.clientWidth;
      const height = this.viewContainer.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  // Expose to global scope
  global.RenderEngine = RenderEngine;

})(window);
