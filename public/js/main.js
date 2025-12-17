import {
  AmbientLight,
  AnimationMixer,
  Box3,
  Clock,
  Color,
  DirectionalLight,
  GridHelper,
  LoopOnce,
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

const gridSize = 10;
const gridDivisions = 10;
const grid = new GridHelper(gridSize, gridDivisions, 0x3b82f6, 0x1f2937);
scene.add(grid);

const loader = new FBXLoader();
const selectableMeshes = [];
const raycaster = new Raycaster();
const pointer = new Vector2(1, 1);
let hoveredMesh = null;
const animationMixers = [];

const clock = new Clock();

const modelRootPath = "./3D_model/FAB/";
const defaultFbxModels = [
  {
    assetId: "CAM-01",
    name: "Contact Angle Meter",
    fileName: "ContactAngleMeter_01.fbx",
    location: { gridPosition: 0 },
    dimensions: { length: 2.6, width: 2.4, height: 2.2 },
    status: "on"
  },
  {
    assetId: "CMM-01",
    name: "Coordinate Measuring Machine",
    fileName: "CoordinateMeasuringMachine_01.fbx",
    location: { gridPosition: 1 },
    dimensions: { length: 2.8, width: 2.4, height: 2.0 },
    status: "on"
  },
  {
    assetId: "EVAP-01",
    name: "Evaporator",
    fileName: "Evaporator_01.fbx",
    location: { gridPosition: 2 },
    dimensions: { length: 3.0, width: 2.8, height: 2.6 },
    status: "off"
  },
  {
    assetId: "OVEN-01",
    name: "Forced Convection Oven",
    fileName: "ForcedConvectionOven_01.fbx",
    location: { gridPosition: 3 },
    dimensions: { length: 2.4, width: 2.6, height: 2.2 },
    status: "on"
  },
  {
    assetId: "MICRO-01",
    name: "Optical Microscope",
    fileName: "OpticalMicroscope_01.fbx",
    location: { gridPosition: 4 },
    dimensions: { length: 2.0, width: 2.0, height: 2.0 },
    status: "on"
  },
  {
    assetId: "TFD-01",
    name: "Thin Film Deposition System A",
    fileName: "ThinFilmDepositionSystem_01.fbx",
    location: { gridPosition: 5 },
    dimensions: { length: 3.2, width: 2.8, height: 2.6 },
    status: "off"
  },
  {
    assetId: "TFD-02",
    name: "Thin Film Deposition System B",
    fileName: "ThinFilmDepositionSystem_02.fbx",
    location: { gridPosition: 6 },
    dimensions: { length: 3.2, width: 2.8, height: 2.6 },
    status: "off"
  },
  {
    assetId: "UVC-01",
    name: "Ultraviolet Cleaner",
    fileName: "UltravioletCleaner_01.fbx",
    location: { gridPosition: 7 },
    dimensions: { length: 2.4, width: 2.4, height: 2.2 },
    status: "on"
  }
];

function normalizeDimensions(dimensions) {
  if (!dimensions) return null;
  const length = dimensions.length ?? dimensions.L ?? dimensions.depth ?? dimensions.width;
  const width = dimensions.width ?? dimensions.W ?? dimensions.depth;
  const height = dimensions.height ?? dimensions.H ?? dimensions.h;

  if (
    [length, width, height].every(
      (value) => typeof value === "number" && Number.isFinite(value) && value > 0
    )
  ) {
    return { length, width, height };
  }

  return null;
}

async function fetchModelMetadata() {
  try {
    const response = await fetch("./vitualModel/fab_models.yaml");
    if (!response.ok) throw new Error(`Failed to fetch metadata: ${response.status}`);
    const yamlText = await response.text();
    const parsed = JSON.parse(yamlText);
    if (Array.isArray(parsed?.models)) {
      return parsed.models.map((model, index) => ({
        assetId: model.asset_id,
        name: model.name,
        fileName: model.file,
        location: model.location || { gridPosition: index },
        dimensions: normalizeDimensions(model.dimensions),
        status: model.status || "unknown"
      }));
    }
  } catch (error) {
    console.warn("Using built-in model metadata due to error:", error);
  }

  return defaultFbxModels;
}

function getGridPosition(index, columnCount, spacingX, spacingZ, rowCount) {
  const row = Math.floor(index / columnCount);
  const column = index % columnCount;

  const offsetX = (column - (columnCount - 1) / 2) * spacingX;
  const offsetZ = (row - (rowCount - 1) / 2) * spacingZ;

  return { offsetX, offsetZ };
}

async function initModels() {
  const modelNamesList = document.getElementById("model-names");
  const countBadge = document.querySelector("header h1 span");

  const models = await fetchModelMetadata();

  const columnCount = 3;
  const rowCount = Math.ceil(models.length / columnCount);
  const spacingX = gridSize / Math.max(columnCount, rowCount);
  const spacingZ = gridSize / Math.max(columnCount, rowCount);

  if (countBadge) {
    countBadge.textContent = `FBX × ${models.length}`;
  }

  if (modelNamesList) {
    modelNamesList.innerHTML = "";
    models.forEach((model) => {
      const item = document.createElement("li");
      const statusLabel = model.status ? ` (${model.status.toUpperCase()})` : "";
      item.textContent = `${model.assetId || model.fileName}: ${model.name || model.fileName}${statusLabel}`;
      modelNamesList.appendChild(item);
    });
  }

  models.forEach((model, index) => {
    const locationPosition = model?.location?.position;
    const { offsetX, offsetZ } = locationPosition
      ? { offsetX: locationPosition.x ?? 0, offsetZ: locationPosition.z ?? 0 }
      : getGridPosition(
          model?.location?.gridPosition ?? index,
          columnCount,
          spacingX,
          spacingZ,
          rowCount
        );

    const offsetY = locationPosition?.y ?? 0;

    loadFBX(`${modelRootPath}${model.fileName}`, {
      position: { x: offsetX, y: offsetY, z: offsetZ },
      dimensions: model.dimensions
    });
  });
}

function computeScale(size, dimensions) {
  if (dimensions) {
    const { length, width, height } = dimensions;
    const scaleX = length && size.x > 0 ? length / size.x : null;
    const scaleZ = width && size.z > 0 ? width / size.z : null;
    const scaleY = height && size.y > 0 ? height / size.y : null;

    const fallbacks = [scaleX, scaleY, scaleZ].filter(
      (value) => typeof value === "number" && Number.isFinite(value) && value > 0
    );

    if (fallbacks.length > 0) {
      return {
        x: scaleX ?? fallbacks[0],
        y: scaleY ?? fallbacks[0],
        z: scaleZ ?? fallbacks[0]
      };
    }
  }

  const targetSize = 6;
  const maxDim = Math.max(size.x, size.y, size.z);
  const uniformScale = maxDim > 0 ? targetSize / maxDim : 1;

  return { x: uniformScale, y: uniformScale, z: uniformScale };
}

function placeModel(object, placement) {
  const animations = object.animations || [];
  const mixer = animations.length > 0 ? new AnimationMixer(object) : null;
  const defaultAction = mixer && animations[0] ? mixer.clipAction(animations[0]) : null;

  if (defaultAction) {
    defaultAction.setLoop(LoopOnce, 1);
    defaultAction.clampWhenFinished = true;
    defaultAction.paused = true;
    animationMixers.push(mixer);
  }

  // Rotate 90° around the Y-axis to orient the equipment correctly
  object.rotation.set(0, Math.PI / 2, 0);

  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      selectableMeshes.push(child);

      if (mixer && defaultAction) {
        child.userData.animationAction = defaultAction;
      }

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

  const initialBox = new Box3().setFromObject(object);
  const rawSize = new Vector3();
  initialBox.getSize(rawSize);

  const { position, dimensions } = placement || {};
  const scale = computeScale(rawSize, dimensions);
  object.scale.set(scale.x, scale.y, scale.z);

  const centeredBox = new Box3().setFromObject(object);
  const center = new Vector3();
  centeredBox.getCenter(center);
  object.position.sub(center);

  const groundedBox = new Box3().setFromObject(object);
  const minY = groundedBox.min.y;
  object.position.y -= minY;
  object.position.x += position?.x ?? 0;
  object.position.y += position?.y ?? 0;
  object.position.z += position?.z ?? 0;

  scene.add(object);
}

function loadFBX(path, placement) {
  loader.load(
    path,
    (object) => {
      placeModel(object, placement);
    },
    undefined,
    (error) => {
      console.error(`Failed to load ${path}:`, error);
    }
  );
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

function playMeshAnimation(mesh) {
  const action = mesh?.userData?.animationAction;
  if (!action) return;

  action.reset();
  action.paused = false;
  action.play();
}

function handleClick(event) {
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(selectableMeshes, true);
  const targetMesh = intersects[0]?.object;

  if (targetMesh) {
    playMeshAnimation(targetMesh);
  }
}

window.addEventListener("click", handleClick);

initModels();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(selectableMeshes, true);
  setHoveredMesh(intersects[0]?.object || null);

  animationMixers.forEach((mixer) => mixer.update(delta));

  controls.update();
  renderer.render(scene, camera);
}

animate();
