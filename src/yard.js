import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  createAsphaltTextures,
  createBaySignTexture,
  createApronNumberTexture,
  createWarehouseWallTexture,
  createParkedTrailerTexture,
  createTrailerRearTexture,
} from './textures.js';
import { makeOBB } from './physics.js';

export const DIFFICULTY_CONFIGS = {
  easy: {
    id: 'easy',
    badge: 'LEVEL 1 • ROOKIE',
    title: 'OFFSET BAY BACK',
    envMode: 'day',
    wetAsphalt: false,
    targetBay: 4, // x = -2.5m
    startPose: {
      x: 2.3,
      z: 10.5,
      tractorTheta: 0.0,
      trailerTheta: 0.0,
    },
    parkedBays: [
      { bay: 1, brand: 'KEYSTONE LOGISTICS', color: '#1d4ed8' },
      { bay: 6, brand: 'LEHIGH VALLEY FREIGHT', color: '#0f766e' },
    ],
    maxLatOffset: 0.65,
    maxAngleDeg: 6.5,
    maxBumperGap: 1.15,
    softBumpSpeedLimit: 1.5,
    maxStrikes: 3,
    parTime: 95,
    defaultGuide: true,
    autoHeadlights: false,
    barriers: [
      { x: 18.5, z: 16.0, rot: 0.35 },
      { x: -18.5, z: 16.0, rot: -0.35 },
    ],
    crateClusters: [
      { x: 17.5, z: -22.0, rot: 0.1 },
      { x: -17.5, z: -22.0, rot: -0.15 },
    ],
    cones: [
      { x: -4.35, z: -13.5 },
      { x: -0.65, z: -13.5 },
      { x: 4.5, z: -2.0 },
    ],
    useTargetBollards: false,
  },

  medium: {
    id: 'medium',
    badge: 'LEVEL 2 • PRO CDL',
    title: '45° SIGHT-SIDE ALLEY DOCK',
    envMode: 'dusk',
    wetAsphalt: false,
    targetBay: 3, // x = +2.5m (flanked by Bay 02 & Bay 04!)
    startPose: {
      x: 11.2,
      z: 3.8,
      tractorTheta: 0.78,
      trailerTheta: 0.56,
    },
    parkedBays: [
      { bay: 2, brand: 'ALLENTOWN EXPRESS', color: '#b45309' },
      { bay: 4, brand: 'BULLDOG INTERMODAL', color: '#1d4ed8' },
      { bay: 6, brand: 'PENN HEAVY HAUL', color: '#4338ca' },
    ],
    maxLatOffset: 0.45,
    maxAngleDeg: 4.5,
    maxBumperGap: 0.85,
    softBumpSpeedLimit: 1.15,
    maxStrikes: 2,
    parTime: 125,
    defaultGuide: true,
    autoHeadlights: true,
    barriers: [
      // Forward jersey barrier line limiting infinite straight pull-ups
      { x: -4.5, z: 16.8, rot: 0 },
      { x: -0.5, z: 16.8, rot: 0 },
      { x: 3.5, z: 16.8, rot: 0 },
      { x: 7.5, z: 16.8, rot: 0.08 },
      { x: -13.5, z: 10.5, rot: 0.55 },
    ],
    crateClusters: [
      { x: 11.8, z: 16.2, rot: 0.2 },
      { x: -9.5, z: 15.5, rot: -0.2 },
    ],
    cones: [
      { x: 4.35, z: -13.8 },
      { x: 0.65, z: -13.8 },
      { x: 9.2, z: -8.5 },
      { x: -3.8, z: 6.5 },
    ],
    useTargetBollards: false,
  },

  hard: {
    id: 'hard',
    badge: 'LEVEL 3 • BULLDOG MASTER',
    title: '90° BLIND-SIDE NIGHT YARD',
    envMode: 'night',
    wetAsphalt: true,
    targetBay: 2, // x = +7.5m (flanked by Bay 01 & Bay 03!)
    startPose: {
      x: -1.4,
      z: -3.1,
      tractorTheta: -1.48,
      trailerTheta: -1.53,
    },
    parkedBays: [
      { bay: 1, brand: 'MACK REGIONAL FLEET', color: '#991b1b' },
      { bay: 3, brand: 'TITAN STEEL TRANSIT', color: '#1e40af' },
      { bay: 5, brand: 'ATLANTIC CARRIERS', color: '#065f46' },
    ],
    maxLatOffset: 0.3,
    maxAngleDeg: 3.0,
    maxBumperGap: 0.6,
    softBumpSpeedLimit: 0.95,
    maxStrikes: 2,
    parTime: 165,
    defaultGuide: false,
    autoHeadlights: true,
    barriers: [
      // Tight yard constriction wall & blind-side cargo island
      { x: 10.0, z: 13.8, rot: 0 },
      { x: 6.0, z: 13.8, rot: 0 },
      { x: 2.0, z: 13.8, rot: 0 },
      { x: -2.0, z: 13.8, rot: -0.1 },
      { x: 16.8, z: 4.5, rot: Math.PI / 2 },
      { x: 16.8, z: 0.5, rot: Math.PI / 2 },
    ],
    crateClusters: [
      { x: 14.2, z: 11.5, rot: 0.35 },
      { x: -7.5, z: 12.2, rot: -0.25 },
      { x: -16.5, z: -6.0, rot: 0.12 },
    ],
    cones: [
      { x: 14.5, z: -2.5 },
      { x: 4.8, z: 8.5 },
      { x: -6.2, z: 5.5 },
      { x: 9.45, z: -13.8 },
      { x: 5.55, z: -13.8 },
    ],
    useTargetBollards: true,
  },
};

// Bay X coordinates (6 bays spaced 5.0m apart along warehouse wall at z = -28.0)
export const BAY_X_COORDS = {
  1: 12.5,
  2: 7.5,
  3: 2.5,
  4: -2.5,
  5: -7.5,
  6: -12.5,
};

const BUMPER_Z = -28.0;
const WALL_Z = -28.26;

/**
 * Cache for CC0 Poly Haven 3D glTF models so switching levels is instantaneous.
 */
const cc0AssetCache = {
  loaded: false,
  loadingPromise: null,
  barrier: null,
  barrel: null,
  crate: null,
};

function normalizeGLTFModel(root, targetSizeVec) {
  const clone = root.clone(true);
  clone.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(clone);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // Uniform or axis-fit scale
  const sx = targetSizeVec.x / Math.max(0.01, size.x);
  const sy = targetSizeVec.y / Math.max(0.01, size.y);
  const sz = targetSizeVec.z / Math.max(0.01, size.z);
  const s = Math.min(sx, sy, sz);

  const wrapper = new THREE.Group();
  clone.scale.setScalar(s);
  clone.position.set(-center.x * s, -box.min.y * s, -center.z * s);
  clone.traverse((ch) => {
    if (ch.isMesh) {
      ch.castShadow = true;
      ch.receiveShadow = true;
    }
  });
  wrapper.add(clone);
  return wrapper;
}

function loadCC0YardAssets() {
  if (cc0AssetCache.loadingPromise) return cc0AssetCache.loadingPromise;
  const loader = new GLTFLoader();

  const loadOne = (url) =>
    new Promise((resolve) => {
      loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        () => resolve(null)
      );
    });

  cc0AssetCache.loadingPromise = Promise.all([
    loadOne('/models/concrete_road_barrier/concrete_road_barrier.gltf'),
    loadOne('/models/Barrel_01/Barrel_01.gltf'),
    loadOne('/models/wooden_crate_01/wooden_crate_01.gltf'),
  ]).then(([barrierScene, barrelScene, crateScene]) => {
    if (barrierScene) {
      cc0AssetCache.barrier = normalizeGLTFModel(barrierScene, new THREE.Vector3(3.2, 0.98, 0.68));
    }
    if (barrelScene) {
      cc0AssetCache.barrel = normalizeGLTFModel(barrelScene, new THREE.Vector3(0.62, 0.92, 0.62));
    }
    if (crateScene) {
      cc0AssetCache.crate = normalizeGLTFModel(crateScene, new THREE.Vector3(1.15, 1.05, 1.15));
    }
    cc0AssetCache.loaded = true;
    return cc0AssetCache;
  });

  return cc0AssetCache.loadingPromise;
}

/**
 * Builds the complete Freight Distribution Terminal for the selected Difficulty Level.
 */
export function buildTerminalYard(levelKey = 'easy') {
  const cfg = DIFFICULTY_CONFIGS[levelKey] || DIFFICULTY_CONFIGS.easy;
  const yardGroup = new THREE.Group();
  yardGroup.name = `TerminalYard_${cfg.id}`;

  const obstacles = [];
  const cones = [];
  const animatedBeaconMaterials = [];

  // ============================================================================
  // 1. ASPHALT APRON, CONCRETE DOCK PAD & PERIMETER WALLS
  // ============================================================================
  const { colorTex: asphaltColor, roughTex: asphaltRough } = createAsphaltTextures(cfg.wetAsphalt);
  const asphaltMat = new THREE.MeshStandardMaterial({
    map: asphaltColor,
    roughnessMap: asphaltRough,
    roughness: cfg.wetAsphalt ? 0.52 : 0.88,
    metalness: cfg.wetAsphalt ? 0.14 : 0.04,
  });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(92, 86), asphaltMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  yardGroup.add(ground);

  // Concrete Dock Apron Pad right in front of the 6 dock bays
  const concretePad = new THREE.Mesh(
    new THREE.PlaneGeometry(42, 16),
    new THREE.MeshStandardMaterial({
      color: cfg.wetAsphalt ? 0x3f4754 : 0x646e7d,
      roughness: cfg.wetAsphalt ? 0.45 : 0.82,
    })
  );
  concretePad.rotation.x = -Math.PI / 2;
  concretePad.position.set(0, 0.012, -20.2);
  concretePad.receiveShadow = true;
  yardGroup.add(concretePad);

  // Perimeter Security Curbs & Industrial Fence Walls
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.78 });
  const perimeterDefs = [
    { cx: 0, cz: 29.5, hw: 32.0, hl: 0.5, h: 1.2, label: 'North Yard Perimeter Wall' },
    { cx: 31.5, cz: 0, hw: 0.5, hl: 29.5, h: 1.2, label: 'West Yard Perimeter Wall' },
    { cx: -31.5, cz: 0, hw: 0.5, hl: 29.5, h: 1.2, label: 'East Yard Perimeter Wall' },
  ];

  for (const p of perimeterDefs) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(p.hw * 2, p.h, p.hl * 2), curbMat);
    wall.position.set(p.cx, p.h * 0.5, p.cz);
    wall.castShadow = true;
    wall.receiveShadow = true;
    yardGroup.add(wall);
    obstacles.push(makeOBB(p.cx, p.cz, p.hw, p.hl, 0, 'wall', p.label));
  }

  // ============================================================================
  // 2. DISTRIBUTION WAREHOUSE BUILDING & 6 LOADING DOCK BAYS
  // ============================================================================
  const wallTex = createWarehouseWallTexture();
  const warehouseMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    roughness: 0.62,
    metalness: 0.35,
  });
  const dockTrimMat = new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.5 });
  const bumperRubberMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.92 });
  const yellowLineMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xfacc15,
    emissiveIntensity: cfg.envMode === 'night' ? 0.25 : 0.05,
    roughness: 0.6,
  });

  // Main Warehouse Structure (z = -28.26 back to -44.26, width 56m, height 8.4m)
  const warehouseBox = new THREE.Mesh(new THREE.BoxGeometry(56, 8.4, 16), warehouseMat);
  warehouseBox.position.set(0, 4.2, WALL_Z - 8.0);
  warehouseBox.castShadow = true;
  warehouseBox.receiveShadow = true;
  yardGroup.add(warehouseBox);

  // Roof fascia trim + MACK LOGISTICS TERMINAL Signboard
  const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(56.4, 0.55, 0.6), new THREE.MeshStandardMaterial({ color: 0xc41230, roughness: 0.4 }));
  roofTrim.position.set(0, 8.25, WALL_Z + 0.1);
  yardGroup.add(roofTrim);

  // Concrete Dock Platform Ledge (y = 0..1.22m along front face)
  const dockLedge = new THREE.Mesh(
    new THREE.BoxGeometry(56, 1.22, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 })
  );
  dockLedge.position.set(0, 0.61, WALL_Z + 0.12);
  yardGroup.add(dockLedge);

  // Warehouse front wall OBBs (split around Target Bay bumpers so Target Bay gets soft-bumper OBB!)
  const targetX = BAY_X_COORDS[cfg.targetBay];
  // Left wall section (+X side of target bay)
  const leftEdge = 28.0;
  const targetLeftGap = targetX + 1.45;
  if (leftEdge > targetLeftGap) {
    const w = (leftEdge - targetLeftGap) * 0.5;
    obstacles.push(makeOBB(targetLeftGap + w, WALL_Z - 0.5, w, 0.65, 0, 'wall', 'Warehouse Concrete Dock Wall'));
  }
  // Right wall section (-X side of target bay)
  const rightEdge = -28.0;
  const targetRightGap = targetX - 1.45;
  if (targetRightGap > rightEdge) {
    const w = (targetRightGap - rightEdge) * 0.5;
    obstacles.push(makeOBB(rightEdge + w, WALL_Z - 0.5, w, 0.65, 0, 'wall', 'Warehouse Concrete Dock Wall'));
  }
  // Target Bay Rubber Bumpers OBB (kind = 'bumper' -> allows gentle dock kiss!)
  obstacles.push(makeOBB(targetX, BUMPER_Z - 0.15, 1.45, 0.16, 0, 'bumper', `Bay 0${cfg.targetBay} Rubber Bumpers`));

  // Build each of the 6 Dock Bays
  const rollDoorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.4, roughness: 0.5 });
  const openBayDarkMat = new THREE.MeshBasicMaterial({ color: 0x090d14 });

  for (let bay = 1; bay <= 6; bay++) {
    const bx = BAY_X_COORDS[bay];
    const isTarget = bay === cfg.targetBay;

    // Cushion Dock Seal Frame (black insulated foam pads around the 2.8m x 3.0m dock doorway)
    for (const sx of [-1.42, 1.42]) {
      const sideSeal = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.1, 0.34), dockTrimMat);
      sideSeal.position.set(bx + sx, 2.78, WALL_Z + 0.15);
      yardGroup.add(sideSeal);
    }
    const topSeal = new THREE.Mesh(new THREE.BoxGeometry(3.12, 0.32, 0.36), dockTrimMat);
    topSeal.position.set(bx, 4.22, WALL_Z + 0.15);
    yardGroup.add(topSeal);

    // Door opening: Target Bay roll-up door is OPEN with warm interior dock light; others closed corrugated steel
    const doorPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.62, 2.88),
      isTarget ? openBayDarkMat : rollDoorMat
    );
    doorPlane.position.set(bx, 2.68, WALL_Z + 0.03);
    yardGroup.add(doorPlane);

    // Heavy Molded Laminated Rubber Dock Bumpers at y = 1.08m, contact face at z = BUMPER_Z (-28.0)
    for (const sx of [-1.05, 1.05]) {
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.46, 0.28), bumperRubberMat);
      bumper.position.set(bx + sx, 1.05, BUMPER_Z - 0.12);
      yardGroup.add(bumper);
    }

    // Overhead Numbered Bay Sign ("BAY 01" .. "BAY 06")
    const signTex = createBaySignTexture(bay, isTarget);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissiveMap: signTex,
      emissive: isTarget ? 0x22c55e : 0x334155,
      emissiveIntensity: isTarget ? 0.55 : 0.15,
      roughness: 0.4,
    });
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.72), signMat);
    signMesh.position.set(bx, 5.05, WALL_Z + 0.06);
    yardGroup.add(signMesh);

    // Dock Signal Light (Green Flashing for Target Bay, Red for Non-Target Bays)
    const sigColor = isTarget ? 0x22c55e : 0xef4444;
    const dockSignalMat = new THREE.MeshStandardMaterial({
      color: sigColor,
      emissive: sigColor,
      emissiveIntensity: isTarget ? 2.6 : 1.2,
    });
    const dockSignal = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), dockSignalMat);
    dockSignal.position.set(bx + 1.68, 3.65, WALL_Z + 0.22);
    yardGroup.add(dockSignal);
    if (isTarget) animatedBeaconMaterials.push(dockSignalMat);

    // Painted Asphalt Lane Striping extending 14.5m forward from each bay!
    const lineMat = isTarget
      ? new THREE.MeshStandardMaterial({
          color: 0x4ade80,
          emissive: 0x22c55e,
          emissiveIntensity: 0.65,
          roughness: 0.4,
        })
      : yellowLineMat;

    for (const sx of [-1.48, 1.48]) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 14.5), lineMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(bx + sx, 0.02, BUMPER_Z + 7.4);
      yardGroup.add(stripe);
    }

    // Painted Bay Number on Concrete Apron at mouth of bay (upright when viewed from the yard!)
    const apronNumTex = createApronNumberTexture(bay, isTarget);
    const apronNum = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 2.1),
      new THREE.MeshBasicMaterial({ map: apronNumTex, transparent: true, depthWrite: false })
    );
    apronNum.rotation.x = -Math.PI / 2;
    apronNum.position.set(bx, 0.025, BUMPER_Z + 13.4);
    yardGroup.add(apronNum);
  }

  // Pulsing Glowing Target Zone Floor Box & Chevrons inside Target Bay!
  const targetZoneMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  const targetFloorPad = new THREE.Mesh(new THREE.PlaneGeometry(2.76, 13.6), targetZoneMat);
  targetFloorPad.rotation.x = -Math.PI / 2;
  targetFloorPad.position.set(targetX, 0.018, BUMPER_Z + 6.8);
  yardGroup.add(targetFloorPad);
  animatedBeaconMaterials.push(targetZoneMat);

  // Optional Tight Yellow Steel Bollards at Mouth of Target Bay (Hard Mode!)
  if (cfg.useTargetBollards) {
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.3, roughness: 0.4 });
    for (const sx of [-1.92, 1.92]) {
      const bx = targetX + sx;
      const bz = BUMPER_Z + 13.6;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 1.25, 16), bollardMat);
      post.position.set(bx, 0.625, bz);
      post.castShadow = true;
      yardGroup.add(post);
      obstacles.push(makeOBB(bx, bz, 0.16, 0.16, 0, 'obstacle', 'Steel Dock Bollard'));
    }
  }

  // ============================================================================
  // 3. PARKED NEIGHBORING 53' DRY-VAN TRAILERS IN ADJACENT BAYS
  // ============================================================================
  const parkedRearTex = createTrailerRearTexture();
  const parkedRearMat = new THREE.MeshStandardMaterial({ map: parkedRearTex, roughness: 0.45 });
  const parkedCapMat = new THREE.MeshStandardMaterial({ color: 0xdbe2ec, roughness: 0.45 });
  const parkedChassisMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
  const parkedTireMat = new THREE.MeshStandardMaterial({ color: 0x17191d, roughness: 0.88 });

  for (const pb of cfg.parkedBays) {
    const px = BAY_X_COORDS[pb.bay];
    const pLen = 13.5;
    const pCenterZ = BUMPER_Z + pLen * 0.5 + 0.05; // extends from -27.95 to -14.45
    const sideTex = createParkedTrailerTexture(pb.brand, pb.color);
    const sideMat = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.42 });

    const pTrailer = new THREE.Group();
    pTrailer.position.set(px, 0, pCenterZ);

    const box = new THREE.Mesh(new THREE.BoxGeometry(2.52, 2.76, pLen), [
      sideMat,
      sideMat,
      parkedCapMat,
      parkedChassisMat,
      parkedCapMat,
      parkedRearMat,
    ]);
    box.position.y = 2.62;
    box.castShadow = true;
    box.receiveShadow = true;
    pTrailer.add(box);

    // Lowered Landing Gear Legs supporting parked trailer nose
    for (const lx of [-0.9, 0.9]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.24, 0.14), parkedChassisMat);
      leg.position.set(lx, 0.62, pLen * 0.5 - 3.2);
      pTrailer.add(leg);
    }

    // Rear Tandem Wheels
    const wGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.55, 18);
    wGeo.rotateZ(Math.PI / 2);
    for (const wz of [-pLen * 0.5 + 1.9, -pLen * 0.5 + 3.1]) {
      for (const wx of [-0.95, 0.95]) {
        const w = new THREE.Mesh(wGeo, parkedTireMat);
        w.position.set(wx, 0.52, wz);
        w.castShadow = true;
        pTrailer.add(w);
      }
    }

    yardGroup.add(pTrailer);
    obstacles.push(makeOBB(px, pCenterZ, 1.26, pLen * 0.5, 0, 'parked_trailer', `Parked Trailer (Bay 0${pb.bay})`));
  }

  // ============================================================================
  // 4. CC0 POLY HAVEN 3D MODELS (Jersey Barriers, Cargo Crates & Steel Barrels)
  // ============================================================================
  const barrierHolders = [];
  const crateHolders = [];

  const fallbackBarrierMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
  const fallbackCrateMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.82 });
  const fallbackBarrelMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.4, roughness: 0.45 });

  for (const b of cfg.barriers) {
    const holder = new THREE.Group();
    holder.position.set(b.x, 0, b.z);
    holder.rotation.y = b.rot || 0;

    // Immediate procedural jersey barrier (replaced seamlessly by CC0 Poly Haven glTF!)
    const fb = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.92, 0.62), fallbackBarrierMat);
    fb.position.y = 0.46;
    fb.castShadow = true;
    fb.receiveShadow = true;
    holder.add(fb);

    yardGroup.add(holder);
    barrierHolders.push(holder);

    // Note: in local holder frame, width along X is 3.1m (hw=1.55), depth along Z is 0.62m (hl=0.31)
    obstacles.push(makeOBB(b.x, b.z, 1.52, 0.32, b.rot || 0, 'obstacle', 'Concrete Road Barrier'));
  }

  for (const cl of cfg.crateClusters) {
    const holder = new THREE.Group();
    holder.position.set(cl.x, 0, cl.z);
    holder.rotation.y = cl.rot || 0;

    const fbCrate = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.02, 1.15), fallbackCrateMat);
    fbCrate.position.set(-0.45, 0.51, 0);
    fbCrate.castShadow = true;
    const fbBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 16), fallbackBarrelMat);
    fbBarrel.position.set(0.55, 0.45, 0.25);
    fbBarrel.castShadow = true;
    holder.add(fbCrate, fbBarrel);

    yardGroup.add(holder);
    crateHolders.push(holder);

    obstacles.push(makeOBB(cl.x, cl.z, 1.05, 0.75, cl.rot || 0, 'obstacle', 'Freight Crate & Drum Stack'));
  }

  // Upgrade placeholders with real CC0 Poly Haven 3D glTF assets once loaded!
  loadCC0YardAssets().then((cache) => {
    if (cache.barrier) {
      for (const h of barrierHolders) {
        h.clear();
        h.add(cache.barrier.clone(true));
      }
    }
    if (cache.crate || cache.barrel) {
      for (const h of crateHolders) {
        h.clear();
        if (cache.crate) {
          const c1 = cache.crate.clone(true);
          c1.position.set(-0.45, 0, -0.1);
          h.add(c1);
          const c2 = cache.crate.clone(true);
          c2.position.set(-0.42, 1.02, -0.08);
          c2.rotation.y = 0.25;
          c2.scale.setScalar(0.86);
          h.add(c2);
        }
        if (cache.barrel) {
          const b1 = cache.barrel.clone(true);
          b1.position.set(0.58, 0, 0.22);
          h.add(b1);
          const b2 = cache.barrel.clone(true);
          b2.position.set(0.52, 0, -0.42);
          b2.rotation.y = 1.2;
          h.add(b2);
        }
      }
    }
  });

  // ============================================================================
  // 5. KNOCKABLE SAFETY TRAFFIC CONES
  // ============================================================================
  const coneOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xff5a1f,
    emissive: 0xff4500,
    emissiveIntensity: 0.2,
    roughness: 0.45,
  });
  const coneCollarMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xffffff,
    emissiveIntensity: 0.35,
    roughness: 0.25,
  });

  for (const cd of cfg.cones) {
    const cg = new THREE.Group();
    cg.position.set(cd.x, 0, cd.z);

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), dockTrimMat);
    base.position.y = 0.025;
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.72, 14), coneOrangeMat);
    body.position.y = 0.38;
    body.castShadow = true;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 0.16, 14), coneCollarMat);
    collar.position.y = 0.48;
    cg.add(base, body, collar);

    yardGroup.add(cg);
    cones.push({
      x: cd.x,
      z: cd.z,
      mesh: cg,
      knocked: false,
      tipProgress: 0,
      tipDirX: 1,
      tipDirZ: 0,
    });
  }

  // ============================================================================
  // 6. LIGHTING & STADIUM FLOODLIGHT TOWERS (Day / Golden Dusk / Floodlit Night)
  // ============================================================================
  if (cfg.envMode === 'day') {
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x334155, 0.95);
    yardGroup.add(hemi);

    const sun = new THREE.DirectionalLight(0xfffbeb, 2.2);
    sun.position.set(26, 38, 24);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -38;
    sun.shadow.camera.right = 38;
    sun.shadow.camera.top = 38;
    sun.shadow.camera.bottom = -38;
    sun.shadow.camera.near = 4;
    sun.shadow.camera.far = 95;
    sun.shadow.bias = -0.0005;
    yardGroup.add(sun);
  } else if (cfg.envMode === 'dusk') {
    const hemi = new THREE.HemisphereLight(0xfdba74, 0x1e293b, 0.72);
    yardGroup.add(hemi);

    const sun = new THREE.DirectionalLight(0xff9e44, 2.35);
    sun.position.set(-34, 18, 22);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -38;
    sun.shadow.camera.right = 38;
    sun.shadow.camera.top = 38;
    sun.shadow.camera.bottom = -38;
    sun.shadow.camera.near = 4;
    sun.shadow.camera.far = 95;
    sun.shadow.bias = -0.0005;
    yardGroup.add(sun);
  } else {
    // Floodlit Wet-Asphalt Night Shift!
    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x090d16, 0.38);
    yardGroup.add(hemi);

    // Primary Stadium Floodlight Shadow Caster
    const mainFlood = new THREE.DirectionalLight(0xe0f2fe, 1.35);
    mainFlood.position.set(18, 28, 24);
    mainFlood.castShadow = true;
    mainFlood.shadow.mapSize.set(2048, 2048);
    mainFlood.shadow.camera.left = -36;
    mainFlood.shadow.camera.right = 36;
    mainFlood.shadow.camera.top = 36;
    mainFlood.shadow.camera.bottom = -36;
    mainFlood.shadow.camera.near = 4;
    mainFlood.shadow.camera.far = 90;
    mainFlood.shadow.bias = -0.0005;
    yardGroup.add(mainFlood);

    // Warm Dock Canopy Wall Sconces + Target Bay Interior Spotlight
    const dockSpot = new THREE.PointLight(0x4ade80, 14, 18, 1.4);
    dockSpot.position.set(targetX, 3.8, WALL_Z + 1.4);
    yardGroup.add(dockSpot);

    for (const wx of [-15, -5, 5, 15]) {
      const canopyLight = new THREE.PointLight(0xffedd5, 12, 22, 1.5);
      canopyLight.position.set(wx, 6.2, WALL_Z + 1.5);
      yardGroup.add(canopyLight);
    }
  }

  // Physical High-Mast Yard Light Towers around perimeter
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.35 });
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff3c4,
    emissiveIntensity: cfg.envMode === 'day' ? 0.1 : 3.5,
  });

  for (const [tx, tz] of [
    [-26, 26],
    [0, 27.5],
    [26, 26],
  ]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 13.5, 12), poleMat);
    pole.position.set(tx, 6.75, tz);
    yardGroup.add(pole);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 0.55), lampGlowMat);
    head.position.set(tx, 13.4, tz - 0.35);
    head.rotation.x = 0.42;
    yardGroup.add(head);

    if (cfg.envMode !== 'day') {
      const towerPoint = new THREE.PointLight(0xfff7ed, cfg.envMode === 'night' ? 32 : 14, 48, 1.35);
      towerPoint.position.set(tx, 12.8, tz - 1.0);
      yardGroup.add(towerPoint);
    }
  }

  // Target Dock Definition for Physics Alignment Evaluator
  const dockSpec = {
    bayNumber: cfg.targetBay,
    x: targetX,
    bumperZ: BUMPER_Z,
    targetTheta: 0.0,
    maxLatOffset: cfg.maxLatOffset,
    maxAngleDeg: cfg.maxAngleDeg,
    maxBumperGap: cfg.maxBumperGap,
  };

  function updateYardAnimations(dt, elapsed) {
    // Pulse target bay beacon & floor pad
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 4.5);
    if (animatedBeaconMaterials[0]) {
      animatedBeaconMaterials[0].emissiveIntensity = 1.4 + pulse * 2.2;
    }
    if (animatedBeaconMaterials[1]) {
      animatedBeaconMaterials[1].opacity = 0.12 + pulse * 0.16;
    }

    // Tip over knocked traffic cones smoothly
    for (const c of cones) {
      if (c.knocked && c.tipProgress < 1) {
        c.tipProgress = Math.min(1, c.tipProgress + dt * 5.5);
        const angle = c.tipProgress * (Math.PI * 0.47);
        c.mesh.rotation.x = c.tipDirZ * angle;
        c.mesh.rotation.z = -c.tipDirX * angle;
      }
    }
  }

  return {
    config: cfg,
    yardGroup,
    obstacles,
    cones,
    dockSpec,
    updateYardAnimations,
  };
}
