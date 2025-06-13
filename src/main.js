import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let model;
let edgesArray = [];

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff); // witte achtergrond

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 150, 300);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Licht
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  hemiLight.position.set(0, 200, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(0, 200, 100);
  scene.add(dirLight);

  loadModel();

  window.addEventListener('resize', onWindowResize);

  animate();
}

function loadModel() {
  const loader = new GLTFLoader();

  loader.load('/models/box/box.glb', (gltf) => {
    if (model) {
      scene.remove(model);
      edgesArray.forEach(e => e.parent.remove(e));
      edgesArray = [];
    }

    model = gltf.scene;
    scene.add(model);

    // Bepaal bounding box en pas camera en controls aan
const box = new THREE.Box3().setFromObject(model);
const size = box.getSize(new THREE.Vector3());
const center = box.getCenter(new THREE.Vector3());

// Verplaats model naar (0, 0, 0) op basis van zijn center
model.position.sub(center);

// Pas camera-afstand aan op basis van grootte
const maxDim = Math.max(size.x, size.y, size.z);
const fov = camera.fov * (Math.PI / 180);
let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;

// Limiteer hoe dichtbij of ver de camera komt
camera.position.set(0, maxDim * 0.6, cameraZ);
camera.lookAt(0, 0, 0);
controls.target.set(0, 0, 0);
controls.update();


    // Voeg edges per mesh toe als kinderen van de mesh
    model.traverse((child) => {
      if (child.isMesh) {
        const edgesGeometry = new THREE.EdgesGeometry(child.geometry);
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const meshEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

        // Voeg edges als kind toe, zodat ze dezelfde transformaties volgen
        child.add(meshEdges);
        edgesArray.push(meshEdges);

        // Optioneel: edges wat dikker zichtbaar maken via linewidth, let op dat niet in alle browsers werkt
      }
    });

    // parameters laden en UI maken
    fetch('/models/box/box_params.json')
      .then(res => res.json())
      .then(params => {
        if (!params.kleur) params.kleur = '#00aaff';
        createInputs(params);
        updateModel(params);
        updateColor(params.kleur);
      })
      .catch(err => console.error('Fout bij laden params:', err));
  });
}

function updateModel(params) {
  if (!model) return;
  // schaalmodel: lengte = z, breedte = x, hoogte = y (of zoals in jouw model)
  model.scale.set(params.breedte / 100, params.Hoogte / 100, params.Lengte / 100);
}

function updateColor(color) {
  if (!model) return;
  model.traverse((child) => {
    if (child.isMesh) {
      if (child.material) {
        child.material.color.set(color);
        child.material.needsUpdate = true;
      }
    }
  });
}

// UI met invulvelden voor params en kleur
function createInputs(params) {
  const container = document.getElementById('inputs');
  container.innerHTML = '';

  for (const key in params) {
    if (key === 'kleur') {
      // kleur input
      const label = document.createElement('label');
      label.textContent = key + ': ';
      const input = document.createElement('input');
      input.type = 'color';
      input.value = params[key];
      input.oninput = (e) => {
        updateColor(e.target.value);
      };
      label.appendChild(input);
      container.appendChild(label);
      container.appendChild(document.createElement('br'));
    } else {
      // numerieke input
      const label = document.createElement('label');
      label.textContent = key + ': ';
      const input = document.createElement('input');
      input.type = 'number';
      input.value = params[key];
      input.oninput = (e) => {
        params[key] = parseFloat(e.target.value);
        updateModel(params);
      };
      label.appendChild(input);
      container.appendChild(label);
      container.appendChild(document.createElement('br'));
    }
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);
}
