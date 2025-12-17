import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  GridHelper,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const container = document.getElementById("canvas-container");
const scene = new Scene();
scene.background = new Color("#0b1224");

const camera = new PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.position.set(0, 220, 520);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 80, 0);
controls.enableDamping = true;

const ambient = new AmbientLight(0xcad4e0, 0.6);
scene.add(ambient);

const directional = new DirectionalLight(0xffffff, 1.1);
directional.position.set(300, 500, 400);
directional.castShadow = true;
directional.shadow.mapSize.set(2048, 2048);
scene.add(directional);

const grid = new GridHelper(1000, 20, 0x3b82f6, 0x1f2937);
scene.add(grid);

const loader = new FBXLoader();
const selectableMeshes = [];
const raycaster = new Raycaster();
const pointer = new Vector2(1, 1);
let hoveredMesh = null;

function placeModel(object, offsetX, offsetZ) {
  // Rotate 90° around the Y-axis to orient the equipment correctly
  object.rotation.set(0, Math.PI / 2, 0);

  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      selectableMeshes.push(child);

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      child.userData.materialStates = materials.map((material) => {
        if (!material) return null;
        return {
          material,
          color: material.color?.clone?.(),
          emissive: material.emissive?.clone?.(),
          emissiveIntensity: material.emissiveIntensity
        };
      });
    }
  });

  const box = new Box3().setFromObject(object);
  const size = new Vector3();
  box.getSize(size);

  const targetSize = 260;
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = maxDim > 0 ? targetSize / maxDim : 1;
  object.scale.setScalar(scale);

  const centeredBox = new Box3().setFromObject(object);
  const center = new Vector3();
  centeredBox.getCenter(center);
  object.position.sub(center);

  const groundedBox = new Box3().setFromObject(object);
  const minY = groundedBox.min.y;
  object.position.y -= minY;
  object.position.x += offsetX;
  object.position.z += offsetZ;

  scene.add(object);
}

function loadFBX(path, offsetX, offsetZ) {
  loader.load(
    path,
    (object) => {
      placeModel(object, offsetX, offsetZ);
    },
    undefined,
    (error) => {
      console.error(`Failed to load ${path}:`, error);
    }
  );
}

const fbxModels = [
  "ContactAngleMeter_01.fbx",
  "CoordinateMeasuringMachine_01.fbx",
  "Evaporator_01.fbx",
  "ForcedConvectionOven_01.fbx",
  "OpticalMicroscope_01.fbx",
  "ThinFilmDepositionSystem_01.fbx",
  "ThinFilmDepositionSystem_02.fbx",
  "UltravioletCleaner_01.fbx"
];

const columnCount = 3;
const spacingX = 360;
const spacingZ = 340;
const rowCount = Math.ceil(fbxModels.length / columnCount);
const modelRootPath = "./3D_model/FAB/";

fbxModels.forEach((fileName, index) => {
  const row = Math.floor(index / columnCount);
  const column = index % columnCount;

  const offsetX = (column - (columnCount - 1) / 2) * spacingX;
  const offsetZ = (row - (rowCount - 1) / 2) * spacingZ;

  loadFBX(`${modelRootPath}${fileName}`, offsetX, offsetZ);
});

const modelNamesList = document.getElementById("model-names");
const countBadge = document.querySelector("header h1 span");

if (countBadge) {
  countBadge.textContent = `FBX × ${fbxModels.length}`;
}

if (modelNamesList) {
  fbxModels.forEach((fileName) => {
    const item = document.createElement("li");
    item.textContent = fileName;
    modelNamesList.appendChild(item);
  });
}

function restoreMaterials(mesh) {
  const states = mesh?.userData?.materialStates;
  if (!states) return;

  states.forEach((state) => {
    if (!state || !state.material) return;
    const { material, color, emissive, emissiveIntensity } = state;
    if (color && material.color) material.color.copy(color);
    if (emissive && material.emissive) material.emissive.copy(emissive);
    if (typeof emissiveIntensity === "number") {
      material.emissiveIntensity = emissiveIntensity;
    }
  });
}

function applyHighlight(mesh) {
  const states = mesh?.userData?.materialStates;
  if (!states) return;

  states.forEach((state) => {
    if (!state || !state.material) return;
    const { material } = state;
    if (material.emissive) {
      material.emissive.setHex(0x2563eb);
      material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0.6, 0.9);
    } else if (material.color) {
      material.color.offsetHSL(0, 0, 0.1);
    }
  });
}

function setHoveredMesh(mesh) {
  if (hoveredMesh === mesh) return;

  if (hoveredMesh) {
    restoreMaterials(hoveredMesh);
  }

  hoveredMesh = mesh || null;

  if (hoveredMesh) {
    applyHighlight(hoveredMesh);
  }
}

function handlePointerMove(event) {
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
}

function onResize() {
  const { innerWidth, innerHeight } = window;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

window.addEventListener("resize", onResize);
window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerleave", () => setHoveredMesh(null));

function animate() {
  requestAnimationFrame(animate);

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(selectableMeshes, true);
  setHoveredMesh(intersects[0]?.object || null);

  controls.update();
  renderer.render(scene, camera);
}

animate();
