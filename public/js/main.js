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
  WebGLRenderer,
  SRGBColorSpace
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";

const container = document.getElementById("canvas-container");
const scene = new Scene();
scene.background = new Color("#10192f");

const camera = new PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.position.set(0, 220, 520);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const outlinePass = new OutlinePass(
  new Vector2(window.innerWidth, window.innerHeight),
  scene,
  camera
);
outlinePass.edgeStrength = 3.5;
outlinePass.edgeGlow = 0.0;
outlinePass.edgeThickness = 1.0;
outlinePass.visibleEdgeColor.set("#4ea1ff");
outlinePass.hiddenEdgeColor.set("#000000");
composer.addPass(outlinePass);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 80, 0);
controls.enableDamping = true;

const ambient = new AmbientLight(0xcad4e0, 0.85);
scene.add(ambient);

const directional = new DirectionalLight(0xffffff, 1.3);
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

function placeModel(object, offsetX) {
  // Rotate so the equipment lies flat on the grid instead of standing upright
  object.rotation.x = -Math.PI / 2;
  object.rotation.z = -Math.PI / 2;

  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      selectableMeshes.push(child);
    }
  });

  const box = new Box3().setFromObject(object);
  const size = new Vector3();
  box.getSize(size);

  const targetSize = 280;
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

  scene.add(object);
}

function loadFBX(path, offsetX) {
  loader.load(
    path,
    (object) => {
      placeModel(object, offsetX);
    },
    undefined,
    (error) => {
      console.error(`Failed to load ${path}:`, error);
    }
  );
}

loadFBX("../3D_model/ThinFilmDepositionSystem_01.fbx", -240);
loadFBX("../3D_model/ThinFilmDepositionSystem_02.fbx", 240);

function setHoveredMesh(mesh) {
  if (hoveredMesh === mesh) return;

  hoveredMesh = mesh || null;
  outlinePass.selectedObjects = hoveredMesh ? [hoveredMesh] : [];
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
  composer.setSize(innerWidth, innerHeight);
  outlinePass.setSize(innerWidth, innerHeight);
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
  composer.render();
}

animate();
