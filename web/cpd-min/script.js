// script.js - Main application logic
/* global THREE, TensorPNGExporter */

// 1000010000000000000000001000010000100001000000000000000000100001
// 1100000000000000220000000000000000000000000000000000000000000000
// 0000000000000000101000001010000000000000000000000000000000000000
// 0000000000000000000000000000000000000000000000220000000000000011
// 0000000000000000000000000000000000000101000001010000000000000000
// 0000000000000000000000000020001000000000000000000000000000100020
// 0000000000000000012000000000012002100000000002100000000000000000
// 0200010000000000000000000000000001000200000000000000000000000000

// Default tensor string
const DEFAULT_TENSOR_STRING = '4,4,4:1000010000000000000000001000010000100001000000000000000000100001';

let dimU = 0, dimV = 0, dimW = 0;
let tensor = null;
let tensorGroup = null;
let cubes = [];

// Lights
let ambientLight, directionalLight1, directionalLight2;

// Settings with defaults
const defaultSettings = {
  tensorString: DEFAULT_TENSOR_STRING,
  colorActive: '#6c63ff',
  colorNegative: '#ff4444',
  colorInactive: '#e0e0e0',
  opacityActive: 0.85,
  opacityNegative: 0.85,
  opacityInactive: 0.15,
  distance: 13.5,
  rotX: 0,
  rotY: -175,
  rotZ: 0,
  exportDPI: 100,
  exportFileName: 'gg-222-0',
  exportFrameSize: 80
};

let settings = { ...defaultSettings };

// Parse tensor from string with dimension support
function parseTensorString(str) {
  const clean = str.trim();
  let dimU, dimV, dimW, data;
  
  // Check if dimensions are specified (format: dimU,dimV,dimW:data)
  if (clean.includes(':')) {
    const [dims, values] = clean.split(':');
    const dimParts = dims.split(',').map(d => parseInt(d.trim()));
    if (dimParts.length === 3 && dimParts.every(d => d > 0)) {
      [dimU, dimV, dimW] = dimParts;
      data = values.replace(/[^012]/g, '');
    } else {
      throw new Error('Invalid dimension format. Use: dimU,dimV,dimW:values');
    }
  } else {
    // Try to parse as cube
    data = clean.replace(/[^012]/g, '');
    const cubeRoot = Math.round(Math.pow(data.length, 1/3));
    if (cubeRoot ** 3 === data.length) {
      dimU = dimV = dimW = cubeRoot;
    } else {
      throw new Error(`Invalid tensor size: ${data.length} is not a perfect cube. Use format: dimU,dimV,dimW:values`);
    }
  }
  
  if (data.length !== dimU * dimV * dimW) {
    throw new Error(`Data length ${data.length} doesn't match dimensions ${dimU}×${dimV}×${dimW} (expected ${dimU * dimV * dimW})`);
  }
  
  const result = [];
  let idx = 0;
  
  for (let i = 0; i < dimU; i++) {
    result[i] = [];
    for (let j = 0; j < dimV; j++) {
      result[i][j] = [];
      for (let k = 0; k < dimW; k++) {
        const val = parseInt(data[idx++]);
        result[i][j][k] = val === 2 ? -1 : val;
      }
    }
  }
  
  return { tensor: result, dimU, dimV, dimW };
}

// Convert tensor to string
function tensorToString() {
  let str = `${dimU},${dimV},${dimW}:`;
  for (let i = 0; i < dimU; i++) {
    for (let j = 0; j < dimV; j++) {
      for (let k = 0; k < dimW; k++) {
        const val = tensor[i][j][k];
        str += val === -1 ? '2' : val.toString();
      }
    }
  }
  return str;
}

// Three.js setup
const viewEl = document.getElementById('view3d');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f5f5);

const aspect = viewEl.clientWidth / viewEl.clientHeight;
const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
renderer.setSize(viewEl.clientWidth, viewEl.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
viewEl.appendChild(renderer.domElement);

// Lights
ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.4);
directionalLight1.position.set(5, 10, 5);
scene.add(directionalLight1);
directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight2.position.set(-5, -5, -5);
scene.add(directionalLight2);

// Update camera position
function updateCamera() {
  const d = settings.distance;
  camera.position.set(d * 0.58, d * 0.58, d * 0.58);
  camera.lookAt(0, 0, 0);
}

// Convert hex string to number
function hexToNum(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

// Build 3D visualization
function buildVisualization() {
  if (tensorGroup) {
    scene.remove(tensorGroup);
  }
  
  tensorGroup = new THREE.Group();
  cubes = [];
  
  const spacing = 1.2;
  const offsetU = -(dimU - 1) * spacing / 2;
  const offsetV = -(dimV - 1) * spacing / 2;
  const offsetW = -(dimW - 1) * spacing / 2;
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  
  for (let i = 0; i < dimU; i++) {
    for (let j = 0; j < dimV; j++) {
      for (let k = 0; k < dimW; k++) {
        const val = tensor[i][j][k];
        const cube = createCube(
          geometry, val,
          offsetU + i * spacing,
          offsetV + j * spacing,
          offsetW + k * spacing
        );
        tensorGroup.add(cube);
        cubes.push({mesh: cube, value: val});
      }
    }
  }
  
  const rotX = settings.rotX * Math.PI / 180;
  const rotY = settings.rotY * Math.PI / 180;
  const rotZ = settings.rotZ * Math.PI / 180;
  tensorGroup.rotation.set(rotX, rotY, rotZ);
  tensorGroup.updateMatrixWorld(true);
  scene.add(tensorGroup);
}

// Create single cube
function createCube(geometry, value, x, y, z) {
  let color, opacity;
  
  if (value === 1) {
    color = hexToNum(settings.colorActive);
    opacity = settings.opacityActive;
  } else if (value === -1) {
    color = hexToNum(settings.colorNegative);
    opacity = settings.opacityNegative;
  } else {
    color = hexToNum(settings.colorInactive);
    opacity = settings.opacityInactive;
  }
  
  const material = new THREE.MeshPhongMaterial({
    color,
    transparent: true,
    opacity,
    emissive: value !== 0 ? color : 0x000000,
    emissiveIntensity: 0.1
  });
  
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(x, y, z);
  
  // Add edges
  const edges = new THREE.EdgesGeometry(geometry);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: value !== 0 ? color : 0xcccccc,
    transparent: true,
    opacity: 0.6
  });
  const edgeMesh = new THREE.LineSegments(edges, lineMaterial);
  cube.add(edgeMesh);
  
  return cube;
}

// Update cube colors and opacity
function updateCubes() {
  cubes.forEach(({mesh, value}) => {
    let color, opacity;
    
    if (value === 1) {
      color = hexToNum(settings.colorActive);
      opacity = settings.opacityActive;
    } else if (value === -1) {
      color = hexToNum(settings.colorNegative);
      opacity = settings.opacityNegative;
    } else {
      color = hexToNum(settings.colorInactive);
      opacity = settings.opacityInactive;
    }
    
    mesh.material.color.setHex(color);
    mesh.material.opacity = opacity;
    mesh.material.emissive.setHex(value !== 0 ? color : 0x000000);
    
    const edge = mesh.children[0];
    if (edge) {
      edge.material.color.setHex(value !== 0 ? color : 0xcccccc);
    }
  });
}

// Update export frame display (always square)
function updateExportFrame() {
  const frame = document.getElementById('exportFrame');
  const viewWidth = viewEl.clientWidth;
  const viewHeight = viewEl.clientHeight;
  const minDim = Math.min(viewWidth, viewHeight);
  const sizePx = minDim * (settings.exportFrameSize / 100);
  
  frame.style.width = sizePx + 'px';
  frame.style.height = sizePx + 'px';
}

// Export to PNG
function exportPNG() {
  const frameSize = settings.exportFrameSize / 100;
  const exporter = new TensorPNGExporter(renderer, scene, camera, settings.exportDPI, frameSize);
  const dataURL = exporter.export();
  
  // Download PNG
  const a = document.createElement('a');
  a.href = dataURL;
  const fileName = settings.exportFileName.replace(/\.png$/i, '');
  a.download = `${fileName}.png`;
  a.click();
}

// Mouse controls
let dragging = false;
let dragStart = {x: 0, y: 0};

renderer.domElement.addEventListener('mousedown', (e) => {
  dragging = true;
  dragStart = {x: e.clientX, y: e.clientY};
});

renderer.domElement.addEventListener('mousemove', (e) => {
  if (!dragging || !tensorGroup) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  tensorGroup.rotation.y += dx * 0.01;
  tensorGroup.rotation.x += dy * 0.01;
  settings.rotX = Math.round(tensorGroup.rotation.x * 180 / Math.PI);
  settings.rotY = Math.round(tensorGroup.rotation.y * 180 / Math.PI);
  updateRotationDisplays();
  dragStart = {x: e.clientX, y: e.clientY};
});

renderer.domElement.addEventListener('mouseup', () => {
  dragging = false;
});

renderer.domElement.addEventListener('mouseleave', () => {
  dragging = false;
});

// Wheel zoom and frame resize
renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  if (e.ctrlKey) {
    // Resize export frame
    const delta = e.deltaY > 0 ? -5 : 5;
    settings.exportFrameSize = Math.max(20, Math.min(100, settings.exportFrameSize + delta));
    document.getElementById('exportFrameSize').value = settings.exportFrameSize;
    document.getElementById('exportFrameSizeVal').textContent = settings.exportFrameSize + '%';
    updateExportFrame();
  } else {
    // Zoom camera
    const scale = e.deltaY > 0 ? 0.9 : 1.1;
    settings.distance *= scale;
    settings.distance = Math.max(5, Math.min(50, settings.distance));
    updateCamera();
    document.getElementById('distance').value = settings.distance;
    document.getElementById('distanceVal').textContent = settings.distance.toFixed(1);
  }
}, {passive: false});

// UI controls
document.getElementById('colorActive').addEventListener('input', (e) => {
  settings.colorActive = e.target.value;
  updateCubes();
});

document.getElementById('colorNegative').addEventListener('input', (e) => {
  settings.colorNegative = e.target.value;
  updateCubes();
});

document.getElementById('colorInactive').addEventListener('input', (e) => {
  settings.colorInactive = e.target.value;
  updateCubes();
});

document.getElementById('opacityActive').addEventListener('input', (e) => {
  settings.opacityActive = parseFloat(e.target.value);
  document.getElementById('opacityActiveVal').textContent = settings.opacityActive.toFixed(2);
  updateCubes();
});

document.getElementById('opacityNegative').addEventListener('input', (e) => {
  settings.opacityNegative = parseFloat(e.target.value);
  document.getElementById('opacityNegativeVal').textContent = settings.opacityNegative.toFixed(2);
  updateCubes();
});

document.getElementById('opacityInactive').addEventListener('input', (e) => {
  settings.opacityInactive = parseFloat(e.target.value);
  document.getElementById('opacityInactiveVal').textContent = settings.opacityInactive.toFixed(2);
  updateCubes();
});

document.getElementById('distance').addEventListener('input', (e) => {
  settings.distance = parseFloat(e.target.value);
  document.getElementById('distanceVal').textContent = settings.distance.toFixed(1);
  updateCamera();
});

document.getElementById('rotX').addEventListener('input', (e) => {
  settings.rotX = parseFloat(e.target.value);
  document.getElementById('rotXVal').textContent = settings.rotX + '°';
  if (tensorGroup) tensorGroup.rotation.x = settings.rotX * Math.PI / 180;
});

document.getElementById('rotY').addEventListener('input', (e) => {
  settings.rotY = parseFloat(e.target.value);
  document.getElementById('rotYVal').textContent = settings.rotY + '°';
  if (tensorGroup) tensorGroup.rotation.y = settings.rotY * Math.PI / 180;
});

document.getElementById('rotZ').addEventListener('input', (e) => {
  settings.rotZ = parseFloat(e.target.value);
  document.getElementById('rotZVal').textContent = settings.rotZ + '°';
  if (tensorGroup) tensorGroup.rotation.z = settings.rotZ * Math.PI / 180;
});

document.getElementById('exportDPI').addEventListener('input', (e) => {
  settings.exportDPI = parseInt(e.target.value) || 300;
});

document.getElementById('exportFileName').addEventListener('input', (e) => {
  settings.exportFileName = e.target.value || 'tensor_export';
});

document.getElementById('exportFrameSize').addEventListener('input', (e) => {
  settings.exportFrameSize = parseFloat(e.target.value);
  document.getElementById('exportFrameSizeVal').textContent = settings.exportFrameSize + '%';
  updateExportFrame();
});

document.getElementById('resetCamera').addEventListener('click', () => {
  settings.distance = defaultSettings.distance;
  settings.rotX = defaultSettings.rotX;
  settings.rotY = defaultSettings.rotY;
  settings.rotZ = defaultSettings.rotZ;
  
  document.getElementById('distance').value = settings.distance;
  document.getElementById('distanceVal').textContent = settings.distance.toFixed(1);
  updateCamera();
  updateRotationDisplays();
  
  if (tensorGroup) {
    tensorGroup.rotation.set(
      settings.rotX * Math.PI / 180,
      settings.rotY * Math.PI / 180,
      settings.rotZ * Math.PI / 180
    );
  }
});

document.getElementById('applyTensor').addEventListener('click', () => {
  const input = document.getElementById('tensorInput').value.trim();
  if (!input) return;
  
  try {
    const result = parseTensorString(input);
    tensor = result.tensor;
    dimU = result.dimU;
    dimV = result.dimV;
    dimW = result.dimW;
    settings.tensorString = tensorToString();
    document.getElementById('tensorSize').textContent = `${dimU}×${dimV}×${dimW}`;
    buildVisualization();
  } catch (e) {
    alert('Error: ' + e.message);
  }
});

document.getElementById('resetTensor').addEventListener('click', () => {
  settings.tensorString = DEFAULT_TENSOR_STRING;
  document.getElementById('tensorInput').value = settings.tensorString;
  const result = parseTensorString(settings.tensorString);
  tensor = result.tensor;
  dimU = result.dimU;
  dimV = result.dimV;
  dimW = result.dimW;
  document.getElementById('tensorSize').textContent = `${dimU}×${dimV}×${dimW}`;
  buildVisualization();
});

document.getElementById('exportPNG').addEventListener('click', exportPNG);

function updateRotationDisplays() {
  document.getElementById('rotX').value = settings.rotX;
  document.getElementById('rotXVal').textContent = settings.rotX + '°';
  document.getElementById('rotY').value = settings.rotY;
  document.getElementById('rotYVal').textContent = settings.rotY + '°';
  document.getElementById('rotZ').value = settings.rotZ;
  document.getElementById('rotZVal').textContent = settings.rotZ + '°';
}

// Apply settings to UI
function applySettingsToUI() {
  document.getElementById('tensorInput').value = settings.tensorString;
  document.getElementById('colorActive').value = settings.colorActive;
  document.getElementById('colorNegative').value = settings.colorNegative;
  document.getElementById('colorInactive').value = settings.colorInactive;
  
  document.getElementById('opacityActive').value = settings.opacityActive;
  document.getElementById('opacityActiveVal').textContent = settings.opacityActive.toFixed(2);
  document.getElementById('opacityNegative').value = settings.opacityNegative;
  document.getElementById('opacityNegativeVal').textContent = settings.opacityNegative.toFixed(2);
  document.getElementById('opacityInactive').value = settings.opacityInactive;
  document.getElementById('opacityInactiveVal').textContent = settings.opacityInactive.toFixed(2);
  
  document.getElementById('distance').value = settings.distance;
  document.getElementById('distanceVal').textContent = settings.distance.toFixed(1);
  
  document.getElementById('exportDPI').value = settings.exportDPI;
  document.getElementById('exportFileName').value = settings.exportFileName;
  document.getElementById('exportFrameSize').value = settings.exportFrameSize;
  document.getElementById('exportFrameSizeVal').textContent = settings.exportFrameSize + '%';
  
  updateRotationDisplays();
  updateExportFrame();
}

// Animate
function animate() {
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = viewEl.clientWidth / viewEl.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewEl.clientWidth, viewEl.clientHeight);
  updateExportFrame();
});

// Initialize
applySettingsToUI();

const result = parseTensorString(settings.tensorString);
tensor = result.tensor;
dimU = result.dimU;
dimV = result.dimV;
dimW = result.dimW;
document.getElementById('tensorSize').textContent = `${dimU}×${dimV}×${dimW}`;

updateCamera();
buildVisualization();
animate();