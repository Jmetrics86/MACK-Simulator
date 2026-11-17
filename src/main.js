import * as THREE from 'three';
import { createMackRig } from './mackTruck.js';
import { ArticulatedRigPhysics, wrapAngle } from './physics.js';
import { buildTerminalYard, DIFFICULTY_CONFIGS } from './yard.js';
import { createProceduralEnvMap } from './textures.js';
import { TruckAudioEngine } from './audio.js';

// ============================================================================
// CORE ENGINE & RENDERER INITIALIZATION
// ============================================================================
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const mainCamera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.25, 220);

// Environment Reflection Cache per lighting mode
const envCache = {};
function applyEnvironmentPreset(mode) {
  if (!envCache[mode]) {
    envCache[mode] = createProceduralEnvMap(renderer, mode);
  }
  scene.environment = envCache[mode].texture;

  if (mode === 'day') {
    scene.background = new THREE.Color(0x7dd3fc);
    scene.fog = new THREE.FogExp2(0xbae6fd, 0.0065);
    renderer.toneMappingExposure = 1.05;
  } else if (mode === 'dusk') {
    scene.background = new THREE.Color(0x431407);
    scene.fog = new THREE.FogExp2(0x7c2d12, 0.0085);
    renderer.toneMappingExposure = 1.12;
  } else {
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x090d18, 0.011);
    renderer.toneMappingExposure = 1.22;
  }
}

// ============================================================================
// REAL-TIME DUAL WEST COAST SIDE MIRRORS (HalfFloat RenderTargets + Ortho HUD)
// ============================================================================
const leftMirrorRT = new THREE.WebGLRenderTarget(360, 460, {
  type: THREE.HalfFloatType,
  depthBuffer: true,
});
const rightMirrorRT = new THREE.WebGLRenderTarget(360, 460, {
  type: THREE.HalfFloatType,
  depthBuffer: true,
});

// Horizontal mirror flip so Left & Right West Coast mirrors reflect optically like real glass!
leftMirrorRT.texture.wrapS = THREE.RepeatWrapping;
leftMirrorRT.texture.repeat.x = -1;
leftMirrorRT.texture.offset.x = 1;

rightMirrorRT.texture.wrapS = THREE.RepeatWrapping;
rightMirrorRT.texture.repeat.x = -1;
rightMirrorRT.texture.offset.x = 1;

const mirrorHudScene = new THREE.Scene();
const mirrorHudCam = new THREE.OrthographicCamera(
  0,
  window.innerWidth,
  window.innerHeight,
  0,
  -1,
  1
);

const leftMirrorQuad = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ map: leftMirrorRT.texture, toneMapped: true })
);
const rightMirrorQuad = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ map: rightMirrorRT.texture, toneMapped: true })
);
mirrorHudScene.add(leftMirrorQuad, rightMirrorQuad);

const mirrorLeftBox = document.getElementById('mirror-left-box');
const mirrorRightBox = document.getElementById('mirror-right-box');

function syncMirrorQuadsToDOM() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  mirrorHudCam.right = w;
  mirrorHudCam.top = h;
  mirrorHudCam.updateProjectionMatrix();

  const placeQuad = (quad, domEl, cam) => {
    const rect = domEl.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;
    const cx = rect.left + rect.width * 0.5;
    const cy = h - (rect.top + rect.height * 0.5);
    quad.position.set(cx, cy, 0);
    quad.scale.set(rect.width - 6, rect.height - 6, 1);
    cam.aspect = rect.width / rect.height;
    cam.updateProjectionMatrix();
  };

  placeQuad(leftMirrorQuad, mirrorLeftBox, rig.leftMirrorCam);
  placeQuad(rightMirrorQuad, mirrorRightBox, rig.rightMirrorCam);
}

// ============================================================================
// CREATE BESPOKE MACK RIG, PHYSICS, AUDIO & TRAJECTORY GUIDE LINES
// ============================================================================
let selectedLivery = 'red';
const rig = createMackRig(selectedLivery);
scene.add(rig.tractorGroup);
scene.add(rig.trailerGroup);
scene.add(rig.hoseGroup);
scene.add(rig.smokeGroup);

const physics = new ArticulatedRigPhysics();
const audio = new TruckAudioEngine();

// Dynamic Backing Trajectory Arcs (Left & Right Rear Trailer Wheel/Corner Paths)
const guideGroup = new THREE.Group();
const guideLineMat = new THREE.LineBasicMaterial({
  color: 0xfbbf24,
  transparent: true,
  opacity: 0.85,
});
const guideLeftLine = new THREE.Line(new THREE.BufferGeometry(), guideLineMat);
const guideRightLine = new THREE.Line(new THREE.BufferGeometry(), guideLineMat);
const guideEndBar = new THREE.Line(new THREE.BufferGeometry(), guideLineMat);
guideGroup.add(guideLeftLine, guideRightLine, guideEndBar);
scene.add(guideGroup);

function updateGuideGeometry(inZone) {
  if (!guideGroup.visible) return;
  const { leftPts, rightPts } = physics.predictTrailerArcs(40, -0.45);
  guideLineMat.color.setHex(inZone ? 0x4ade80 : 0xfbbf24);

  const lArr = new Float32Array(leftPts.length * 3);
  const rArr = new Float32Array(rightPts.length * 3);
  for (let i = 0; i < leftPts.length; i++) {
    lArr[i * 3] = leftPts[i].x;
    lArr[i * 3 + 1] = 0.05;
    lArr[i * 3 + 2] = leftPts[i].z;

    rArr[i * 3] = rightPts[i].x;
    rArr[i * 3 + 1] = 0.05;
    rArr[i * 3 + 2] = rightPts[i].z;
  }

  guideLeftLine.geometry.dispose();
  guideLeftLine.geometry = new THREE.BufferGeometry().setAttribute(
    'position',
    new THREE.BufferAttribute(lArr, 3)
  );

  guideRightLine.geometry.dispose();
  guideRightLine.geometry = new THREE.BufferGeometry().setAttribute(
    'position',
    new THREE.BufferAttribute(rArr, 3)
  );

  if (leftPts.length > 0) {
    const lastL = leftPts[leftPts.length - 1];
    const lastR = rightPts[rightPts.length - 1];
    const endArr = new Float32Array([lastL.x, 0.05, lastL.z, lastR.x, 0.05, lastR.z]);
    guideEndBar.geometry.dispose();
    guideEndBar.geometry = new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.BufferAttribute(endArr, 3)
    );
  }
}

// ============================================================================
// GAME STATE & LEVEL MANAGEMENT
// ============================================================================
let activeYard = null;
let currentLevelKey = 'easy';
let gamePhase = 'menu'; // 'menu' | 'playing' | 'finished'
let elapsedShiftTime = 0;
let strikes = 0;
let dockHoldTimer = 0;
const DOCK_HOLD_REQUIRED = 1.15;

let mirrorsVisible = true;
let guideVisible = true;
let cameraMode = 0; // 0: Orbit Chase, 1: Bulldog POV, 2: Overhead Spotter, 3: Dock Bay Cam
let cameraShake = 0;
let toastTimer = 0;

// Orbit Camera spherical controls
const orbitState = {
  yaw: 2.55, // angled nicely so driver sees cab, trailer, and loading dock
  pitch: 0.42,
  distance: 21.5,
  dragging: false,
  lastX: 0,
  lastY: 0,
  focusPos: new THREE.Vector3(),
};

function loadYardLevel(levelKey, startPlaying = false) {
  currentLevelKey = levelKey;
  if (activeYard) {
    scene.remove(activeYard.yardGroup);
  }

  activeYard = buildTerminalYard(levelKey);
  scene.add(activeYard.yardGroup);

  const cfg = activeYard.config;
  applyEnvironmentPreset(cfg.envMode);

  physics.reset(cfg.startPose);
  rig.setHeadlights(cfg.autoHeadlights);
  updateAssistButtonUI();

  elapsedShiftTime = 0;
  strikes = 0;
  dockHoldTimer = 0;
  cameraShake = 0;

  // Set default guide assist for this difficulty
  guideVisible = cfg.defaultGuide;
  guideGroup.visible = startPlaying && guideVisible;

  // Set smart initial orbit yaw in front-quarter of the Mack cab so the player immediately sees
  // the iconic Mack grille/Bulldog, full 53' trailer, AND the target loading dock bay behind it!
  if (levelKey === 'easy') {
    orbitState.yaw = 0.56;
    orbitState.pitch = 0.38;
    orbitState.distance = 22.5;
  } else if (levelKey === 'medium') {
    orbitState.yaw = 0.62;
    orbitState.pitch = 0.42;
    orbitState.distance = 24.0;
  } else {
    orbitState.yaw = -0.52;
    orbitState.pitch = 0.44;
    orbitState.distance = 24.5;
  }
  orbitState.focusPos.set(physics.hitchX, 1.8, physics.hitchZ);

  rig.updateVisuals(0.016, {
    tractorX: physics.tractorX,
    tractorZ: physics.tractorZ,
    tractorTheta: physics.tractorTheta,
    hitchX: physics.hitchX,
    hitchZ: physics.hitchZ,
    trailerTheta: physics.trailerTheta,
    steerAngle: 0,
    tractorDistDelta: 0,
    trailerDistDelta: 0,
    braking: false,
    inReverse: false,
    rpmNorm: 0.14,
    throttle: 0,
  });

  if (startPlaying) {
    gamePhase = 'playing';
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('result-overlay').classList.add('hidden');
    document.getElementById('game-hud').classList.remove('hidden');
    document.getElementById('mirrors-hud').classList.toggle('hidden', !mirrorsVisible);
    document.getElementById('hud-level-name').textContent = `${cfg.badge} • BAY 0${cfg.targetBay}`;
    updateAssistButtonUI();
    requestAnimationFrame(() => syncMirrorQuadsToDOM());
  }
}

// ============================================================================
// INPUT HANDLING (Keyboard, Mouse Orbit & Touch Controls)
// ============================================================================
const keys = {
  forward: false,
  reverse: false,
  left: false,
  right: false,
  brake: false,
};

window.addEventListener('keydown', (e) => {
  if (e.repeat && ['KeyC', 'KeyM', 'KeyG', 'KeyL', 'KeyR', 'KeyH', 'Escape'].includes(e.code)) {
    return;
  }
  audio.init();

  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp':
      keys.forward = true;
      break;
    case 'KeyS':
    case 'ArrowDown':
      keys.reverse = true;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      keys.left = true;
      break;
    case 'KeyD':
    case 'ArrowRight':
      keys.right = true;
      break;
    case 'Space':
      e.preventDefault();
      if (!keys.brake && gamePhase === 'playing') {
        audio.playAirBrake();
        if (Math.abs(physics.speed) < 0.25) {
          physics.parkBrake = !physics.parkBrake;
        }
      }
      keys.brake = true;
      break;
    case 'Digit1':
      setCameraMode(0);
      break;
    case 'Digit2':
      setCameraMode(1);
      break;
    case 'Digit3':
      setCameraMode(2);
      break;
    case 'Digit4':
      setCameraMode(3);
      break;
    case 'KeyC':
      setCameraMode((cameraMode + 1) % 4);
      break;
    case 'KeyM':
      toggleMirrors();
      break;
    case 'KeyG':
      toggleGuide();
      break;
    case 'KeyL':
      toggleHeadlights();
      break;
    case 'KeyH':
      audio.playAirHorn(0.65);
      break;
    case 'KeyR':
      if (gamePhase === 'playing' || gamePhase === 'finished') {
        loadYardLevel(currentLevelKey, true);
      }
      break;
    case 'Escape':
      if (gamePhase === 'playing') {
        openMainMenu();
      }
      break;
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp':
      keys.forward = false;
      break;
    case 'KeyS':
    case 'ArrowDown':
      keys.reverse = false;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      keys.left = false;
      break;
    case 'KeyD':
    case 'ArrowRight':
      keys.right = false;
      break;
    case 'Space':
      keys.brake = false;
      break;
  }
});

// Orbit Camera Pointer Drag & Wheel Zoom
renderer.domElement.addEventListener('pointerdown', (e) => {
  audio.init();
  orbitState.dragging = true;
  orbitState.lastX = e.clientX;
  orbitState.lastY = e.clientY;
});

window.addEventListener('pointermove', (e) => {
  if (!orbitState.dragging) return;
  const dx = e.clientX - orbitState.lastX;
  const dy = e.clientY - orbitState.lastY;
  orbitState.lastX = e.clientX;
  orbitState.lastY = e.clientY;

  orbitState.yaw = wrapAngle(orbitState.yaw - dx * 0.0065);
  orbitState.pitch = Math.max(0.14, Math.min(1.28, orbitState.pitch + dy * 0.0055));
});

window.addEventListener('pointerup', () => {
  orbitState.dragging = false;
});

renderer.domElement.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    orbitState.distance = Math.max(10.5, Math.min(42, orbitState.distance + e.deltaY * 0.018));
  },
  { passive: false }
);

// Bind Touch Controls
function bindHoldButton(id, keyProp, onPress) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = (e) => {
    e.preventDefault();
    audio.init();
    keys[keyProp] = true;
    if (onPress) onPress();
  };
  const end = (e) => {
    e.preventDefault();
    keys[keyProp] = false;
  };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointerleave', end);
  el.addEventListener('pointercancel', end);
}

bindHoldButton('touch-steer-left', 'left');
bindHoldButton('touch-steer-right', 'right');
bindHoldButton('touch-fwd', 'forward');
bindHoldButton('touch-rev', 'reverse');
bindHoldButton('touch-brake', 'brake', () => audio.playAirBrake());

// ============================================================================
// UI CONTROLS, BEST SCORES & HUD WIRING
// ============================================================================
function loadBestScoresUI() {
  for (const lvl of ['easy', 'medium', 'hard']) {
    const saved = localStorage.getItem(`mack_sim_best_${lvl}`);
    const el = document.getElementById(`best-${lvl}`);
    if (el) {
      el.textContent = saved ? `Best Score: ${saved} pts` : 'Best Score: —';
    }
  }
}

function openMainMenu() {
  gamePhase = 'menu';
  guideGroup.visible = false;
  document.getElementById('game-hud').classList.add('hidden');
  document.getElementById('mirrors-hud').classList.add('hidden');
  document.getElementById('result-overlay').classList.add('hidden');
  document.getElementById('menu-overlay').classList.remove('hidden');
  loadBestScoresUI();
}

function setCameraMode(modeIdx) {
  cameraMode = modeIdx;
  document.querySelectorAll('[data-cam]').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.cam) === cameraMode);
  });
}

function toggleMirrors() {
  mirrorsVisible = !mirrorsVisible;
  if (gamePhase === 'playing') {
    document.getElementById('mirrors-hud').classList.toggle('hidden', !mirrorsVisible);
    if (mirrorsVisible) syncMirrorQuadsToDOM();
  }
  updateAssistButtonUI();
}

function toggleGuide() {
  guideVisible = !guideVisible;
  guideGroup.visible = gamePhase === 'playing' && guideVisible;
  updateAssistButtonUI();
}

function toggleHeadlights() {
  rig.setHeadlights(!rig.isHeadlightsOn());
  updateAssistButtonUI();
}

function updateAssistButtonUI() {
  document.getElementById('btn-toggle-mirrors').classList.toggle('active', mirrorsVisible);
  document.getElementById('btn-toggle-guide').classList.toggle('active', guideVisible);
  document.getElementById('btn-toggle-lights').classList.toggle('active', rig.isHeadlightsOn());
}

// Menu Livery Swatches
document.querySelectorAll('.swatch-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    audio.init();
    selectedLivery = btn.dataset.livery;
    rig.setLivery(selectedLivery);
    document.querySelectorAll('.swatch-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Menu Difficulty Start Buttons
document.querySelectorAll('[data-start]').forEach((btn) => {
  btn.addEventListener('click', () => {
    audio.init();
    loadYardLevel(btn.dataset.start, true);
  });
});

// HUD Buttons
document.querySelectorAll('[data-cam]').forEach((btn) => {
  btn.addEventListener('click', () => setCameraMode(Number(btn.dataset.cam)));
});
document.getElementById('btn-toggle-mirrors').addEventListener('click', toggleMirrors);
document.getElementById('btn-toggle-guide').addEventListener('click', toggleGuide);
document.getElementById('btn-toggle-lights').addEventListener('click', toggleHeadlights);
document.getElementById('btn-horn').addEventListener('click', () => audio.playAirHorn(0.65));
document.getElementById('btn-menu').addEventListener('click', openMainMenu);
document.getElementById('btn-reset').addEventListener('click', () => loadYardLevel(currentLevelKey, true));
document.getElementById('btn-mute').addEventListener('click', (e) => {
  audio.init();
  const muted = audio.toggleMute();
  e.currentTarget.textContent = muted ? '🔇' : '🔊';
});

// Results Modal Actions
document.getElementById('btn-res-menu').addEventListener('click', openMainMenu);
document.getElementById('btn-res-retry').addEventListener('click', () => loadYardLevel(currentLevelKey, true));
document.getElementById('btn-res-next').addEventListener('click', () => {
  const order = ['easy', 'medium', 'hard'];
  const nextIdx = (order.indexOf(currentLevelKey) + 1) % order.length;
  loadYardLevel(order[nextIdx], true);
});

// ============================================================================
// STATUS BANNER & RESULTS MODAL HELPERS
// ============================================================================
const statusBanner = document.getElementById('status-banner');
const statusBannerText = document.getElementById('status-banner-text');
const holdProgressTrack = document.getElementById('hold-progress-track');
const holdProgressFill = document.getElementById('hold-progress-fill');

function showToastBanner(message, variant = 'danger', duration = 2.0) {
  toastTimer = duration;
  statusBanner.classList.remove('hidden', 'status-ok', 'status-danger');
  if (variant === 'danger') statusBanner.classList.add('status-danger');
  if (variant === 'ok') statusBanner.classList.add('status-ok');
  statusBannerText.textContent = message;
  holdProgressTrack.classList.add('hidden');
}

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function finishShift(success, alignment) {
  gamePhase = 'finished';
  guideGroup.visible = false;
  statusBanner.classList.add('hidden');

  const cfg = activeYard.config;
  const overlay = document.getElementById('result-overlay');
  const badge = document.getElementById('res-badge');
  const title = document.getElementById('res-title');
  const sub = document.getElementById('res-subtitle');
  const scoreEl = document.getElementById('res-score');
  const stars = document.querySelectorAll('#res-stars .star');

  let finalScore = 0;
  let starCount = 0;

  if (success) {
    audio.playDockSuccess();
    const latScore = Math.round(350 * Math.max(0, 1 - Math.abs(alignment.lateralOffset) / cfg.maxLatOffset));
    const angScore = Math.round(250 * Math.max(0, 1 - Math.abs(alignment.angleErrorDeg) / cfg.maxAngleDeg));
    const gapScore = Math.round(200 * Math.max(0, 1 - alignment.bumperGap / cfg.maxBumperGap));
    const timeBonus = Math.round(200 * Math.max(0, Math.min(1, cfg.parTime / Math.max(25, elapsedShiftTime))));
    const strikePenalty = strikes * 150;

    finalScore = Math.max(100, Math.min(1000, latScore + angScore + gapScore + timeBonus - strikePenalty));
    starCount = finalScore >= 820 && strikes === 0 ? 3 : finalScore >= 580 ? 2 : 1;

    const prevBest = Number(localStorage.getItem(`mack_sim_best_${currentLevelKey}`) || 0);
    if (finalScore > prevBest) {
      localStorage.setItem(`mack_sim_best_${currentLevelKey}`, String(finalScore));
    }

    badge.textContent = `BAY 0${cfg.targetBay} DOCK LOCKED`;
    badge.classList.remove('failed');
    title.textContent = starCount === 3 ? 'BULLDOG MASTER PRECISION!' : 'DOCK ENGAGEMENT COMPLETE';
    sub.textContent = `${cfg.title} completed cleanly in ${formatTime(elapsedShiftTime)}.`;
  } else {
    badge.textContent = 'SHIFT TERMINATED';
    badge.classList.add('failed');
    title.textContent = 'YARD STRIKE LIMIT EXCEEDED';
    sub.textContent = 'Too many collisions in the freight apron. Reset your setup and watch both mirrors!';
    finalScore = 0;
    starCount = 0;
  }

  stars.forEach((st, i) => st.classList.toggle('earned', i < starCount));
  scoreEl.textContent = String(finalScore);

  document.getElementById('res-lat').textContent = `${Math.abs(alignment.lateralOffset).toFixed(2)} m`;
  document.getElementById('res-ang').textContent = `${Math.abs(alignment.angleErrorDeg).toFixed(1)}°`;
  document.getElementById('res-gap').textContent = `${alignment.bumperGap.toFixed(2)} m`;
  document.getElementById('res-time').textContent = formatTime(elapsedShiftTime);
  document.getElementById('res-hits').textContent = `${strikes} / ${cfg.maxStrikes}`;

  overlay.classList.remove('hidden');
}

// ============================================================================
// CAMERA CONTROLLER (Menu Showcase + 4 Active Trucker Camera Views)
// ============================================================================
const _camTarget = new THREE.Vector3();
const _camPos = new THREE.Vector3();

function updateMainCamera(dt, totalTime) {
  if (gamePhase === 'menu') {
    // Cinematic turntable showcase around the Mack Super-Liner & 53' Trailer!
    const angle = totalTime * 0.22 + 0.7;
    const focusX = physics.tractorX - 2.0 * Math.sin(physics.tractorTheta);
    const focusZ = physics.tractorZ - 2.0 * Math.cos(physics.tractorTheta);
    mainCamera.position.set(
      focusX + Math.sin(angle) * 14.5,
      4.4 + Math.sin(totalTime * 0.45) * 0.6,
      focusZ + Math.cos(angle) * 14.5
    );
    mainCamera.lookAt(focusX, 1.9, focusZ);
    return;
  }

  if (cameraMode === 0) {
    // 1: Orbit / Chase Cam centered near Fifth-Wheel Hitch / Rear of Cab
    const desiredFocusX = (physics.tractorX + physics.hitchX - 3.5 * Math.sin(physics.trailerTheta)) * 0.5;
    const desiredFocusZ = (physics.tractorZ + physics.hitchZ - 3.5 * Math.cos(physics.trailerTheta)) * 0.5;
    orbitState.focusPos.lerp(_camTarget.set(desiredFocusX, 2.1, desiredFocusZ), Math.min(1, dt * 7));

    const horizDist = orbitState.distance * Math.cos(orbitState.pitch);
    const camX = orbitState.focusPos.x + Math.sin(orbitState.yaw) * horizDist;
    const camY = Math.max(1.2, orbitState.focusPos.y + orbitState.distance * Math.sin(orbitState.pitch));
    const camZ = orbitState.focusPos.z + Math.cos(orbitState.yaw) * horizDist;

    mainCamera.position.set(camX, camY, camZ);
    mainCamera.lookAt(orbitState.focusPos);
  } else if (cameraMode === 1) {
    // 2: Driver Cab / Gold Bulldog Hood POV!
    rig.hoodPovCamAnchor.getWorldPosition(_camPos);
    rig.hoodPovLookTarget.getWorldPosition(_camTarget);
    mainCamera.position.copy(_camPos);
    mainCamera.lookAt(_camTarget);
  } else if (cameraMode === 2) {
    // 3: Overhead Drone Spotter View (bridging Trailer & Target Dock Bay)
    const dock = activeYard.dockSpec;
    const midX = (physics.hitchX + dock.x) * 0.5;
    const midZ = (physics.hitchZ + dock.bumperZ) * 0.5;
    _camPos.set(midX, 34.0, midZ + 12.0);
    mainCamera.position.lerp(_camPos, Math.min(1, dt * 6));
    mainCamera.lookAt(midX, 0.5, midZ - 2.0);
  } else {
    // 4: Target Dock Bay Bumper Spotter Cam
    const dock = activeYard.dockSpec;
    mainCamera.position.set(dock.x + 3.6, 3.3, dock.bumperZ + 4.5);
    const s2 = Math.sin(physics.trailerTheta);
    const c2 = Math.cos(physics.trailerTheta);
    mainCamera.lookAt(physics.hitchX - 9.0 * s2, 1.8, physics.hitchZ - 9.0 * c2);
  }

  // Apply impact camera shake if colliding
  if (cameraShake > 0.001) {
    mainCamera.position.x += (Math.random() - 0.5) * cameraShake;
    mainCamera.position.y += (Math.random() - 0.5) * cameraShake;
    cameraShake = Math.max(0, cameraShake - dt * 1.8);
  }
}

// ============================================================================
// HUD TELEMETRY UPDATER
// ============================================================================
const elDist = document.getElementById('hud-dist');
const elLat = document.getElementById('hud-lat');
const elAng = document.getElementById('hud-angle');
const elTime = document.getElementById('hud-time');
const elStrikes = document.getElementById('hud-strikes');
const elSpeed = document.getElementById('hud-speed');
const elGear = document.getElementById('hud-gear');
const elRpmFill = document.getElementById('hud-rpm-fill');
const elParkBadge = document.getElementById('hud-park-badge');
const elSteerSvg = document.getElementById('hud-steering-svg');
const elSteerDeg = document.getElementById('hud-steer-deg');
const elHitchTractor = document.getElementById('hud-hitch-tractor');
const elHitchDeg = document.getElementById('hud-hitch-deg');

function setMetricClass(el, ok, close) {
  el.classList.remove('good', 'warn', 'bad');
  el.classList.add(ok ? 'good' : close ? 'warn' : 'bad');
}

function updateHUD(alignment) {
  const cfg = activeYard.config;

  elDist.textContent = `${alignment.bumperGap.toFixed(2)} m`;
  setMetricClass(elDist, alignment.distOk, alignment.bumperGap < 4.5);

  const latSign = alignment.lateralOffset > 0.02 ? 'L ' : alignment.lateralOffset < -0.02 ? 'R ' : '';
  elLat.textContent = `${latSign}${Math.abs(alignment.lateralOffset).toFixed(2)} m`;
  setMetricClass(elLat, alignment.latOk, Math.abs(alignment.lateralOffset) < cfg.maxLatOffset * 2.2);

  elAng.textContent = `${Math.abs(alignment.angleErrorDeg).toFixed(1)}°`;
  setMetricClass(elAng, alignment.angOk, Math.abs(alignment.angleErrorDeg) < cfg.maxAngleDeg * 2.2);

  elTime.textContent = formatTime(elapsedShiftTime);
  elStrikes.textContent = `${strikes} / ${cfg.maxStrikes}`;
  setMetricClass(elStrikes, strikes === 0, strikes < cfg.maxStrikes);

  // Speedometer (1 m/s = 2.23694 mph)
  const mph = Math.abs(physics.speed) * 2.23694;
  elSpeed.textContent = mph.toFixed(1);

  elGear.textContent = physics.parkBrake && mph < 0.2 ? 'P' : physics.gear;
  elGear.className = 'gear-char';
  if (physics.gear === 'R') elGear.classList.add('gear-r');
  if (physics.gear === 'D') elGear.classList.add('gear-d');

  elRpmFill.style.width = `${Math.round(physics.rpmNorm * 100)}%`;
  elParkBadge.classList.toggle('hidden', !physics.parkBrake);

  // Steering Wheel SVG rotation (multiply road wheel angle by ~12x for realistic steering wheel turns)
  const roadWheelDeg = (physics.steerAngle * 180) / Math.PI;
  const steeringWheelDeg = -roadWheelDeg * 11.5;
  elSteerSvg.style.transform = `rotate(${steeringWheelDeg.toFixed(1)}deg)`;
  elSteerDeg.textContent = `${roadWheelDeg >= 0 ? 'L' : 'R'} ${Math.abs(roadWheelDeg).toFixed(0)}°`;

  // Fifth-Wheel Hitch Articulation SVG
  const hitchDeg = (physics.getArticulationAngle() * 180) / Math.PI;
  // Positive hitchDeg means tractor turned Left (+X), which in top-down SVG (up = forward) is counter-clockwise (-deg in SVG rotate)
  elHitchTractor.setAttribute('transform', `rotate(${(-hitchDeg).toFixed(1)} 40 41)`);
  elHitchDeg.textContent = `HITCH ${Math.abs(hitchDeg).toFixed(0)}°`;
  elHitchDeg.style.color = Math.abs(hitchDeg) > 72 ? '#f87171' : '#94a3b8';
}

// ============================================================================
// RESIZE HANDLER & MAIN ANIMATION LOOP
// ============================================================================
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  mainCamera.aspect = window.innerWidth / window.innerHeight;
  mainCamera.updateProjectionMatrix();
  syncMirrorQuadsToDOM();
});

// Start in Easy Yard behind Main Menu Showcase
loadYardLevel('easy', false);
loadBestScoresUI();

// Expose clean diagnostic state for automated verification & debugging
window.__MACK_SIM__ = {
  getState: () => ({
    phase: gamePhase,
    level: currentLevelKey,
    livery: selectedLivery,
    tractor: { x: physics.tractorX, z: physics.tractorZ, theta: physics.tractorTheta },
    trailer: { hitchX: physics.hitchX, hitchZ: physics.hitchZ, theta: physics.trailerTheta },
    speed: physics.speed,
    gear: physics.gear,
    strikes,
    cameraMode,
    mirrorsVisible,
  }),
  startLevel: (lvl) => loadYardLevel(lvl, true),
};

const clock = new THREE.Clock();
let totalElapsed = 0;

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  totalElapsed += dt;

  if (gamePhase === 'playing' && activeYard) {
    elapsedShiftTime += dt;
    const cfg = activeYard.config;

    const { collisionEvent, airBrakeReleasedEvent } = physics.step(
      dt,
      keys,
      activeYard.obstacles,
      activeYard.cones,
      cfg.softBumpSpeedLimit
    );

    if (airBrakeReleasedEvent) {
      audio.playAirBrake();
    }

    if (collisionEvent) {
      if (collisionEvent.type === 'dock_kiss') {
        audio.playDockKiss();
        cameraShake = 0.07;
        showToastBanner('RUBBER DOCK BUMPERS ENGAGED — HOLD STILL!', 'ok', 1.5);
      } else if (collisionEvent.type === 'strike') {
        strikes++;
        audio.playCollisionImpact();
        cameraShake = 0.24;
        showToastBanner(`IMPACT: ${collisionEvent.label.toUpperCase()}! (${strikes}/${cfg.maxStrikes})`, 'danger', 2.4);
      } else if (collisionEvent.type === 'cone') {
        showToastBanner('SAFETY CONE CLIPPED!', 'danger', 1.4);
      }
    }

    rig.updateVisuals(dt, {
      tractorX: physics.tractorX,
      tractorZ: physics.tractorZ,
      tractorTheta: physics.tractorTheta,
      hitchX: physics.hitchX,
      hitchZ: physics.hitchZ,
      trailerTheta: physics.trailerTheta,
      steerAngle: physics.steerAngle,
      tractorDistDelta: physics.tractorDistDelta,
      trailerDistDelta: physics.trailerDistDelta,
      braking: physics.braking || physics.parkBrake,
      inReverse: physics.gear === 'R',
      rpmNorm: physics.rpmNorm,
      throttle: physics.throttleAmount,
    });

    const alignment = activeYard.dockSpec ? physics.evaluateDockAlignment(activeYard.dockSpec) : null;
    updateGuideGeometry(alignment && alignment.inZone);
    updateHUD(alignment);

    // Check Jackknife Warning, Dock Hold Lock-In, or Strike Limit
    if (strikes >= cfg.maxStrikes) {
      finishShift(false, alignment);
    } else if (alignment.readyToLock) {
      dockHoldTimer += dt;
      statusBanner.classList.remove('hidden', 'status-danger');
      statusBanner.classList.add('status-ok');
      statusBannerText.textContent = `LOCKING BAY 0${cfg.targetBay} DOCK PLATE...`;
      holdProgressTrack.classList.remove('hidden');
      holdProgressFill.style.width = `${Math.min(100, (dockHoldTimer / DOCK_HOLD_REQUIRED) * 100)}%`;

      if (dockHoldTimer >= DOCK_HOLD_REQUIRED) {
        finishShift(true, alignment);
      }
    } else {
      dockHoldTimer = Math.max(0, dockHoldTimer - dt * 2.0);
      if (alignment.inZone && !alignment.stoppedOk) {
        statusBanner.classList.remove('hidden', 'status-danger');
        statusBanner.classList.add('status-ok');
        statusBannerText.textContent = 'IN DOCK ZONE — BRAKE [SPACE] TO LOCK!';
        holdProgressTrack.classList.add('hidden');
      } else if (Math.abs((physics.getArticulationAngle() * 180) / Math.PI) > 74) {
        statusBanner.classList.remove('hidden', 'status-ok');
        statusBanner.classList.add('status-danger');
        statusBannerText.textContent = '⚠ JACKKNIFE ANGLE WARNING — PULL UP TO STRAIGHTEN!';
        holdProgressTrack.classList.add('hidden');
      } else if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) statusBanner.classList.add('hidden');
      } else {
        statusBanner.classList.add('hidden');
      }
    }

    audio.update(dt, {
      rpmNorm: physics.rpmNorm,
      throttle: physics.throttleAmount,
      inReverse: physics.gear === 'R',
      active: true,
    });
  } else {
    // Menu / Results idle diesel purr & exhaust smoke
    rig.updateVisuals(dt, {
      tractorX: physics.tractorX,
      tractorZ: physics.tractorZ,
      tractorTheta: physics.tractorTheta,
      hitchX: physics.hitchX,
      hitchZ: physics.hitchZ,
      trailerTheta: physics.trailerTheta,
      steerAngle: 0.18,
      tractorDistDelta: 0,
      trailerDistDelta: 0,
      braking: true,
      inReverse: false,
      rpmNorm: 0.14,
      throttle: 0,
    });
    audio.update(dt, { rpmNorm: 0.12, throttle: 0, inReverse: false, active: false });
  }

  if (activeYard) {
    activeYard.updateYardAnimations(dt, totalElapsed);
  }

  updateMainCamera(dt, totalElapsed);

  // 1. Render Dual West Coast Mirrors to RenderTargets when visible in gameplay
  if (gamePhase === 'playing' && mirrorsVisible) {
    guideGroup.visible = false; // keep mirrors authentic without HUD line clutter (or show clean yard!)
    renderer.setRenderTarget(leftMirrorRT);
    renderer.clear();
    renderer.render(scene, rig.leftMirrorCam);

    renderer.setRenderTarget(rightMirrorRT);
    renderer.clear();
    renderer.render(scene, rig.rightMirrorCam);
    renderer.setRenderTarget(null);
    guideGroup.visible = guideVisible;
  }

  // 2. Render Main Viewport
  renderer.autoClear = true;
  renderer.render(scene, mainCamera);

  // 3. Composite West Coast Mirror Glass HUD Quads
  if (gamePhase === 'playing' && mirrorsVisible) {
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(mirrorHudScene, mirrorHudCam);
    renderer.autoClear = true;
  }
}

animate();
