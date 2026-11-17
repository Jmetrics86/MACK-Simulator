import * as THREE from 'three';
import {
  createMackGrilleTexture,
  createTrailerSideTexture,
  createTrailerRearTexture,
  createMudflapTexture,
} from './textures.js';

export const LIVERIES = {
  red: {
    name: 'Bulldog Crimson',
    cabColor: 0xc41230,
    stripePrimary: '#c41230',
    stripeSecondary: '#d4af37',
    fenderColor: 0x9e0e26,
  },
  blackgold: {
    name: 'Black & Gold Pedigree',
    cabColor: 0x181b22,
    stripePrimary: '#d4af37',
    stripeSecondary: '#c41230',
    fenderColor: 0x111318,
  },
  green: {
    name: 'Allentown Forest Metallic',
    cabColor: 0x14532d,
    stripePrimary: '#15803d',
    stripeSecondary: '#d4af37',
    fenderColor: 0x0f3f22,
  },
  white: {
    name: 'Fleet Pearl White',
    cabColor: 0xf1f5f9,
    stripePrimary: '#c41230',
    stripeSecondary: '#1e293b',
    fenderColor: 0xdbe2ec,
  },
};

/**
 * Geometric & kinematic constants for our articulated MACK Class-8 Rig (in meters).
 * Forward is +Z. Driver side (Left) is +X. Passenger side (Right) is -X.
 */
export const RIG_SPECS = {
  tractorWheelbase: 5.2, // Rear tandem center (z=0) to front steer axle (z=+5.2)
  hitchOffset: 0.12, // Fifth wheel kingpin slightly forward of rear tandem center (z=+0.12)
  trailerWheelbase: 10.2, // Kingpin (z=0) to trailer rear tandem center (z=-10.2)
  tractorHalfWidth: 1.25,
  tractorFrontZ: 6.22, // Front bumper face in tractor local Z
  tractorRearZ: -1.52, // Rear chassis tail bar in tractor local Z
  trailerHalfWidth: 1.27,
  trailerFrontZ: 0.92, // Trailer nose ahead of kingpin
  trailerRearZ: -12.6, // Trailer rear doors / ICC bumper face behind kingpin
};

/**
 * Builds the bespoke 3D Iconic MACK Conventional Semi-Truck + 53' Articulated Dry-Van Trailer.
 */
export function createMackRig(initialLivery = 'red') {
  const livery = LIVERIES[initialLivery] || LIVERIES.red;

  // Shared PBR Materials
  const bodyPaintMat = new THREE.MeshPhysicalMaterial({
    color: livery.cabColor,
    metalness: 0.42,
    roughness: 0.24,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });

  const fenderPaintMat = new THREE.MeshPhysicalMaterial({
    color: livery.fenderColor,
    metalness: 0.38,
    roughness: 0.28,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.96,
    roughness: 0.09,
  });

  const brushedAlumMat = new THREE.MeshStandardMaterial({
    color: 0xd8e0ea,
    metalness: 0.85,
    roughness: 0.26,
  });

  const goldBulldogMat = new THREE.MeshStandardMaterial({
    color: 0xffcf40,
    metalness: 0.95,
    roughness: 0.14,
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

  const darkGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    metalness: 0.1,
    roughness: 0.08,
    transmission: 0.35,
    transparent: true,
    opacity: 0.82,
  });

  const amberMarkerMat = new THREE.MeshStandardMaterial({
    color: 0xff9f1c,
    emissive: 0xff8800,
    emissiveIntensity: 1.4,
    roughness: 0.25,
  });

  const headlightLensMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff4d6,
    emissiveIntensity: 1.8,
    roughness: 0.1,
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
  // HELPER: Deep-Dish Chrome Alcoa Wheel + Heavy Radial Tire Builder
  // ============================================================================
  const tireGeo = new THREE.CylinderGeometry(0.53, 0.53, 0.31, 28);
  tireGeo.rotateZ(Math.PI / 2);
  const rimOuterGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.325, 24);
  rimOuterGeo.rotateZ(Math.PI / 2);
  const hubCapGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.35, 16);
  hubCapGeo.rotateZ(Math.PI / 2);
  const lugNutGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.34, 8);
  lugNutGeo.rotateZ(Math.PI / 2);

  function createWheelUnit(isDual = false) {
    const wheelGroup = new THREE.Group();
    const offsets = isDual ? [-0.18, 0.18] : [0];

    for (const ox of offsets) {
      const tire = new THREE.Mesh(tireGeo, tireRubberMat);
      tire.position.x = ox;
      tire.castShadow = true;
      tire.receiveShadow = true;
      wheelGroup.add(tire);

      const rim = new THREE.Mesh(rimOuterGeo, chromeMat);
      rim.position.x = ox;
      wheelGroup.add(rim);

      const hub = new THREE.Mesh(hubCapGeo, chassisBlackMat);
      hub.position.x = ox;
      wheelGroup.add(hub);

      // 8 Chrome Lug Nuts for visual rotation clarity
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2;
        const lug = new THREE.Mesh(lugNutGeo, chromeMat);
        lug.position.set(ox, Math.sin(ang) * 0.21, Math.cos(ang) * 0.21);
        wheelGroup.add(lug);
      }
    }
    return wheelGroup;
  }

  // ============================================================================
  // 1. TRACTOR GROUP (Iconic MACK Super-Liner Conventional)
  // ============================================================================
  const tractorGroup = new THREE.Group();
  tractorGroup.name = 'MackTractor';

  const rollingWheels = [];
  const frontSteerPivots = [];

  // --- Chassis Frame Rails ---
  for (const sx of [-0.43, 0.43]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 7.55), chassisBlackMat);
    rail.position.set(sx, 0.78, 2.32);
    rail.castShadow = true;
    tractorGroup.add(rail);
  }

  // Crossmembers & Rear Tail Bar
  const rearBar = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.18, 0.14), chassisBlackMat);
  rearBar.position.set(0, 0.72, -1.46);
  tractorGroup.add(rearBar);

  // Tractor Rear Brake & Reverse Lights on Tail Bar
  for (const sx of [-0.78, -0.58, 0.58, 0.78]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.05), brakeLightMat);
    tl.position.set(sx, 0.72, -1.54);
    tractorGroup.add(tl);
  }
  for (const sx of [-0.36, 0.36]) {
    const rl = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.05), reverseLightMat);
    rl.position.set(sx, 0.72, -1.54);
    tractorGroup.add(rl);
  }

  // Tractor Mudflaps behind rear tandem wheels
  for (const sx of [-0.95, 0.95]) {
    const flap = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.64), mudflapMat);
    flap.position.set(sx, 0.46, -1.49);
    flap.rotation.y = Math.PI;
    tractorGroup.add(flap);
  }

  // Diamond-Plate Catwalk & Fifth-Wheel Coupling Plate
  const catwalk = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.05, 1.85), brushedAlumMat);
  catwalk.position.set(0, 0.92, 0.55);
  tractorGroup.add(catwalk);

  const fifthWheelBase = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 0.75), chassisBlackMat);
  fifthWheelBase.position.set(0, 0.99, RIG_SPECS.hitchOffset);
  tractorGroup.add(fifthWheelBase);

  const fifthWheelPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.08, 20), chassisBlackMat);
  fifthWheelPlate.position.set(0, 1.1, RIG_SPECS.hitchOffset);
  tractorGroup.add(fifthWheelPlate);

  // Quarter Fenders ahead of front drive axle
  for (const sx of [-1.02, 1.02]) {
    const qf = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.35, 0.12), chromeMat);
    qf.position.set(sx, 0.92, 1.38);
    qf.rotation.x = -0.35;
    tractorGroup.add(qf);
  }

  // --- Axles & Wheels (Steer Axle at z=+5.20, Rear Tandems at z=+0.68 & z=-0.68) ---
  const steerAxleBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 12), chassisBlackMat);
  steerAxleBeam.rotation.z = Math.PI / 2;
  steerAxleBeam.position.set(0, 0.53, RIG_SPECS.tractorWheelbase);
  tractorGroup.add(steerAxleBeam);

  for (const sx of [-1.06, 1.06]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx, 0.53, RIG_SPECS.tractorWheelbase);
    const wheel = createWheelUnit(false);
    pivot.add(wheel);
    tractorGroup.add(pivot);
    frontSteerPivots.push(pivot);
    rollingWheels.push(wheel);
  }

  for (const az of [0.68, -0.68]) {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.95, 12), chassisBlackMat);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(0, 0.53, az);
    tractorGroup.add(axle);

    for (const sx of [-0.95, 0.95]) {
      const dualWheel = createWheelUnit(true);
      dualWheel.position.set(sx, 0.53, az);
      tractorGroup.add(dualWheel);
      rollingWheels.push(dualWheel);
    }
  }

  // --- Polished Cylindrical Aluminum Saddle Fuel Tanks & Cab Entry Steps ---
  const tankGeo = new THREE.CylinderGeometry(0.34, 0.34, 1.68, 24);
  tankGeo.rotateX(Math.PI / 2);
  const strapGeo = new THREE.CylinderGeometry(0.352, 0.352, 0.05, 24);
  strapGeo.rotateX(Math.PI / 2);

  for (const sx of [-0.96, 0.96]) {
    const tank = new THREE.Mesh(tankGeo, brushedAlumMat);
    tank.position.set(sx, 0.72, 2.55);
    tank.castShadow = true;
    tractorGroup.add(tank);

    for (const sz of [1.95, 2.55, 3.15]) {
      const strap = new THREE.Mesh(strapGeo, chromeMat);
      strap.position.set(sx, 0.72, sz);
      tractorGroup.add(strap);
    }

    // Two perforated chrome cab steps ahead of/below door
    for (const [stepY, stepZ] of [
      [0.48, 3.55],
      [0.82, 3.52],
    ]) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.72), chromeMat);
      step.position.set(sx * 1.14, stepY, stepZ);
      tractorGroup.add(step);
    }
  }

  // --- Sculpted Long Conventional MACK Hood & Curved Front Fenders ---
  // Tapered muscular hood built with ExtrudeGeometry side profile + beveled edges
  const hoodShape = new THREE.Shape();
  hoodShape.moveTo(0, 0);
  hoodShape.lineTo(2.42, 0);
  hoodShape.lineTo(2.42, 0.84);
  hoodShape.lineTo(0.15, 0.98);
  hoodShape.lineTo(0, 0.98);
  hoodShape.closePath();

  const cleanHoodGeo = new THREE.ExtrudeGeometry(hoodShape, {
    depth: 1.34,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.06,
    bevelThickness: 0.06,
  });
  cleanHoodGeo.rotateY(-Math.PI / 2);
  cleanHoodGeo.translate(0.67, 0.95, 3.56);

  const hoodMesh = new THREE.Mesh(cleanHoodGeo, bodyPaintMat);
  hoodMesh.castShadow = true;
  hoodMesh.receiveShadow = true;
  tractorGroup.add(hoodMesh);

  // Chrome Center Hood Spine leading to the Bulldog Pedestal
  const hoodSpine = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 2.36), chromeMat);
  hoodSpine.position.set(0, 1.94, 4.76);
  hoodSpine.rotation.x = 0.055;
  tractorGroup.add(hoodSpine);

  // Side Chrome Air-Intake Louvers & MACK Nameplates on Hood Sides
  for (const sx of [-0.74, 0.74]) {
    const louverPlate = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 0.68), chromeMat);
    louverPlate.position.set(sx, 1.56, 4.18);
    tractorGroup.add(louverPlate);

    const sideSpear = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.06, 1.55), goldBulldogMat);
    sideSpear.position.set(sx, 1.54, 4.88);
    tractorGroup.add(sideSpear);
  }

  // Curved Front Wheel-Arch Fenders (Left & Right)
  const fenderShape = new THREE.Shape();
  fenderShape.moveTo(-0.85, 0.0);
  fenderShape.lineTo(-0.72, 0.56);
  fenderShape.quadraticCurveTo(0, 0.82, 0.72, 0.56);
  fenderShape.lineTo(0.84, 0.12);
  fenderShape.lineTo(0.58, 0.12);
  fenderShape.quadraticCurveTo(0, 0.58, -0.58, 0.0);
  fenderShape.closePath();

  const fenderGeo = new THREE.ExtrudeGeometry(fenderShape, {
    depth: 0.48,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.035,
    bevelThickness: 0.035,
  });
  fenderGeo.rotateY(-Math.PI / 2);

  for (const sx of [-1, 1]) {
    const fMesh = new THREE.Mesh(fenderGeo, fenderPaintMat);
    fMesh.position.set(sx > 0 ? 1.22 : -0.74, 0.52, 5.2);
    fMesh.castShadow = true;
    tractorGroup.add(fMesh);

    // Amber turn signal pod atop each front fender
    const sigPod = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.16), amberMarkerMat);
    sigPod.position.set(sx * 0.98, 1.24, 5.32);
    tractorGroup.add(sigPod);
  }

  // --- Iconic Chrome MACK Radiator Grille & Front Bumper ---
  const grilleShell = new THREE.Mesh(new THREE.BoxGeometry(1.44, 1.04, 0.14), chromeMat);
  grilleShell.position.set(0, 1.4, 5.99);
  grilleShell.castShadow = true;
  tractorGroup.add(grilleShell);

  const grilleTex = createMackGrilleTexture();
  const grilleFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.26, 0.88),
    new THREE.MeshStandardMaterial({
      map: grilleTex,
      metalness: 0.65,
      roughness: 0.25,
    })
  );
  grilleFace.position.set(0, 1.4, 6.07);
  tractorGroup.add(grilleFace);

  // Heavy Deep-Drop Polished Chrome Front Bumper
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.42, 0.22), chromeMat);
  frontBumper.position.set(0, 0.64, 6.13);
  frontBumper.castShadow = true;
  tractorGroup.add(frontBumper);

  // Headlight Bezels + Projector Lenses + SpotLight Beams
  const headlightSpots = [];
  for (const sx of [-0.96, 0.96]) {
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.12), chromeMat);
    bezel.position.set(sx, 1.02, 5.96);
    tractorGroup.add(bezel);

    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.15, 0.14), headlightLensMat);
    lens.position.set(sx, 1.02, 5.97);
    tractorGroup.add(lens);

    // Fog lamp in bumper
    const fog = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.05), headlightLensMat);
    fog.position.set(sx * 0.82, 0.62, 6.25);
    tractorGroup.add(fog);

    // Real Three.js SpotLight beam for Dusk & Night modes
    const spot = new THREE.SpotLight(0xfff6e0, 0, 48, Math.PI / 5.2, 0.45, 1.3);
    spot.position.set(sx, 1.02, 6.08);
    spot.target.position.set(sx * 0.8, 0.2, 24.0);
    tractorGroup.add(spot);
    tractorGroup.add(spot.target);
    headlightSpots.push(spot);
  }

  // ============================================================================
  // THE LEGENDARY GOLD MACK BULLDOG HOOD ORNAMENT!
  // ============================================================================
  const bulldogGroup = new THREE.Group();
  bulldogGroup.position.set(0, 1.9, 5.95);

  // Chrome hood crest base
  const crestPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.22), chromeMat);
  bulldogGroup.add(crestPedestal);

  // Muscular Bulldog chest & torso (Gold-plated for authentic all-Mack MP8/mDRIVE powertrain!)
  const bdChest = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 12), goldBulldogMat);
  bdChest.scale.set(1.05, 0.95, 1.35);
  bdChest.position.set(0, 0.085, 0.03);
  bulldogGroup.add(bdChest);

  const bdHaunch = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), goldBulldogMat);
  bdHaunch.scale.set(0.95, 0.9, 1.25);
  bdHaunch.position.set(0, 0.075, -0.055);
  bulldogGroup.add(bdHaunch);

  // Proud Bulldog Head & Snub Muzzle
  const bdHead = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.075, 0.078), goldBulldogMat);
  bdHead.position.set(0, 0.145, 0.085);
  bdHead.rotation.x = -0.15;
  bulldogGroup.add(bdHead);

  const bdJaw = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.042, 0.055), goldBulldogMat);
  bdJaw.position.set(0, 0.125, 0.122);
  bulldogGroup.add(bdJaw);

  // Spiked Collar & Perked Ears
  const bdCollar = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.01, 8, 16), chromeMat);
  bdCollar.position.set(0, 0.115, 0.065);
  bdCollar.rotation.x = Math.PI / 3;
  bulldogGroup.add(bdCollar);

  for (const ex of [-0.032, 0.032]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.038, 6), goldBulldogMat);
    ear.position.set(ex, 0.195, 0.075);
    ear.rotation.z = ex > 0 ? -0.2 : 0.2;
    bulldogGroup.add(ear);
  }

  // Four sturdy Bulldog legs planted on the pedestal
  const legGeo = new THREE.CylinderGeometry(0.014, 0.012, 0.075, 8);
  for (const [lx, lz] of [
    [-0.035, 0.065],
    [0.035, 0.065],
    [-0.03, -0.055],
    [0.03, -0.055],
  ]) {
    const leg = new THREE.Mesh(legGeo, goldBulldogMat);
    leg.position.set(lx, 0.048, lz);
    bulldogGroup.add(leg);
  }
  tractorGroup.add(bulldogGroup);

  // ============================================================================
  // MACK CAB, MID-ROOF SLEEPER, INTERIOR DASH, MIRRORS & EXHAUST STACKS
  // ============================================================================
  // Main Day Cab body (z = +2.35 to +3.62)
  const cabLower = new THREE.Mesh(new THREE.BoxGeometry(2.18, 1.05, 1.32), bodyPaintMat);
  cabLower.position.set(0, 1.48, 2.98);
  cabLower.castShadow = true;
  cabLower.receiveShadow = true;
  tractorGroup.add(cabLower);

  // Cab Upper Greenhouse Pillars & Roof Cap
  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.18, 1.28), bodyPaintMat);
  cabRoof.position.set(0, 2.78, 2.92);
  cabRoof.castShadow = true;
  tractorGroup.add(cabRoof);

  // Cab Rear & Pillars
  for (const sx of [-1.03, 1.03]) {
    // A-pillar (sloped)
    const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.82, 0.1), bodyPaintMat);
    aPillar.position.set(sx, 2.36, 3.48);
    aPillar.rotation.x = -0.22;
    tractorGroup.add(aPillar);

    // B-pillar
    const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.82, 0.16), bodyPaintMat);
    bPillar.position.set(sx, 2.36, 2.42);
    tractorGroup.add(bPillar);

    // Chrome door handle
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.18), chromeMat);
    handle.position.set(sx * 1.065, 1.62, 2.68);
    tractorGroup.add(handle);
  }

  // Classic Mack Split Two-Pane Windshield + Center Chrome Divider
  const windshieldPane = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 0.74), darkGlassMat);
  windshieldPane.position.set(0, 2.36, 3.51);
  windshieldPane.rotation.x = -0.22;
  tractorGroup.add(windshieldPane);

  const centerDivider = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.78, 0.04), chromeMat);
  centerDivider.position.set(0, 2.36, 3.525);
  centerDivider.rotation.x = -0.22;
  tractorGroup.add(centerDivider);

  // Side Door Tinted Windows
  for (const sx of [-1.05, 1.05]) {
    const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.68), darkGlassMat);
    sideWin.position.set(sx, 2.35, 2.95);
    sideWin.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    tractorGroup.add(sideWin);
  }

  // Cab Interior: Wraparound Dash, Seats & Animated Driver Steering Wheel (visible in POV & outside!)
  const interiorDash = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.42, 0.42), chassisBlackMat);
  interiorDash.position.set(0, 1.88, 3.32);
  tractorGroup.add(interiorDash);

  for (const sx of [-0.52, 0.52]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.86, 0.52), chassisBlackMat);
    seat.position.set(sx, 1.78, 2.72);
    tractorGroup.add(seat);
  }

  // Driver Steering Column & Steering Wheel at x = +0.52 (US Left-Hand Drive)
  const steeringWheelGroup = new THREE.Group();
  steeringWheelGroup.position.set(0.52, 2.1, 3.12);
  steeringWheelGroup.rotation.x = 0.52;
  const swRim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.024, 10, 24), chassisBlackMat);
  const swHub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12), goldBulldogMat);
  swHub.rotation.x = Math.PI / 2;
  steeringWheelGroup.add(swRim, swHub);
  tractorGroup.add(steeringWheelGroup);

  // 48" Integral Mid-Roof Sleeper Compartment + Aerodynamic Roof Fairing (z = +1.35 to +2.38)
  const sleeperBox = new THREE.Mesh(new THREE.BoxGeometry(2.26, 2.08, 1.06), bodyPaintMat);
  sleeperBox.position.set(0, 1.98, 1.86);
  sleeperBox.castShadow = true;
  sleeperBox.receiveShadow = true;
  tractorGroup.add(sleeperBox);

  // Aerodynamic Roof Fairing / Wind Deflector bridging Cab & Sleeper up toward Trailer height
  const fairingShape = new THREE.Shape();
  fairingShape.moveTo(0, 0);
  fairingShape.lineTo(1.65, 0);
  fairingShape.quadraticCurveTo(1.15, 0.62, 0, 0.78);
  fairingShape.closePath();
  const fairingGeo = new THREE.ExtrudeGeometry(fairingShape, {
    depth: 2.08,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.04,
    bevelThickness: 0.04,
  });
  fairingGeo.rotateY(-Math.PI / 2);
  fairingGeo.translate(1.04, 2.96, 1.38);
  const roofFairing = new THREE.Mesh(fairingGeo, bodyPaintMat);
  roofFairing.castShadow = true;
  tractorGroup.add(roofFairing);

  // Chrome Exterior Sun Visor & 5 Glowing Amber Roof Marker Lights
  const sunVisor = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.16, 0.28), chromeMat);
  sunVisor.position.set(0, 2.76, 3.58);
  sunVisor.rotation.x = 0.28;
  tractorGroup.add(sunVisor);

  for (const mx of [-0.76, -0.38, 0, 0.38, 0.76]) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.09), amberMarkerMat);
    marker.position.set(mx, 2.91, 3.46);
    tractorGroup.add(marker);
  }

  // Twin Chrome Roof Pneumatic Air Horns!
  const hornTrumpetGeo = new THREE.CylinderGeometry(0.055, 0.024, 0.68, 14);
  hornTrumpetGeo.rotateX(Math.PI / 2);
  for (const hx of [-0.88, 0.88]) {
    const horn = new THREE.Mesh(hornTrumpetGeo, chromeMat);
    horn.position.set(hx, 2.94, 3.08);
    tractorGroup.add(horn);
  }

  // Dual Tall Vertical Chrome Exhaust Stacks (x = ±1.22, z = +1.30)
  const exhaustTips = [];
  for (const sx of [-1.22, 1.22]) {
    // Lower perforated shield
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 1.75, 16), brushedAlumMat);
    shield.position.set(sx, 1.88, 1.3);
    shield.castShadow = true;
    tractorGroup.add(shield);

    // Upper polished chrome stack pipe
    const upperPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 1.25, 16), chromeMat);
    upperPipe.position.set(sx, 3.32, 1.3);
    upperPipe.castShadow = true;
    tractorGroup.add(upperPipe);

    // Angled turnout tip
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.072, 0.24, 16), chromeMat);
    tip.position.set(sx * 1.03, 3.98, 1.24);
    tip.rotation.x = -0.45;
    tip.rotation.z = sx > 0 ? -0.25 : 0.25;
    tractorGroup.add(tip);

    const tipAnchor = new THREE.Object3D();
    tipAnchor.position.set(sx * 1.05, 4.08, 1.18);
    tractorGroup.add(tipAnchor);
    exhaustTips.push(tipAnchor);
  }

  // West Coast Chrome Side Mirrors + Real-Time Mirror Cameras!
  // Left Mirror (+X, Sight-Side) & Right Mirror (-X, Blind-Side)
  const mirrorBracketMat = chromeMat;
  for (const sx of [-1, 1]) {
    const mirrorHousing = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.56, 0.22), chromeMat);
    mirrorHousing.position.set(sx * 1.48, 2.38, 3.34);
    tractorGroup.add(mirrorHousing);

    const convexSpotter = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.2), chromeMat);
    convexSpotter.position.set(sx * 1.48, 1.98, 3.34);
    tractorGroup.add(convexSpotter);

    // Top & bottom tubular chrome arms
    for (const ay of [2.62, 1.92]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.44, 8), mirrorBracketMat);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(sx * 1.26, ay, 3.34);
      tractorGroup.add(arm);
    }
  }

  // Mirror Cameras positioned cleanly outboard of the chrome exhaust stacks for an unobstructed view down the trailer flanks!
  const leftMirrorCam = new THREE.PerspectiveCamera(40, 0.75, 0.4, 160);
  leftMirrorCam.position.set(1.52, 2.36, 3.24);
  leftMirrorCam.lookAt(1.36, 1.65, -18.0);
  tractorGroup.add(leftMirrorCam);

  const rightMirrorCam = new THREE.PerspectiveCamera(40, 0.75, 0.4, 160);
  rightMirrorCam.position.set(-1.52, 2.36, 3.24);
  rightMirrorCam.lookAt(-1.36, 1.65, -18.0);
  tractorGroup.add(rightMirrorCam);

  // Driver Bulldog Hood POV Camera (raised slightly to clear cab sun visor & frame Gold Bulldog + yard!)
  const hoodPovCamAnchor = new THREE.Object3D();
  hoodPovCamAnchor.position.set(0.46, 2.42, 3.22);
  tractorGroup.add(hoodPovCamAnchor);

  const hoodPovLookTarget = new THREE.Object3D();
  hoodPovLookTarget.position.set(0.12, 1.88, 14.5);
  tractorGroup.add(hoodPovLookTarget);

  // ============================================================================
  // 2. 53-FOOT ARTICULATED MACK DRY-VAN TRAILER GROUP
  // Origin (0,0,0) at ground y=0 directly beneath the Kingpin!
  // ============================================================================
  const trailerGroup = new THREE.Group();
  trailerGroup.name = 'MackTrailer';

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

  // BoxGeometry material order: [+X (left), -X (right), +Y (roof), -Y (belly), +Z (nose), -Z (rear doors)]
  const trailerLength = RIG_SPECS.trailerFrontZ - RIG_SPECS.trailerRearZ; // 13.52 m
  const trailerCenterZ = (RIG_SPECS.trailerFrontZ + RIG_SPECS.trailerRearZ) * 0.5; // -5.84 m
  const trailerBoxHeight = 2.78;
  const trailerBoxCenterY = 1.24 + trailerBoxHeight * 0.5; // bottom at y=1.24, roof at y=4.02

  const trailerBodyMaterials = [
    trailerSideMat, // +X Left Sight-Side
    trailerSideMat, // -X Right Blind-Side
    trailerCapMat, // +Y Roof
    chassisBlackMat, // -Y Underframe
    trailerCapMat, // +Z Front Bulkhead
    trailerRearMat, // -Z Rear Swing Barn Doors
  ];

  const trailerBody = new THREE.Mesh(
    new THREE.BoxGeometry(RIG_SPECS.trailerHalfWidth * 2, trailerBoxHeight, trailerLength),
    trailerBodyMaterials
  );
  trailerBody.position.set(0, trailerBoxCenterY, trailerCenterZ);
  trailerBody.castShadow = true;
  trailerBody.receiveShadow = true;
  trailerGroup.add(trailerBody);

  // Front Refrigeration / Nose Corner Extrusions & Gladhand Socket Box
  const gladhandBox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.14), brushedAlumMat);
  gladhandBox.position.set(0, 1.65, RIG_SPECS.trailerFrontZ + 0.05);
  trailerGroup.add(gladhandBox);

  // Retracted Heavy Steel Landing Gear Legs (at z = -2.65)
  for (const sx of [-0.88, 0.88]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.88, 0.14), chassisBlackMat);
    leg.position.set(sx, 0.84, -2.65);
    trailerGroup.add(leg);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.28), chassisBlackMat);
    shoe.position.set(sx, 0.41, -2.65);
    trailerGroup.add(shoe);
  }

  // Aerodynamic Trailer Side Skirts
  for (const sx of [-1.18, 1.18]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.56, 5.4), trailerCapMat);
    skirt.position.set(sx, 0.88, -6.1);
    skirt.castShadow = true;
    trailerGroup.add(skirt);
  }

  // Trailer Sliding Tandem Bogie Frame & Dual Axles (z = -9.55 and z = -10.85, centered at -10.20)
  const bogieSubframe = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.24, 2.4), chassisBlackMat);
  bogieSubframe.position.set(0, 0.98, -RIG_SPECS.trailerWheelbase);
  trailerGroup.add(bogieSubframe);

  const trailerRollingWheels = [];
  for (const tz of [-9.55, -10.85]) {
    const tAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.0, 12), chassisBlackMat);
    tAxle.rotation.z = Math.PI / 2;
    tAxle.position.set(0, 0.53, tz);
    trailerGroup.add(tAxle);

    for (const sx of [-0.96, 0.96]) {
      const tw = createWheelUnit(true);
      tw.position.set(sx, 0.53, tz);
      trailerGroup.add(tw);
      trailerRollingWheels.push(tw);
    }
  }

  // Trailer Rear Mudflaps behind bogie
  for (const sx of [-0.96, 0.96]) {
    const tFlap = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.64), mudflapMat);
    tFlap.position.set(sx, 0.46, -11.55);
    tFlap.rotation.y = Math.PI;
    trailerGroup.add(tFlap);
  }

  // Heavy Steel ICC Rear Underride Guard Bumper + Brake / Reverse / Amber Clearance Lamps
  const iccVertLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.68, 0.12), chassisBlackMat);
  iccVertLeft.position.set(-0.88, 0.92, RIG_SPECS.trailerRearZ + 0.08);
  const iccVertRight = iccVertLeft.clone();
  iccVertRight.position.x = 0.88;
  const iccCrossbar = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.16, 0.14), brushedAlumMat);
  iccCrossbar.position.set(0, 0.58, RIG_SPECS.trailerRearZ + 0.04);
  trailerGroup.add(iccVertLeft, iccVertRight, iccCrossbar);

  // Trailer Rear Tail/Brake & Reverse Lights along lower rear sill
  for (const lx of [-1.02, -0.82, 0.82, 1.02]) {
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.04), brakeLightMat);
    bl.position.set(lx, 1.18, RIG_SPECS.trailerRearZ - 0.01);
    trailerGroup.add(bl);
  }
  for (const rx of [-0.58, 0.58]) {
    const rl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.04), reverseLightMat);
    rl.position.set(rx, 1.18, RIG_SPECS.trailerRearZ - 0.01);
    trailerGroup.add(rl);
  }

  // Upper Amber & Red Clearance Marker Lights along trailer top corners (huge help in Night Mirrors!)
  for (const sx of [-1.275, 1.275]) {
    // Front top amber corner marker (visible right in West Coast mirrors!)
    const frontCornerMarker = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.14), amberMarkerMat);
    frontCornerMarker.position.set(sx, 3.92, RIG_SPECS.trailerFrontZ - 0.22);
    trailerGroup.add(frontCornerMarker);

    // Mid-turn amber side marker
    const midMarker = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.16), amberMarkerMat);
    midMarker.position.set(sx, 1.28, -5.8);
    trailerGroup.add(midMarker);

    // Rear red side clearance marker (lets driver spot exact rear corner of trailer in mirrors!)
    const rearCornerMarker = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.16), brakeLightMat);
    rearCornerMarker.position.set(sx, 1.28, RIG_SPECS.trailerRearZ + 0.22);
    trailerGroup.add(rearCornerMarker);

    const rearTopCorner = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.14), brakeLightMat);
    rearTopCorner.position.set(sx, 3.92, RIG_SPECS.trailerRearZ + 0.22);
    trailerGroup.add(rearTopCorner);
  }

  // ============================================================================
  // 3. DYNAMIC FLEXING AIR / ABS GLADHAND HOSES (Red Service & Blue Emergency)
  // ============================================================================
  const hoseGroup = new THREE.Group();
  const redHoseMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
  const blueHoseMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.45 });

  const redHoseLine = new THREE.Mesh(new THREE.BufferGeometry(), redHoseMat);
  const blueHoseLine = new THREE.Mesh(new THREE.BufferGeometry(), blueHoseMat);
  hoseGroup.add(redHoseLine, blueHoseLine);

  const cabTenderLocal = new THREE.Vector3(0, 1.95, 1.32);
  const trailerNoseLocal = new THREE.Vector3(0, 1.68, RIG_SPECS.trailerFrontZ + 0.05);
  const _pA = new THREE.Vector3();
  const _pB = new THREE.Vector3();
  const _pMid = new THREE.Vector3();

  function updateGladhandHoses() {
    tractorGroup.localToWorld(_pA.copy(cabTenderLocal));
    trailerGroup.localToWorld(_pB.copy(trailerNoseLocal));
    _pMid.lerpVectors(_pA, _pB, 0.5);
    _pMid.y -= 0.36; // natural catenary sag

    const curveRed = new THREE.QuadraticBezierCurve3(
      _pA.clone().add(new THREE.Vector3(0.12, 0, 0)),
      _pMid.clone().add(new THREE.Vector3(0.1, 0, 0)),
      _pB.clone().add(new THREE.Vector3(0.1, 0, 0))
    );
    const curveBlue = new THREE.QuadraticBezierCurve3(
      _pA.clone().add(new THREE.Vector3(-0.12, 0, 0)),
      _pMid.clone().add(new THREE.Vector3(-0.1, 0, 0)),
      _pB.clone().add(new THREE.Vector3(-0.1, 0, 0))
    );

    redHoseLine.geometry.dispose();
    redHoseLine.geometry = new THREE.TubeGeometry(curveRed, 10, 0.022, 6, false);

    blueHoseLine.geometry.dispose();
    blueHoseLine.geometry = new THREE.TubeGeometry(curveBlue, 10, 0.022, 6, false);
  }

  // ============================================================================
  // 4. DIESEL EXHAUST SMOKE PUFF PARTICLES (from Dual Chrome Stacks)
  // ============================================================================
  const smokeGroup = new THREE.Group();
  const smokeGeo = new THREE.SphereGeometry(0.14, 8, 8);
  const smokeParticles = [];
  for (let i = 0; i < 28; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x64748b,
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
      maxLife: 1,
      vel: new THREE.Vector3(),
    });
  }
  let smokeCursor = 0;
  let smokeTimer = 0;
  const _tipPos = new THREE.Vector3();

  function updateExhaustSmoke(dt, rpmNorm, throttle) {
    const spawnInterval = Math.max(0.045, 0.16 - throttle * 0.1);
    smokeTimer += dt;
    if (smokeTimer >= spawnInterval) {
      smokeTimer = 0;
      for (const tip of exhaustTips) {
        const p = smokeParticles[smokeCursor];
        smokeCursor = (smokeCursor + 1) % smokeParticles.length;
        tip.getWorldPosition(_tipPos);
        p.mesh.position.copy(_tipPos);
        p.mesh.scale.setScalar(0.65);
        p.mesh.visible = true;
        p.life = 0;
        p.maxLife = 0.85 + Math.random() * 0.45;
        const darkness = throttle > 0.4 ? 0x334155 : 0x94a3b8;
        p.mesh.material.color.setHex(darkness);
        p.vel.set((Math.random() - 0.5) * 0.45, 1.3 + throttle * 1.6, (Math.random() - 0.5) * 0.45);
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
      p.mesh.scale.setScalar(0.65 + t * 2.1);
      p.mesh.material.opacity = (1 - t) * (0.14 + throttle * 0.18);
    }
  }

  // ============================================================================
  // PUBLIC RIG CONTROLLER API
  // ============================================================================
  let headlightsEnabled = false;

  function setHeadlights(on) {
    headlightsEnabled = on;
    headlightLensMat.emissiveIntensity = on ? 3.2 : 1.1;
    for (const spot of headlightSpots) {
      spot.intensity = on ? 55 : 0;
    }
  }

  function setLivery(liveryKey) {
    const lv = LIVERIES[liveryKey] || LIVERIES.red;
    bodyPaintMat.color.setHex(lv.cabColor);
    fenderPaintMat.color.setHex(lv.fenderColor);
    const newSideTex = createTrailerSideTexture(lv.stripePrimary, lv.stripeSecondary);
    if (trailerSideMat.map) trailerSideMat.map.dispose();
    trailerSideMat.map = newSideTex;
    trailerSideMat.needsUpdate = true;
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
      rpmNorm,
      throttle,
    } = state;

    tractorGroup.position.set(tractorX, 0, tractorZ);
    tractorGroup.rotation.y = tractorTheta;

    trailerGroup.position.set(hitchX, 0, hitchZ);
    trailerGroup.rotation.y = trailerTheta;

    tractorGroup.updateMatrixWorld(true);
    trailerGroup.updateMatrixWorld(true);

    // Steer front wheels + cab steering wheel
    for (const pivot of frontSteerPivots) {
      pivot.rotation.y = steerAngle;
    }
    steeringWheelGroup.rotation.z = -steerAngle * 6.5;

    // Roll wheels proportionally to traveled distance (radius = 0.53m)
    const tractorSpin = tractorDistDelta / 0.53;
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

    // Flexing Gladhand Hoses & Diesel Smoke
    updateGladhandHoses();
    updateExhaustSmoke(dt, rpmNorm, throttle);
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
    setLivery,
    updateVisuals,
  };
}
