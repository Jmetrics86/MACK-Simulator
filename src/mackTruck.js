import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import {
  createTrailerSideTexture,
  createTrailerRearTexture,
  createMudflapTexture,
} from './textures.js';

export const LIVERIES = {
  red: {
    name: 'Bulldog Crimson',
    cabColor: 0xb80f28,
    stripePrimary: '#c41230',
    stripeSecondary: '#d4af37',
  },
  blackgold: {
    name: 'Black & Gold Pedigree',
    cabColor: 0x161920,
    stripePrimary: '#d4af37',
    stripeSecondary: '#c41230',
  },
  green: {
    name: 'Allentown Forest Metallic',
    cabColor: 0x114b28,
    stripePrimary: '#15803d',
    stripeSecondary: '#d4af37',
  },
  white: {
    name: 'Fleet Pearl White',
    cabColor: 0xedf2f7,
    stripePrimary: '#c41230',
    stripeSecondary: '#1e293b',
  },
};

/**
 * Exact CAD-measured geometric & kinematic constants for the MACK Pioneer Class-8 Tractor
 * + 53' Articulated Dry-Van Trailer (in real-world meters).
 * Forward is +Z. Driver side (Left) is +X. Passenger side (Right) is -X.
 * Origin (0,0,0) of tractorGroup is ground Y=0 directly beneath the rear tandem drive midpoint.
 */
export const RIG_SPECS = {
  tractorWheelbase: 5.2257, // Rear tandem center (z=0) to Mack Pioneer front steer axle (z=+5.2257m)
  wheelRadius: 0.5383, // Exact CAD tire radius of Mack Pioneer wheels
  hitchOffset: -0.06, // Centered inside Mack Pioneer's modeled fifth-wheel plate (y=1.186m)
  trailerWheelbase: 10.2, // Kingpin (z=0) to trailer rear tandem center (z=-10.2m)
  tractorHalfWidth: 1.29, // Body/sleeper fairing half-width (2.58m wide)
  tractorFrontZ: 6.62, // Mack Pioneer aerodynamic front bumper face
  tractorRearZ: -1.66, // Rear chassis/mudflap overhang
  trailerHalfWidth: 1.27,
  trailerFrontZ: 0.78, // Kingpin setback tuned for full aero sleeper swing clearance up to 84°
  trailerRearZ: -12.6, // Trailer rear barn doors / ICC bumper face
};

/**
 * Builds the official MACK Pioneer Tractor (loaded from optimized Meshopt GLB)
 * coupled to the 53' Articulated MACK Dry-Van Trailer.
 */
export function createMackRig(initialLivery = 'red') {
  const livery = LIVERIES[initialLivery] || LIVERIES.red;

  // Shared PBR Materials for Exterior CarPaint, Trailer & Dynamic Lights
  const bodyPaintMat = new THREE.MeshPhysicalMaterial({
    color: livery.cabColor,
    metalness: 0.44,
    roughness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.35,
    side: THREE.DoubleSide,
  });

  const PAINTED_TRIM_MAT_NAMES = new Set([
    'DoorsA_SMATSG',
    'DoorsB_SMATSG',
    'Side_BodyA_SMATSG',
    'Side_BodyB_SMATSG',
    'HoodC_SMATSG',
    'Body_ExtraE_SMATSG',
  ]);
  const tintedTrimMaterials = [];
  const cabWindshieldMeshes = [];

  const goldBulldogMat = new THREE.MeshStandardMaterial({
    color: 0xffcf40,
    metalness: 0.96,
    roughness: 0.13,
    envMapIntensity: 1.55,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.95,
    roughness: 0.1,
  });

  const brushedAlumMat = new THREE.MeshStandardMaterial({
    color: 0xd8e0ea,
    metalness: 0.85,
    roughness: 0.26,
  });

  const chassisBlackMat = new THREE.MeshStandardMaterial({
    color: 0x171a21,
    metalness: 0.35,
    roughness: 0.68,
  });

  const tireRubberMat = new THREE.MeshStandardMaterial({
    color: 0x181a1e,
    metalness: 0.05,
    roughness: 0.86,
  });

  const amberMarkerMat = new THREE.MeshStandardMaterial({
    color: 0xff9f1c,
    emissive: 0xff8800,
    emissiveIntensity: 1.4,
    roughness: 0.25,
  });

  const headlightEmissiveMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff5dc,
    emissiveIntensity: 1.9,
    roughness: 0.12,
  });

  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    emissive: 0xff1122,
    emissiveIntensity: 0.45,
    roughness: 0.25,
  });

  const reverseLightMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0xffffff,
    emissiveIntensity: 0.0,
    roughness: 0.2,
  });

  const mudflapTex = createMudflapTexture();
  const mudflapMat = new THREE.MeshStandardMaterial({
    map: mudflapTex,
    roughness: 0.82,
    side: THREE.DoubleSide,
  });

  // ============================================================================
  // 1. MACK PIONEER TRACTOR GROUP (Loaded & Rigged from mack_pioneer.glb)
  // ============================================================================
  const tractorGroup = new THREE.Group();
  tractorGroup.name = 'MackPioneerTractor';

  const rollingWheels = [];
  const frontSteerPivots = [];
  let modelLoaded = false;

  // Real Three.js SpotLight beams aligned to Mack Pioneer's exact CAD LED projector housings (z=+6.16m, y=0.78m)
  const headlightSpots = [];
  for (const sx of [-0.94, 0.94]) {
    const spot = new THREE.SpotLight(0xfff6e0, 0, 52, Math.PI / 5.0, 0.45, 1.25);
    spot.position.set(sx, 0.78, 6.18);
    spot.target.position.set(sx * 0.82, 0.18, 25.0);
    tractorGroup.add(spot);
    tractorGroup.add(spot.target);
    headlightSpots.push(spot);
  }

  let resolveReady;
  const readyPromise = new Promise((res) => {
    resolveReady = res;
  });

  // Load Official Optimized MACK Pioneer GLB!
  const gltfLoader = new GLTFLoader();
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  gltfLoader.load(
    '/models/mack_pioneer.glb',
    (gltf) => {
      const pioneerRoot = gltf.scene;
      pioneerRoot.name = 'MackPioneerGLTF';

      const wheelNodes = [];
      const upgradedTrimCache = new Map();

      const cabGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0x091019,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.38,
        transparent: true,
        opacity: 0.78,
        envMapIntensity: 1.35,
        side: THREE.DoubleSide,
      });

      const sleeperGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0x070c14,
        metalness: 0.12,
        roughness: 0.06,
        transparent: true,
        opacity: 0.88,
        envMapIntensity: 1.4,
        side: THREE.DoubleSide,
      });

      pioneerRoot.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;

          const matName = obj.material ? obj.material.name : '';
          if (matName === 'CarPaint_SMATSG') {
            obj.material = bodyPaintMat;
          } else if (PAINTED_TRIM_MAT_NAMES.has(matName)) {
            let upg = upgradedTrimCache.get(matName);
            if (!upg) {
              const src = obj.material;
              upg = new THREE.MeshPhysicalMaterial({
                color: bodyPaintMat.color.clone(),
                map: src.map || null,
                roughnessMap: src.roughnessMap || null,
                metalnessMap: src.metalnessMap || null,
                metalness: src.metalnessMap ? 1.0 : 0.42,
                roughness: src.roughnessMap ? 1.0 : 0.22,
                clearcoat: 1.0,
                clearcoatRoughness: 0.07,
                envMapIntensity: 1.35,
                side: THREE.DoubleSide,
              });
              upgradedTrimCache.set(matName, upg);
              tintedTrimMaterials.push(upg);
            }
            obj.material = upg;
          } else if (obj.name === 'Mack_Bulldog_Ornament') {
            obj.material = goldBulldogMat;
          } else if (obj.name === 'Mack_Headlights_Emissive') {
            obj.material = headlightEmissiveMat;
          } else if (obj.name === 'Mack_Rear_TailLights') {
            obj.material = brakeLightMat;
          } else if (obj.name === 'Mack_Cab_Windshield' || matName === 'Windshield_Glass_SMATSG') {
            obj.material = cabGlassMat;
            obj.castShadow = false;
            cabWindshieldMeshes.push(obj);
          } else if (matName === 'Windshield_Glass_SMAT1SG') {
            obj.material = sleeperGlassMat;
            obj.castShadow = false;
          } else if (matName === 'headLight_Glass_SMatSG') {
            obj.material = new THREE.MeshPhysicalMaterial({
              color: 0xf8fafc,
              metalness: 0.05,
              roughness: 0.04,
              transmission: 0.72,
              transparent: true,
              opacity: 0.35,
              envMapIntensity: 1.6,
            });
            obj.castShadow = false;
          }
        }

        if (obj.name && obj.name.startsWith('Wheel_')) {
          wheelNodes.push(obj);
        }
      });

      // Rig Front Steerable Hubs (Wheel_FL, Wheel_FR) & Rear Tandem Rolling Hubs (Wheel_CL, Wheel_CR, Wheel_RL, Wheel_RR)
      for (const wNode of wheelNodes) {
        if (wNode.name === 'Wheel_FL' || wNode.name === 'Wheel_FR') {
          const steerPivot = new THREE.Group();
          steerPivot.name = `${wNode.name}_SteerPivot`;
          steerPivot.position.copy(wNode.position);
          wNode.parent.add(steerPivot);
          wNode.position.set(0, 0, 0);
          steerPivot.add(wNode);
          frontSteerPivots.push(steerPivot);
          rollingWheels.push(wNode);
        } else {
          rollingWheels.push(wNode);
        }
      }

      tractorGroup.add(pioneerRoot);
      modelLoaded = true;
      resolveReady(true);
    },
    undefined,
    (err) => {
      console.error('Failed to load mack_pioneer.glb:', err);
      resolveReady(false);
    }
  );

  // Fine-tuned Mirror Cameras mounted at Mack Pioneer's aero door mirror pods (x=±1.58, y=2.18, z=4.55)
  // Angled ~8.5° outward so the sleeper edge occupies a crisp ~11% inner reference sliver & 89% shows the dock alley!
  const leftMirrorCam = new THREE.PerspectiveCamera(38, 0.75, 0.4, 160);
  leftMirrorCam.position.set(1.58, 2.18, 4.55);
  leftMirrorCam.lookAt(5.0, 1.55, -18.0);
  tractorGroup.add(leftMirrorCam);

  const rightMirrorCam = new THREE.PerspectiveCamera(38, 0.75, 0.4, 160);
  rightMirrorCam.position.set(-1.58, 2.18, 4.55);
  rightMirrorCam.lookAt(-5.0, 1.55, -18.0);
  tractorGroup.add(rightMirrorCam);

  // Driver Command Cab / Gold Bulldog Hood POV Camera (elevated air-ride seat view over wipers, sculpted hood & Gold Bulldog!)
  const hoodPovCamAnchor = new THREE.Object3D();
  hoodPovCamAnchor.position.set(0.44, 2.51, 4.22);
  tractorGroup.add(hoodPovCamAnchor);

  const hoodPovLookTarget = new THREE.Object3D();
  hoodPovLookTarget.position.set(0.02, 1.72, 15.5);
  tractorGroup.add(hoodPovLookTarget);

  // Clean Under-Chassis Exhaust Diffuser Anchor (matching Mack Pioneer's modern aero exhaust routing)
  const exhaustAnchor = new THREE.Object3D();
  exhaustAnchor.position.set(-0.58, 0.42, 0.95);
  tractorGroup.add(exhaustAnchor);

  // ============================================================================
  // 2. 53-FOOT ARTICULATED MACK DRY-VAN TRAILER GROUP
  // Origin (0,0,0) at ground Y=0 directly beneath the Fifth-Wheel Kingpin!
  // ============================================================================
  const trailerGroup = new THREE.Group();
  trailerGroup.name = 'MackTrailer';

  // Helper for Trailer Dual Tandem Wheels
  const tireGeo = new THREE.CylinderGeometry(0.53, 0.53, 0.31, 26);
  tireGeo.rotateZ(Math.PI / 2);
  const rimOuterGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.325, 22);
  rimOuterGeo.rotateZ(Math.PI / 2);
  const hubCapGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.35, 14);
  hubCapGeo.rotateZ(Math.PI / 2);
  const lugNutGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.34, 8);
  lugNutGeo.rotateZ(Math.PI / 2);

  function createTrailerDualWheel() {
    const wg = new THREE.Group();
    for (const ox of [-0.18, 0.18]) {
      const tire = new THREE.Mesh(tireGeo, tireRubberMat);
      tire.position.x = ox;
      tire.castShadow = true;
      tire.receiveShadow = true;
      wg.add(tire);

      const rim = new THREE.Mesh(rimOuterGeo, chromeMat);
      rim.position.x = ox;
      wg.add(rim);

      const hub = new THREE.Mesh(hubCapGeo, chassisBlackMat);
      hub.position.x = ox;
      wg.add(hub);

      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2;
        const lug = new THREE.Mesh(lugNutGeo, chromeMat);
        lug.position.set(ox, Math.sin(ang) * 0.21, Math.cos(ang) * 0.21);
        wg.add(lug);
      }
    }
    return wg;
  }

  const trailerSideTex = createTrailerSideTexture(livery.stripePrimary, livery.stripeSecondary);
  const trailerRearTex = createTrailerRearTexture();

  const trailerSideMat = new THREE.MeshStandardMaterial({
    map: trailerSideTex,
    metalness: 0.25,
    roughness: 0.38,
  });

  const trailerCapMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.35,
    roughness: 0.35,
  });

  const trailerRearMat = new THREE.MeshStandardMaterial({
    map: trailerRearTex,
    metalness: 0.3,
    roughness: 0.4,
  });

  // Lower rub-rail sits at y=1.19m (flush atop Mack Pioneer's fifth wheel at y=1.186m!), roof at y=4.05m (matching Pioneer roof fairing height 4.058m!)
  const trailerLength = RIG_SPECS.trailerFrontZ - RIG_SPECS.trailerRearZ; // 13.38m
  const trailerCenterZ = (RIG_SPECS.trailerFrontZ + RIG_SPECS.trailerRearZ) * 0.5; // -5.91m
  const trailerBoxHeight = 2.86;
  const trailerBoxCenterY = 1.19 + trailerBoxHeight * 0.5;

  const trailerBody = new THREE.Mesh(
    new THREE.BoxGeometry(RIG_SPECS.trailerHalfWidth * 2, trailerBoxHeight, trailerLength),
    [
      trailerSideMat,
      trailerSideMat,
      trailerCapMat,
      chassisBlackMat,
      trailerCapMat,
      trailerRearMat,
    ]
  );
  trailerBody.position.set(0, trailerBoxCenterY, trailerCenterZ);
  trailerBody.castShadow = true;
  trailerBody.receiveShadow = true;
  trailerGroup.add(trailerBody);

  // Kingpin bolster plate & front gladhand socket box
  const kingpinPin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 12), chassisBlackMat);
  kingpinPin.position.set(0, 1.13, 0);
  trailerGroup.add(kingpinPin);

  const gladhandBox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.12), brushedAlumMat);
  gladhandBox.position.set(0, 1.66, RIG_SPECS.trailerFrontZ + 0.04);
  trailerGroup.add(gladhandBox);

  // Retracted Heavy Steel Landing Gear Legs
  for (const sx of [-0.88, 0.88]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.84, 0.14), chassisBlackMat);
    leg.position.set(sx, 0.82, -2.65);
    trailerGroup.add(leg);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.28), chassisBlackMat);
    shoe.position.set(sx, 0.41, -2.65);
    trailerGroup.add(shoe);
  }

  // Aerodynamic Trailer Side Skirts matching the Mack Pioneer's aero profile!
  for (const sx of [-1.18, 1.18]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.54, 5.4), trailerCapMat);
    skirt.position.set(sx, 0.86, -6.1);
    skirt.castShadow = true;
    trailerGroup.add(skirt);
  }

  // Trailer Sliding Tandem Bogie Frame & Dual Axles
  const bogieSubframe = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.24, 2.4), chassisBlackMat);
  bogieSubframe.position.set(0, 0.96, -RIG_SPECS.trailerWheelbase);
  trailerGroup.add(bogieSubframe);

  const trailerRollingWheels = [];
  for (const tz of [-9.55, -10.85]) {
    const tAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.0, 12), chassisBlackMat);
    tAxle.rotation.z = Math.PI / 2;
    tAxle.position.set(0, 0.53, tz);
    trailerGroup.add(tAxle);

    for (const sx of [-0.96, 0.96]) {
      const tw = createTrailerDualWheel();
      tw.position.set(sx, 0.53, tz);
      trailerGroup.add(tw);
      trailerRollingWheels.push(tw);
    }
  }

  // Trailer Rear Mudflaps
  for (const sx of [-0.96, 0.96]) {
    const tFlap = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.64), mudflapMat);
    tFlap.position.set(sx, 0.46, -11.55);
    tFlap.rotation.y = Math.PI;
    trailerGroup.add(tFlap);
  }

  // Heavy Steel ICC Rear Underride Guard Bumper + Brake / Reverse / Clearance Lamps
  const iccVertLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.66, 0.12), chassisBlackMat);
  iccVertLeft.position.set(-0.88, 0.9, RIG_SPECS.trailerRearZ + 0.08);
  const iccVertRight = iccVertLeft.clone();
  iccVertRight.position.x = 0.88;
  const iccCrossbar = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.16, 0.14), brushedAlumMat);
  iccCrossbar.position.set(0, 0.58, RIG_SPECS.trailerRearZ + 0.04);
  trailerGroup.add(iccVertLeft, iccVertRight, iccCrossbar);

  for (const lx of [-1.02, -0.82, 0.82, 1.02]) {
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.04), brakeLightMat);
    bl.position.set(lx, 1.15, RIG_SPECS.trailerRearZ - 0.01);
    trailerGroup.add(bl);
  }
  for (const rx of [-0.58, 0.58]) {
    const rl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.04), reverseLightMat);
    rl.position.set(rx, 1.15, RIG_SPECS.trailerRearZ - 0.01);
    trailerGroup.add(rl);
  }

  for (const sx of [-1.275, 1.275]) {
    const frontCornerMarker = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.14), amberMarkerMat);
    frontCornerMarker.position.set(sx, 3.95, RIG_SPECS.trailerFrontZ - 0.22);
    trailerGroup.add(frontCornerMarker);

    const midMarker = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.16), amberMarkerMat);
    midMarker.position.set(sx, 1.24, -5.8);
    trailerGroup.add(midMarker);

    const rearCornerMarker = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.16), brakeLightMat);
    rearCornerMarker.position.set(sx, 1.24, RIG_SPECS.trailerRearZ + 0.22);
    trailerGroup.add(rearCornerMarker);

    const rearTopCorner = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.14), brakeLightMat);
    rearTopCorner.position.set(sx, 3.95, RIG_SPECS.trailerRearZ + 0.22);
    trailerGroup.add(rearTopCorner);
  }

  // ============================================================================
  // 3. DYNAMIC FLEXING AIR / ABS GLADHAND HOSES (Red Emergency & Blue Service)
  // ============================================================================
  const hoseGroup = new THREE.Group();
  const redHoseMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
  const blueHoseMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.45 });

  const redHoseLine = new THREE.Mesh(new THREE.BufferGeometry(), redHoseMat);
  const blueHoseLine = new THREE.Mesh(new THREE.BufferGeometry(), blueHoseMat);
  hoseGroup.add(redHoseLine, blueHoseLine);

  const cabTenderLocal = new THREE.Vector3(0, 1.88, 1.38);
  const trailerNoseLocal = new THREE.Vector3(0, 1.66, RIG_SPECS.trailerFrontZ + 0.04);
  const _pA = new THREE.Vector3();
  const _pB = new THREE.Vector3();
  const _pMid = new THREE.Vector3();

  function updateGladhandHoses() {
    tractorGroup.localToWorld(_pA.copy(cabTenderLocal));
    trailerGroup.localToWorld(_pB.copy(trailerNoseLocal));
    _pMid.lerpVectors(_pA, _pB, 0.5);
    _pMid.y -= 0.34;

    const curveRed = new THREE.QuadraticBezierCurve3(
      _pA.clone().add(new THREE.Vector3(0.11, 0, 0)),
      _pMid.clone().add(new THREE.Vector3(0.09, 0, 0)),
      _pB.clone().add(new THREE.Vector3(0.09, 0, 0))
    );
    const curveBlue = new THREE.QuadraticBezierCurve3(
      _pA.clone().add(new THREE.Vector3(-0.11, 0, 0)),
      _pMid.clone().add(new THREE.Vector3(-0.09, 0, 0)),
      _pB.clone().add(new THREE.Vector3(-0.09, 0, 0))
    );

    redHoseLine.geometry.dispose();
    redHoseLine.geometry = new THREE.TubeGeometry(curveRed, 10, 0.02, 6, false);

    blueHoseLine.geometry.dispose();
    blueHoseLine.geometry = new THREE.TubeGeometry(curveBlue, 10, 0.02, 6, false);
  }

  // ============================================================================
  // 4. SUBTLE UNDER-CHASSIS CLEAN DIESEL EXHAUST VAPOR (Under-Frame Diffuser)
  // ============================================================================
  const smokeGroup = new THREE.Group();
  const smokeGeo = new THREE.SphereGeometry(0.11, 8, 8);
  const smokeParticles = [];
  for (let i = 0; i < 18; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const m = new THREE.Mesh(smokeGeo, mat);
    m.visible = false;
    smokeGroup.add(m);
    smokeParticles.push({
      mesh: m,
      life: 0,
      maxLife: 0.7,
      vel: new THREE.Vector3(),
    });
  }
  let smokeCursor = 0;
  let smokeTimer = 0;
  const _exPos = new THREE.Vector3();

  function updateExhaustSmoke(dt, throttle) {
    if (throttle > 0.15) {
      smokeTimer += dt;
      if (smokeTimer >= 0.09) {
        smokeTimer = 0;
        const p = smokeParticles[smokeCursor];
        smokeCursor = (smokeCursor + 1) % smokeParticles.length;
        exhaustAnchor.getWorldPosition(_exPos);
        p.mesh.position.copy(_exPos);
        p.mesh.scale.setScalar(0.5);
        p.mesh.visible = true;
        p.life = 0;
        p.maxLife = 0.6 + Math.random() * 0.3;
        p.vel.set((Math.random() - 0.5) * 0.4, 0.35 + throttle * 0.4, (Math.random() - 0.5) * 0.4);
      }
    }

    for (const p of smokeParticles) {
      if (!p.mesh.visible) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
        continue;
      }
      const t = p.life / p.maxLife;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(0.5 + t * 1.4);
      p.mesh.material.opacity = (1 - t) * 0.12 * (0.4 + throttle);
    }
  }

  // ============================================================================
  // PUBLIC RIG CONTROLLER API
  // ============================================================================
  let headlightsEnabled = false;

  function setHeadlights(on) {
    headlightsEnabled = on;
    headlightEmissiveMat.emissiveIntensity = on ? 3.5 : 1.3;
    for (const spot of headlightSpots) {
      spot.intensity = on ? 60 : 0;
    }
  }

  function setLivery(liveryKey) {
    const lv = LIVERIES[liveryKey] || LIVERIES.red;
    bodyPaintMat.color.setHex(lv.cabColor);
    for (const tm of tintedTrimMaterials) {
      tm.color.setHex(lv.cabColor);
    }
    const newSideTex = createTrailerSideTexture(lv.stripePrimary, lv.stripeSecondary);
    if (trailerSideMat.map) trailerSideMat.map.dispose();
    trailerSideMat.map = newSideTex;
    trailerSideMat.needsUpdate = true;
  }

  function setCabWindshieldVisible(visible) {
    for (const m of cabWindshieldMeshes) {
      m.visible = visible;
    }
  }

  function updateVisuals(dt, state) {
    const {
      tractorX,
      tractorZ,
      tractorTheta,
      hitchX,
      hitchZ,
      trailerTheta,
      steerAngle,
      tractorDistDelta,
      trailerDistDelta,
      braking,
      inReverse,
      throttle,
    } = state;

    tractorGroup.position.set(tractorX, 0, tractorZ);
    tractorGroup.rotation.y = tractorTheta;

    trailerGroup.position.set(hitchX, 0, hitchZ);
    trailerGroup.rotation.y = trailerTheta;

    tractorGroup.updateMatrixWorld(true);
    trailerGroup.updateMatrixWorld(true);

    // Steer official Mack Pioneer front wheels around their exact hub centers
    for (const pivot of frontSteerPivots) {
      pivot.rotation.y = steerAngle;
    }

    // Roll Mack Pioneer wheels (radius = 0.5383m) & Trailer wheels (radius = 0.53m)
    const tractorSpin = tractorDistDelta / RIG_SPECS.wheelRadius;
    for (const w of rollingWheels) {
      w.rotation.x += tractorSpin;
    }
    const trailerSpin = trailerDistDelta / 0.53;
    for (const tw of trailerRollingWheels) {
      tw.rotation.x += trailerSpin;
    }

    // Brake & Reverse Lamps
    brakeLightMat.emissiveIntensity = braking ? 3.4 : headlightsEnabled ? 1.1 : 0.45;
    reverseLightMat.emissiveIntensity = inReverse ? 3.2 : 0.0;

    updateGladhandHoses();
    updateExhaustSmoke(dt, throttle);
  }

  return {
    tractorGroup,
    trailerGroup,
    hoseGroup,
    smokeGroup,
    leftMirrorCam,
    rightMirrorCam,
    hoodPovCamAnchor,
    hoodPovLookTarget,
    setHeadlights,
    isHeadlightsOn: () => headlightsEnabled,
    isModelLoaded: () => modelLoaded,
    readyPromise,
    setLivery,
    setCabWindshieldVisible,
    updateVisuals,
  };
}
