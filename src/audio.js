/**
 * Synthesized Web Audio API Heavy-Duty Mack Diesel, Air Brake, Reverse Alarm & Air Horn Engine.
 * Zero external audio assets needed — works offline immediately after first user interaction.
 */
export class TruckAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;

    // Engine nodes
    this.masterGain = null;
    this.engineGain = null;
    this.oscPrimary = null;
    this.oscSub = null;
    this.turboOsc = null;
    this.turboGain = null;
    this.engineFilter = null;

    // Reverse beeper timer
    this.beeperAccum = 0;
    this.beepOn = false;

    // Noise buffer for pneumatic air brakes & impacts
    this.noiseBuffer = null;
  }

  init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.48;
    this.masterGain.connect(this.ctx.destination);

    // Pre-generate 1.5s white noise buffer for air brakes & collisions
    const sampleRate = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, Math.floor(sampleRate * 1.5), sampleRate);
    const channel = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) {
      channel[i] = Math.random() * 2 - 1;
    }

    // Mack MP8 Diesel Engine Oscillator Stack
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 210;
    this.engineFilter.Q.value = 2.8;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.22;

    this.oscPrimary = this.ctx.createOscillator();
    this.oscPrimary.type = 'sawtooth';
    this.oscPrimary.frequency.value = 34;

    this.oscSub = this.ctx.createOscillator();
    this.oscSub.type = 'triangle';
    this.oscSub.frequency.value = 68;

    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.5;

    this.oscPrimary.connect(this.engineFilter);
    this.oscSub.connect(subGain);
    subGain.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    // Subtle Turbocharger Whistle
    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.value = 1200;
    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.value = 0.0;
    this.turboOsc.connect(this.turboGain);
    this.turboGain.connect(this.masterGain);

    this.oscPrimary.start();
    this.oscSub.start();
    this.turboOsc.start();

    this.initialized = true;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.48, this.ctx.currentTime, 0.04);
    }
    return this.muted;
  }

  /**
   * Updates diesel engine RPM pitch, load rumble, and reverse yard alarm every frame.
   */
  update(dt, { rpmNorm = 0, throttle = 0, inReverse = false, active = true }) {
    if (!this.initialized || !this.ctx) return;

    const now = this.ctx.currentTime;
    if (!active) {
      this.engineGain.gain.setTargetAtTime(0.05, now, 0.15);
      this.turboGain.gain.setTargetAtTime(0.0, now, 0.1);
      return;
    }

    const baseFreq = 32 + rpmNorm * 52 + throttle * 8;
    this.oscPrimary.frequency.setTargetAtTime(baseFreq, now, 0.06);
    this.oscSub.frequency.setTargetAtTime(baseFreq * 2.02, now, 0.06);
    this.engineFilter.frequency.setTargetAtTime(185 + rpmNorm * 320 + throttle * 140, now, 0.08);
    this.engineGain.gain.setTargetAtTime(0.18 + throttle * 0.12 + rpmNorm * 0.06, now, 0.08);

    // Subtle Mack MP8 turbocharger spool under load
    this.turboOsc.frequency.setTargetAtTime(1050 + rpmNorm * 1450, now, 0.1);
    this.turboGain.gain.setTargetAtTime(throttle > 0.2 ? rpmNorm * 0.022 : 0.0, now, 0.12);

    // Reverse Backup Alarm (1040 Hz industrial yard beep)
    if (inReverse) {
      this.beeperAccum += dt;
      if (this.beeperAccum >= 0.92) {
        this.beeperAccum = 0;
        this._triggerReverseBeep();
      }
    } else {
      this.beeperAccum = 0.78; // beep promptly upon shifting into R
    }
  }

  _triggerReverseBeep() {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1060, now);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.11, now + 0.015);
    g.gain.setValueAtTime(0.11, now + 0.36);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  /**
   * Pneumatic tractor-trailer air brake release / set hiss ("PSSSHHH!")
   */
  playAirBrake() {
    this.init();
    if (!this.initialized || this.muted || !this.noiseBuffer) return;

    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.36);
    filter.Q.value = 1.4;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.26, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.4);
  }

  /**
   * Dual-trumpet chrome roof Mack Air Horn!
   */
  playAirHorn(duration = 0.65) {
    this.init();
    if (!this.initialized || this.muted) return;

    const now = this.ctx.currentTime;
    const freqs = [185.0, 233.08, 277.18]; // Rich dual-chime truck horn chord
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1350;

    const hornGain = this.ctx.createGain();
    hornGain.gain.setValueAtTime(0.001, now);
    hornGain.gain.linearRampToValueAtTime(0.28, now + 0.04);
    hornGain.gain.setValueAtTime(0.26, now + duration - 0.08);
    hornGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    filter.connect(hornGain);
    hornGain.connect(this.masterGain);

    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }
  }

  /**
   * Soft rubber dock bumper contact thud.
   */
  playDockKiss() {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.22);

    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  /**
   * Heavy metallic impact / barrier crunch when colliding with an obstacle.
   */
  playCollisionImpact() {
    this.init();
    if (!this.initialized || this.muted || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    // Low boom
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.28);
    og.gain.setValueAtTime(0.42, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(og);
    og.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.32);

    // Metallic crunch burst
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 680;
    bp.Q.value = 1.2;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.3, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    src.connect(bp);
    bp.connect(ng);
    ng.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.28);
  }

  /**
   * Dock lock chime + double celebratory air horn tap!
   */
  playDockSuccess() {
    this.init();
    if (!this.initialized || this.muted) return;
    this.playAirBrake();
    setTimeout(() => this.playAirHorn(0.22), 180);
    setTimeout(() => this.playAirHorn(0.48), 460);
  }
}
