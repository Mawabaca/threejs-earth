import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
camera.position.z = 2.5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.enablePan = false;
controls.minDistance = 2.5;
controls.maxDistance = 2.5;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const interactiveObjects = [];

const infoContainer = document.createElement('div');
infoContainer.style.position = 'absolute';
infoContainer.style.pointerEvents = 'none';
infoContainer.style.display = 'none';
infoContainer.style.color = 'white';
infoContainer.style.fontFamily = 'Arial, sans-serif';
infoContainer.style.fontSize = '14px';
infoContainer.style.textAlign = 'center';
infoContainer.style.padding = '10px';
infoContainer.style.borderRadius = '5px';
infoContainer.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
document.body.appendChild(infoContainer);

const loader = new THREE.TextureLoader();
const earthTexture = loader.load('./textures/earth.jpg');
const geometry = new THREE.IcosahedronGeometry(1, 12);
const material = new THREE.MeshBasicMaterial({ map: earthTexture });
const earthMesh = new THREE.Mesh(geometry, material);
scene.add(earthMesh);

// Rotation initiale de la Terre
earthMesh.rotation.x = 35.77 * (Math.PI / 180);
earthMesh.rotation.y = 70.88 * (Math.PI / 180);
earthMesh.updateMatrixWorld();  // Mise à jour de la matrice monde après rotation

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon) * (Math.PI / 180);
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

const startPointWorld = latLonToVector3(13.5, 101, 1);
const countries = [
  { name: "Algérie", lat: -1.2289, lon: 104, arcHeight: 1.1, animationSpeed: 0.03, lineColor: 0x009639, flag: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Flag_of_Algeria.svg' },
  { name: "Maroc", lat: 0, lon: 110.8, arcHeight: 1.1, animationSpeed: 0.03, lineColor: 0xC1272D, flag: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Flag_of_Morocco.svg' },
  { name: "Tanzanie", lat: -39.7669, lon: 69.8691, arcHeight: 1.3, animationSpeed: 0.03, lineColor: 0x1EB53A, flag: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Flag_of_Tanzania.svg' },
  { name: "Kenya", lat: -32.7669, lon: 68.5, arcHeight: 1.3, animationSpeed: 0.03, lineColor: 0x000000, flag: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Kenya.svg' },
  { name: "Madagascar", lat: -47.7669, lon: 48.8691, arcHeight: 1.4, animationSpeed: 0.03, lineColor: 0x007E3A, flag: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Madagascar.svg' },
];

const radius = 1;
let targetQuaternion = null;
let rotating = false;

countries.forEach(country => {
  // Calcul en coordonnées mondiales pour le point
  const endPointWorld = latLonToVector3(country.lat, country.lon, radius);
  // Conversion en coordonnées locales de la Terre
  const localEndPoint = earthMesh.worldToLocal(endPointWorld.clone());

  const pointGeometry = new THREE.SphereGeometry(0.02, 16, 16);
  const pointMaterial = new THREE.MeshBasicMaterial({ color: country.lineColor });
  const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
  pointMesh.position.copy(localEndPoint);
  earthMesh.add(pointMesh);

  // Calculs pour la courbe en coordonnées mondiales
  const midPointWorld = startPointWorld.clone().lerp(endPointWorld, 0.5).normalize().multiplyScalar(country.arcHeight);
  // Conversion des points d'ancrage de la courbe en coordonnées locales
  const localStartPoint = earthMesh.worldToLocal(startPointWorld.clone());
  const localMidPoint = earthMesh.worldToLocal(midPointWorld.clone());
  const localCurveEndPoint = earthMesh.worldToLocal(endPointWorld.clone());

  const curve = new THREE.QuadraticBezierCurve3(localStartPoint, localMidPoint, localCurveEndPoint);
  const curvePoints = curve.getPoints(100);
  const curveGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);

  const lineMaterial = new THREE.LineBasicMaterial({ color: country.lineColor });
  const line = new THREE.Line(curveGeometry, lineMaterial);
  line.visible = false;
  earthMesh.add(line);

  interactiveObjects.push({ 
    mesh: pointMesh, 
    line, 
    flag: country.flag, 
    name: country.name, 
    curvePoints, 
    animationSpeed: country.animationSpeed 
  });
});

function animateLine(line, points, speed) {
  let progress = 0;
  function animate() {
    if (progress <= 1) {
      const visiblePoints = points.slice(0, Math.floor(progress * points.length));
      line.geometry.setFromPoints(visiblePoints);
      progress += speed;
      requestAnimationFrame(animate);
    }
  }
  animate();
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactiveObjects.map(obj => obj.mesh));

  interactiveObjects.forEach(obj => {
    obj.line.visible = false;
    obj.mesh.scale.set(1, 1, 1);
  });

  if (intersects.length > 0) {
    const intersected = interactiveObjects.find(obj => obj.mesh === intersects[0].object);

    infoContainer.style.display = 'block';
    infoContainer.style.left = `${event.clientX + 10}px`;
    infoContainer.style.top = `${event.clientY + 10}px`;
    infoContainer.innerHTML = `
      <img src="${intersected.flag}" width="50" height="30" style="display:block; margin: 0 auto; border: none;">
      <span style="display: inline-block; margin-top: 8px;">${intersected.name}</span>
    `;

    intersected.mesh.scale.set(1.5, 1.5, 1.5);
    intersected.line.visible = true;

    animateLine(intersected.line, intersected.curvePoints, intersected.animationSpeed);
  } else {
    infoContainer.style.display = 'none';
  }
}

window.addEventListener('mousemove', onMouseMove);

function onMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactiveObjects.map(obj => obj.mesh));

  if (intersects.length > 0) {
    const clickedMesh = intersects[0].object;
    const worldPoint = clickedMesh.getWorldPosition(new THREE.Vector3()).normalize();
    const cameraDir = new THREE.Vector3().subVectors(camera.position, earthMesh.position).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(worldPoint, cameraDir);
    targetQuaternion = earthMesh.quaternion.clone().premultiply(q);
    rotating = true;
  }
}

window.addEventListener('click', onMouseClick);

function animate() {
  requestAnimationFrame(animate);
  
  if(rotating && targetQuaternion) {
    earthMesh.quaternion.slerp(targetQuaternion, 0.05);
    if(earthMesh.quaternion.angleTo(targetQuaternion) < 0.001) {
      earthMesh.quaternion.copy(targetQuaternion);
      rotating = false;
    }
  }
  
  controls.update();
  renderer.render(scene, camera);
}

animate();
