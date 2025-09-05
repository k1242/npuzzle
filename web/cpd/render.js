// render.js - Simplified rendering engine
/* global THREE, Storage */

class RenderEngine {
  constructor(viewEl, layersEl) {
    this.viewEl = viewEl;
    this.layersEl = layersEl;

    // Three.js objects
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.tensorGroup = null;
    this.cubes = [];

    // Interaction state  
    this.dragStart = { x: 0, y: 0 };
    this.dragging = false;
    this.pinchDist = 0;

    this.init();
  }

  init() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);

    // Camera
    const aspect = this.viewEl.clientWidth / this.viewEl.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    const dist = Storage.cameraDistance || 17.3;
    this.camera.position.set(dist * 0.58, dist * 0.58, dist * 0.58);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.viewEl.clientWidth, this.viewEl.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.viewEl.appendChild(this.renderer.domElement);

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.4);
    dir1.position.set(5, 10, 5);
    this.scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.2);
    dir2.position.set(-5, -5, -5);
    this.scene.add(dir2);

    this.setupControls();
    requestAnimationFrame(() => this.animate());
  }

  setupControls() {
    const canvas = this.renderer.domElement;

    // Unified pointer handling
    const getPointer = (e) => {
      if (e.touches) {
        if (e.touches.length === 1) return { x: e.touches[0].clientX, y: e.touches[0].clientY, type: 'drag' };
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          return { dist: Math.sqrt(dx * dx + dy * dy), type: 'pinch' };
        }
        return null;
      }
      return { x: e.clientX, y: e.clientY, type: 'drag' };
    };

    // Start interaction
    const handleStart = (e) => {
      const ptr = getPointer(e);
      if (!ptr) return;
      
      if (ptr.type === 'drag') {
        this.dragging = true;
        this.dragStart = { x: ptr.x, y: ptr.y };
      } else if (ptr.type === 'pinch') {
        this.pinchDist = ptr.dist;
      }
    };

    // Move interaction
    const handleMove = (e) => {
      if (!this.tensorGroup) return;
      const ptr = getPointer(e);
      if (!ptr) return;

      if (ptr.type === 'drag' && this.dragging) {
        const dx = ptr.x - this.dragStart.x;
        const dy = ptr.y - this.dragStart.y;
        this.tensorGroup.rotation.y += dx * 0.01;
        this.tensorGroup.rotation.x += dy * 0.01;
        this.dragStart = { x: ptr.x, y: ptr.y };
      } else if (ptr.type === 'pinch' && this.pinchDist) {
        const scale = ptr.dist / this.pinchDist;
        this.camera.position.multiplyScalar(scale);
        Storage.cameraDistance = this.camera.position.length();
        this.pinchDist = ptr.dist;
      }
    };

    // End interaction
    const handleEnd = (e) => {
      if (!e.touches || e.touches.length === 0) {
        this.dragging = false;
        this.pinchDist = 0;
      }
    };

    // Wheel zoom
    const handleWheel = (e) => {
      e.preventDefault();
      const scale = e.deltaY > 0 ? 0.9 : 1.1;
      this.camera.position.multiplyScalar(scale);
      Storage.cameraDistance = this.camera.position.length();
    };

    // Attach listeners
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);
    canvas.addEventListener('touchstart', handleStart, { passive: true });
    canvas.addEventListener('touchmove', handleMove, { passive: true });
    canvas.addEventListener('touchend', handleEnd, { passive: true });
    canvas.addEventListener('wheel', handleWheel, { passive: false });
  }

  animate() {
    if (this.tensorGroup && Storage.activeLayer === -1 && Storage.autoRotate) {
      this.tensorGroup.rotation.y += 0.002;
    }
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.animate());
  }

  build(n, tensor, conflicts) {
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
          const cube = this.createCube(
            geometry, 
            tensor[i][j][k], 
            conflicts[i][j][k],
            offset + i * spacing,
            offset + j * spacing,
            offset + k * spacing,
            k
          );
          this.tensorGroup.add(cube);
          this.cubes.push(cube);
        }
      }
    }

    this.tensorGroup.rotation.set(-Math.PI / 6, Math.PI / 4, 0);
    this.scene.add(this.tensorGroup);
  }

  createCube(geometry, active, conflict, x, y, z, layer) {
    const showConflicts = Storage.showConflicts;
    const isConflict = showConflicts && conflict;
    
    const material = new THREE.MeshPhongMaterial({
      color: isConflict ? 0xff4444 : (active ? 0x6c63ff : 0xe0e0e0),
      transparent: true,
      opacity: active || isConflict ? 0.85 : 0.2,
      emissive: active || isConflict ? (isConflict ? 0xff4444 : 0x6c63ff) : 0x000000,
      emissiveIntensity: 0.1
    });

    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(x, y, z);
    cube.userData = { layer, active, conflict };

    // Add edges
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: isConflict ? 0xdd3333 : (active ? 0x5c53ef : 0xcccccc),
      transparent: true,
      opacity: 0.6
    });
    const edgeMesh = new THREE.LineSegments(edges, lineMaterial);
    cube.add(edgeMesh);

    return cube;
  }

  update(n, tensor, conflicts) {
    let idx = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < n; k++) {
          const cube = this.cubes[idx++];
          const active = !!tensor[i][j][k];
          const conflict = !!conflicts[i][j][k];
          const showConflicts = Storage.showConflicts;
          const isConflict = showConflicts && conflict;
          const activeLayer = Storage.activeLayer;

          // Update material
          cube.material.color.setHex(isConflict ? 0xff4444 : (active ? 0x6c63ff : 0xe0e0e0));
          cube.material.emissive.setHex(active || isConflict ? (isConflict ? 0xff4444 : 0x6c63ff) : 0x000000);
          
          // Update opacity based on layer
          if (activeLayer === -1) {
            cube.material.opacity = active || isConflict ? 0.85 : 0.2;
          } else {
            const isActiveLayer = k === activeLayer;
            cube.material.opacity = isActiveLayer 
              ? (active || isConflict ? 0.9 : 0.25)
              : (active || isConflict ? 0.2 : 0.04);
          }

          // Update edges
          const edge = cube.children[0];
          if (edge) {
            edge.material.color.setHex(isConflict ? 0xdd3333 : (active ? 0x5c53ef : 0xcccccc));
            edge.material.opacity = (activeLayer === -1 || k === activeLayer) ? 0.6 : 0.2;
          }

          cube.userData = { layer: k, active, conflict };
        }
      }
    }
  }

  drawLayers(n, tensor, conflicts, onClick) {
    this.layersEl.innerHTML = '';
    
    for (let k = 0; k < n; k++) {
      const wrapper = document.createElement('div');
      wrapper.className = `layer-cube ${Storage.activeLayer === k ? 'active' : ''}`;
      wrapper.onclick = () => onClick(k);

      const canvas = document.createElement('canvas');
      canvas.className = 'layer-canvas';
      canvas.width = canvas.height = 80;

      const ctx = canvas.getContext('2d');
      const cell = 80 / n;

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          ctx.fillStyle = (Storage.showConflicts && conflicts[i][j][k]) ? '#ff4444' 
                        : tensor[i][j][k] ? '#6c63ff' 
                        : '#e0e0e0';
          ctx.fillRect(i * cell, j * cell, cell - 1, cell - 1);
        }
      }

      wrapper.appendChild(canvas);
      this.layersEl.appendChild(wrapper);
    }
  }

  handleResize() {
    const width = this.viewEl.clientWidth;
    const height = this.viewEl.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}

window.RenderEngine = RenderEngine;