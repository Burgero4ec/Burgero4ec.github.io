/* 3D-просмотрщик модели — vanilla Three.js */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const MODEL_URL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/ToyCar/glTF-Binary/ToyCar.glb';
const AUTO_ROTATE_SPEED = 0.003;
const PARALLAX = 0.04;

export function initModelViewer(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const width = () => container.clientWidth;
  const height = () => container.clientHeight || width();

  /* Сцена */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width() / height(), 0.1, 100);
  camera.position.set(0, 1, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width(), height());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  /* Свет: как в твоём React-компоненте */
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(5, 5, 5); key.castShadow = true;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-5, 2, 5); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8);
  rim.position.set(0, 4, -5); scene.add(rim);

  /* Пол-тень */
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3, 48),
    new THREE.ShadowMaterial({ opacity: 0.25 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.8;
  floor.receiveShadow = true;
  scene.add(floor);

  /* Управление мышью */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.5;

  /* Параллакс от курсора (как enableMouseParallax) */
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e) => {
    if (e.pointerType === 'touch') return;
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    par.tx = -nx * PARALLAX;
    par.ty = -ny * PARALLAX;
  };
  window.addEventListener('pointermove', onMove);

  /* Группа для модели + параллакса */
  const modelGroup = new THREE.Group();
  scene.add(modelGroup);

  /* Индикатор загрузки */
  const loader = document.createElement('div');
  loader.className = 'viewer-loading';
  loader.textContent = 'Загрузка модели...';
  container.appendChild(loader);

  /* Загрузка GLB */
  const gltfLoader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://unpkg.com/three@0.161.0/examples/jsm/libs/draco/');
  gltfLoader.setDRACOLoader(draco);

  gltfLoader.load(
    MODEL_URL,
    (gltf) => {
      const model = gltf.scene;

      /* Центрирование и масштабирование (как autoFrame) */
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      model.position.x += (model.position.x - center.x);
      model.position.y += (model.position.y - center.y);
      model.position.z += (model.position.z - center.z);
      const scale = 2.5 / size;
      model.scale.setScalar(scale);

      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      modelGroup.add(model);
      loader.remove();
    },
    (xhr) => {
      if (xhr.total) loader.textContent = 'Загрузка ' + Math.round((xhr.loaded / xhr.total) * 100) + '%';
    },
    (err) => {
      console.error('[viewer]', err);
      loader.textContent = 'Не удалось загрузить модель';
    }
  );

  /* Рендер-луп */
  function animate() {
    requestAnimationFrame(animate);
    par.x += (par.tx - par.x) * 0.08;
    par.y += (par.ty - par.y) * 0.08;
    modelGroup.rotation.y = par.x;
    modelGroup.rotation.x = par.y;
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  /* Ресайз */
  const ro = new ResizeObserver(() => {
    const w = width(), h = height();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  ro.observe(container);
}
