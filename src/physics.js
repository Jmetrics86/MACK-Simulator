import { RIG_SPECS } from './mackTruck.js';

/**
 * Normalizes an angle in radians to [-PI, +PI].
 */
export function wrapAngle(rad) {
  let a = (rad + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

/**
 * Builds a 2D OBB in the XZ plane.
 */
export function makeOBB(cx, cz, hw, hl, theta = 0, kind = 'obstacle', label = 'Obstacle') {
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  // Forward axis u = (s, c), Left axis l = (c, -s)
  return { cx, cz, hw, hl, theta, ux: s, uz: c, lx: c, lz: -s, kind, label };
}

/**
 * 2D Separating Axis Theorem (SAT) intersection check between two OBBs in XZ.
 * Returns { hit: boolean, overlap: number, nx: number, nz: number }.
 */
export function testOBBOverlap(a, b) {
  const dx = b.cx - a.cx;
  const dz = b.cz - a.cz;

  const axes = [
    { x: a.lx, z: a.lz },
    { x: a.ux, z: a.uz },
    { x: b.lx, z: b.lz },
    { x: b.ux, z: b.uz },
  ];

  let minOverlap = Infinity;
  let bestAxisX = 0;
  let bestAxisZ = 0;

  for (const ax of axes) {
    const distProj = Math.abs(dx * ax.x + dz * ax.z);
    const rA =
      a.hw * Math.abs(a.lx * ax.x + a.lz * ax.z) +
      a.hl * Math.abs(a.ux * ax.x + a.uz * ax.z);
    const rB =
      b.hw * Math.abs(b.lx * ax.x + b.lz * ax.z) +
      b.hl * Math.abs(b.ux * ax.x + b.uz * ax.z);

    const overlap = rA + rB - distProj;
    if (overlap <= 0) {
      return { hit: false, overlap: 0, nx: 0, nz: 0 };
    }
    if (overlap < minOverlap) {
      minOverlap = overlap;
      const sign = dx * ax.x + dz * ax.z >= 0 ? -1 : 1; // push A away from B
      bestAxisX = ax.x * sign;
      bestAxisZ = ax.z * sign;
    }
  }

  return { hit: true, overlap: minOverlap, nx: bestAxisX, nz: bestAxisZ };
}

/**
 * Articulated Class-8 Tractor-Trailer Physics Controller.
 */
export class ArticulatedRigPhysics {
  constructor() {
    this.maxSteer = 0.63; // ~36.1 deg steer lock
    this.maxFwdSpeed = 8.8; // ~19.7 mph terminal yard speed
    this.maxRevSpeed = 4.2; // ~9.4 mph smooth backing speed
    this.maxJackknife = (84 * Math.PI) / 180;

    this.reset({ x: 0, z: 0, tractorTheta: 0, trailerTheta: 0 });
  }

  reset({ x = 0, z = 0, tractorTheta = 0, trailerTheta = undefined }) {
    this.tractorX = x;
    this.tractorZ = z;
    this.tractorTheta = tractorTheta;
    this.trailerTheta = trailerTheta !== undefined ? trailerTheta : tractorTheta;
    this.speed = 0;
    this.steerAngle = 0;
    this.gear = 'N'; // 'D' | 'N' | 'R'
    this.parkBrake = false;
    this.shiftGateTimer = 0;
    this.strikeCooldown = 0;

    this.tractorDistDelta = 0;
    this.trailerDistDelta = 0;
    this.braking = false;
    this.throttleAmount = 0;
    this.rpmNorm = 0.12;

    this._syncHitch();
  }

  _syncHitch() {
    this.hitchX = this.tractorX + RIG_SPECS.hitchOffset * Math.sin(this.tractorTheta);
    this.hitchZ = this.tractorZ + RIG_SPECS.hitchOffset * Math.cos(this.tractorTheta);
  }

  getArticulationAngle() {
    // Positive when tractor turns Left relative to trailer
    return wrapAngle(this.tractorTheta - this.trailerTheta);
  }

  getRigOBBs() {
    const tCenterOffset = (RIG_SPECS.tractorFrontZ + RIG_SPECS.tractorRearZ) * 0.5; // +2.35
    const tHalfLen = (RIG_SPECS.tractorFrontZ - RIG_SPECS.tractorRearZ) * 0.5; // 3.87
    const s1 = Math.sin(this.tractorTheta);
    const c1 = Math.cos(this.tractorTheta);
    const tractorOBB = makeOBB(
      this.tractorX + tCenterOffset * s1,
      this.tractorZ + tCenterOffset * c1,
      RIG_SPECS.tractorHalfWidth - 0.03,
      tHalfLen,
      this.tractorTheta,
      'player_tractor',
      'Mack Tractor'
    );

    const trCenterOffset = (RIG_SPECS.trailerFrontZ + RIG_SPECS.trailerRearZ) * 0.5; // -5.84
    const trHalfLen = (RIG_SPECS.trailerFrontZ - RIG_SPECS.trailerRearZ) * 0.5; // 6.76
    const s2 = Math.sin(this.trailerTheta);
    const c2 = Math.cos(this.trailerTheta);
    const trailerOBB = makeOBB(
      this.hitchX + trCenterOffset * s2,
      this.hitchZ + trCenterOffset * c2,
      RIG_SPECS.trailerHalfWidth - 0.02,
      trHalfLen,
      this.trailerTheta,
      'player_trailer',
      'Mack 53ft Trailer'
    );

    return { tractorOBB, trailerOBB };
  }

  /**
   * Advances rig physics, checks yard OBB collisions & knockable cones.
   */
  step(dt, inputs, obstacles, cones, softBumpSpeedLimit = 1.25) {
    const clampedDt = Math.min(dt, 0.05);
    if (this.strikeCooldown > 0) this.strikeCooldown = Math.max(0, this.strikeCooldown - clampedDt);
    if (this.shiftGateTimer > 0) this.shiftGateTimer = Math.max(0, this.shiftGateTimer - clampedDt);

    // 1. Steering Input
    const steerRate = 1.38;
    if (inputs.left && !inputs.right) {
      this.steerAngle = Math.min(this.maxSteer, this.steerAngle + steerRate * clampedDt);
    } else if (inputs.right && !inputs.left) {
      this.steerAngle = Math.max(-this.maxSteer, this.steerAngle - steerRate * clampedDt);
    } else {
      // Progressive smooth self-centering
      const returnRate = 0.36 + Math.abs(this.speed) * 0.28;
      if (Math.abs(this.steerAngle) <= returnRate * clampedDt) {
        this.steerAngle = 0;
      } else {
        this.steerAngle -= Math.sign(this.steerAngle) * returnRate * clampedDt;
      }
    }

    // 2. Throttle / Brake / mDRIVE Automatic Shift Logic
    this.braking = false;
    this.throttleAmount = 0;
    let airBrakeReleasedEvent = false;

    if (inputs.brake) {
      this.braking = true;
      const decel = 8.2 * clampedDt;
      if (Math.abs(this.speed) <= decel) {
        this.speed = 0;
      } else {
        this.speed -= Math.sign(this.speed) * decel;
      }
    } else if (inputs.forward && !inputs.reverse) {
      if (this.parkBrake) {
        this.parkBrake = false;
        airBrakeReleasedEvent = true;
      }
      if (this.speed < -0.06) {
        // Braking from reverse to 0 before shifting to D
        this.braking = true;
        this.speed = Math.min(0, this.speed + 7.2 * clampedDt);
        if (this.speed === 0) this.shiftGateTimer = 0.2;
      } else if (this.shiftGateTimer <= 0) {
        this.gear = 'D';
        this.throttleAmount = 1.0;
        const accel = 3.6 * (1 - Math.abs(this.speed) / (this.maxFwdSpeed * 1.15));
        this.speed = Math.min(this.maxFwdSpeed, this.speed + Math.max(0.6, accel) * clampedDt);
      }
    } else if (inputs.reverse && !inputs.forward) {
      if (this.parkBrake) {
        this.parkBrake = false;
        airBrakeReleasedEvent = true;
      }
      if (this.speed > 0.06) {
        // Braking from forward to 0 before shifting to R
        this.braking = true;
        this.speed = Math.max(0, this.speed - 7.2 * clampedDt);
        if (this.speed === 0) this.shiftGateTimer = 0.2;
      } else if (this.shiftGateTimer <= 0) {
        this.gear = 'R';
        this.throttleAmount = 0.85;
        const revAccel = 2.4 * (1 - Math.abs(this.speed) / (this.maxRevSpeed * 1.15));
        this.speed = Math.max(-this.maxRevSpeed, this.speed - Math.max(0.5, revAccel) * clampedDt);
      }
    } else {
      // Natural rolling resistance / engine braking
      const drag = (this.parkBrake ? 7.5 : 1.85) * clampedDt;
      if (Math.abs(this.speed) <= drag) {
        this.speed = 0;
      } else {
        this.speed -= Math.sign(this.speed) * drag;
      }
    }

    // Smooth Diesel RPM calculation
    const speedRatio =
      this.gear === 'R'
        ? Math.abs(this.speed) / this.maxRevSpeed
        : Math.abs(this.speed) / this.maxFwdSpeed;
    const targetRpm = Math.min(1.0, 0.14 + speedRatio * 0.58 + this.throttleAmount * 0.28);
    this.rpmNorm += (targetRpm - this.rpmNorm) * Math.min(1, clampedDt * 8);

    // 3. Sub-stepped Non-Holonomic Integration + OBB Collision Resolution
    const prevX = this.tractorX;
    const prevZ = this.tractorZ;
    const prevT1 = this.tractorTheta;
    const prevT2 = this.trailerTheta;
    const preStepSpeed = this.speed;

    this.tractorDistDelta = 0;
    this.trailerDistDelta = 0;

    const substeps = 4;
    const subDt = clampedDt / substeps;

    let collisionEvent = null;

    for (let i = 0; i < substeps; i++) {
      if (Math.abs(this.speed) < 1e-5) break;

      const s1 = Math.sin(this.tractorTheta);
      const c1 = Math.cos(this.tractorTheta);
      const omega1 = (this.speed / RIG_SPECS.tractorWheelbase) * Math.tan(this.steerAngle);

      // Hitch velocity vector v_h = v1 * u1 + d_h * omega1 * l1
      const vhx = this.speed * s1 + RIG_SPECS.hitchOffset * omega1 * c1;
      const vhz = this.speed * c1 - RIG_SPECS.hitchOffset * omega1 * s1;

      const s2 = Math.sin(this.trailerTheta);
      const c2 = Math.cos(this.trailerTheta);
      // l2 = (c2, -s2), u2 = (s2, c2)
      const vhDotL2 = vhx * c2 - vhz * s2;
      const vhDotU2 = vhx * s2 + vhz * c2;
      const omega2 = vhDotL2 / RIG_SPECS.trailerWheelbase;

      this.tractorX += this.speed * s1 * subDt;
      this.tractorZ += this.speed * c1 * subDt;
      this.tractorTheta = wrapAngle(this.tractorTheta + omega1 * subDt);
      this.trailerTheta = wrapAngle(this.trailerTheta + omega2 * subDt);

      // Mechanical Fifth-Wheel Jackknife Stop (~84 degrees)
      const hitchAngle = this.getArticulationAngle();
      if (Math.abs(hitchAngle) > this.maxJackknife) {
        const clampedHitch = Math.sign(hitchAngle) * this.maxJackknife;
        this.trailerTheta = wrapAngle(this.tractorTheta - clampedHitch);
        if (this.speed < 0) {
          this.speed *= 0.5;
        }
      }

      this._syncHitch();
      this.tractorDistDelta += this.speed * subDt;
      this.trailerDistDelta += vhDotU2 * subDt;
    }

    // 4. Test Rig OBBs against Static Yard Obstacles
    const { tractorOBB, trailerOBB } = this.getRigOBBs();
    for (const obs of obstacles) {
      const hitTrailer = testOBBOverlap(trailerOBB, obs);
      const hitTractor = !hitTrailer.hit ? testOBBOverlap(tractorOBB, obs) : { hit: false };

      if (hitTrailer.hit || hitTractor.hit) {
        const impactSpeed = Math.abs(preStepSpeed);

        // Revert to pre-step pose so rig never clips into obstacles
        this.tractorX = prevX;
        this.tractorZ = prevZ;
        this.tractorTheta = prevT1;
        this.trailerTheta = prevT2;
        this._syncHitch();
        this.tractorDistDelta = 0;
        this.trailerDistDelta = 0;

        if (obs.kind === 'bumper' && hitTrailer.hit && impactSpeed <= softBumpSpeedLimit) {
          // Gentle dock bumper kiss!
          this.speed = 0;
          if (impactSpeed > 0.12) {
            collisionEvent = { type: 'dock_kiss', label: obs.label, speed: impactSpeed };
          }
        } else {
          // Obstacle collision or hard dock slam!
          this.speed = -preStepSpeed * 0.2;
          if (this.strikeCooldown <= 0 && impactSpeed > 0.08) {
            this.strikeCooldown = 1.1;
            collisionEvent = {
              type: 'strike',
              label: obs.label,
              speed: impactSpeed,
            };
          }
        }
        break;
      }
    }

    // 5. Test Knockable Traffic Cones (tip over smoothly without stopping the rig!)
    if (cones && cones.length > 0) {
      const { tractorOBB: tOBB2, trailerOBB: trOBB2 } = this.getRigOBBs();
      for (const cone of cones) {
        if (cone.knocked) continue;
        const coneBox = makeOBB(cone.x, cone.z, 0.24, 0.24, 0, 'cone', 'Traffic Cone');
        if (testOBBOverlap(trOBB2, coneBox).hit || testOBBOverlap(tOBB2, coneBox).hit) {
          cone.knocked = true;
          cone.tipDirX = Math.sin(this.trailerTheta) * Math.sign(this.speed || -1);
          cone.tipDirZ = Math.cos(this.trailerTheta) * Math.sign(this.speed || -1);
          if (!collisionEvent) {
            collisionEvent = { type: 'cone', label: 'Traffic Cone' };
          }
        }
      }
    }

    return {
      collisionEvent,
      airBrakeReleasedEvent,
    };
  }

  /**
   * Computes alignment metrics of the trailer rear relative to the Target Dock Bay!
   * Dock bay bumper face is at (dock.x, dock.bumperZ), and trailer backs in facing +Z
   * (so trailer heading theta2 should match dock.targetTheta = 0, rear doors at -Z touching bumperZ!).
   */
  evaluateDockAlignment(dock) {
    const s2 = Math.sin(this.trailerTheta);
    const c2 = Math.cos(this.trailerTheta);

    // Exact world coordinates of the center of the Trailer's Rear Barn Doors
    const rearX = this.hitchX + RIG_SPECS.trailerRearZ * s2;
    const rearZ = this.hitchZ + RIG_SPECS.trailerRearZ * c2;

    // Dock opens into +Z yard, bumper wall is at dock.bumperZ (e.g. z = -34.2)
    const bumperGap = rearZ - dock.bumperZ; // 0.0m means kissing the rubber dock bumpers!
    const lateralOffset = rearX - dock.x; // meters left/right of bay centerline
    const angleErrorRad = wrapAngle(this.trailerTheta - dock.targetTheta);
    const angleErrorDeg = (angleErrorRad * 180) / Math.PI;

    const latOk = Math.abs(lateralOffset) <= dock.maxLatOffset;
    const angOk = Math.abs(angleErrorDeg) <= dock.maxAngleDeg;
    const distOk = bumperGap >= -0.15 && bumperGap <= dock.maxBumperGap;
    const stoppedOk = Math.abs(this.speed) <= 0.14;

    return {
      rearX,
      rearZ,
      bumperGap: Math.max(0, bumperGap),
      lateralOffset,
      angleErrorDeg,
      latOk,
      angOk,
      distOk,
      stoppedOk,
      inZone: latOk && angOk && distOk,
      readyToLock: latOk && angOk && distOk && stoppedOk,
    };
  }

  /**
   * Predicts left & right rear trailer wheel/bumper trajectories while backing at current steering angle.
   */
  predictTrailerArcs(steps = 42, stepDist = -0.45) {
    let x = this.tractorX;
    let z = this.tractorZ;
    let t1 = this.tractorTheta;
    let t2 = this.trailerTheta;

    const leftPts = [];
    const rightPts = [];

    for (let i = 0; i <= steps; i++) {
      const hx = x + RIG_SPECS.hitchOffset * Math.sin(t1);
      const hz = z + RIG_SPECS.hitchOffset * Math.cos(t1);
      const s2 = Math.sin(t2);
      const c2 = Math.cos(t2);
      // Rear corners of trailer at z_local = trailerRearZ, x_local = ±trailerHalfWidth
      const rx = hx + RIG_SPECS.trailerRearZ * s2;
      const rz = hz + RIG_SPECS.trailerRearZ * c2;
      const lxVec = c2 * RIG_SPECS.trailerHalfWidth;
      const lzVec = -s2 * RIG_SPECS.trailerHalfWidth;

      leftPts.push({ x: rx + lxVec, z: rz + lzVec });
      rightPts.push({ x: rx - lxVec, z: rz - lzVec });

      // Advance kinematic step backward
      const s1 = Math.sin(t1);
      const c1 = Math.cos(t1);
      const dTheta1 = (stepDist / RIG_SPECS.tractorWheelbase) * Math.tan(this.steerAngle);
      const dhx = stepDist * s1 + RIG_SPECS.hitchOffset * dTheta1 * c1;
      const dhz = stepDist * c1 - RIG_SPECS.hitchOffset * dTheta1 * s1;
      const dTheta2 = (dhx * c2 - dhz * s2) / RIG_SPECS.trailerWheelbase;

      x += stepDist * s1;
      z += stepDist * c1;
      t1 = wrapAngle(t1 + dTheta1);
      t2 = wrapAngle(t2 + dTheta2);

      if (Math.abs(wrapAngle(t1 - t2)) > this.maxJackknife) break;
    }

    return { leftPts, rightPts };
  }
}
