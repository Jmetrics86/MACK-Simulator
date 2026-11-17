import * as THREE from 'three';

/**
 * Generates a realistic weathered asphalt albedo + roughness map pair.
 */
export function createAsphaltTextures(wetMode = false) {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d');

  ctx.fillStyle = wetMode ? '#181c22' : '#2a2e35';
  ctx.fillRect(0, 0, size, size);

  // Aggregate mineral speckle
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < data.length; i += 4) {
    const n = (rand() - 0.5) * (wetMode ? 18 : 26);
    data[i] = Math.max(10, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(10, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(12, Math.min(255, data[i + 2] + n * 1.05));
  }
  ctx.putImageData(imgData, 0, 0);

  // Subtle tar crack lines & tire wear patches
  ctx.strokeStyle = wetMode ? 'rgba(8,10,14,0.55)' : 'rgba(18,20,24,0.4)';
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 7; k++) {
    ctx.beginPath();
    let x = rand() * size;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < size) {
      y += 24 + rand() * 32;
      x += (rand() - 0.5) * 18;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const colorTex = new THREE.CanvasTexture(colorCanvas);
  colorTex.colorSpace = THREE.SRGBColorSpace;
  colorTex.wrapS = THREE.RepeatWrapping;
  colorTex.wrapT = THREE.RepeatWrapping;
  colorTex.repeat.set(22, 22);
  colorTex.anisotropy = 8;

  // Roughness map (puddles in wet night mode!)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext('2d');
  rctx.fillStyle = wetMode ? '#6a6a6a' : '#dcdcdc';
  rctx.fillRect(0, 0, size, size);

  if (wetMode) {
    for (let p = 0; p < 16; p++) {
      const px = rand() * size;
      const py = rand() * size;
      const rad = 35 + rand() * 85;
      const g = rctx.createRadialGradient(px, py, rad * 0.1, px, py, rad);
      g.addColorStop(0, '#141414'); // mirror-like wet puddle
      g.addColorStop(0.65, '#2d2d2d');
      g.addColorStop(1, 'rgba(106,106,106,0)');
      rctx.fillStyle = g;
      rctx.beginPath();
      rctx.arc(px, py, rad, 0, Math.PI * 2);
      rctx.fill();
    }
  } else {
    for (let p = 0; p < 20; p++) {
      const px = rand() * size;
      const py = rand() * size;
      const rad = 25 + rand() * 60;
      const g = rctx.createRadialGradient(px, py, 4, px, py, rad);
      g.addColorStop(0, '#b5b5b5');
      g.addColorStop(1, 'rgba(220,220,220,0)');
      rctx.fillStyle = g;
      rctx.beginPath();
      rctx.arc(px, py, rad, 0, Math.PI * 2);
      rctx.fill();
    }
  }

  const roughTex = new THREE.CanvasTexture(roughCanvas);
  roughTex.wrapS = THREE.RepeatWrapping;
  roughTex.wrapT = THREE.RepeatWrapping;
  roughTex.repeat.set(14, 14);

  return { colorTex, roughTex };
}

/**
 * Creates the iconic MACK front radiator grille texture with horizontal louvers & MACK nameplate.
 */
export function createMackGrilleTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');

  // Dark honeycomb radiator background
  ctx.fillStyle = '#0c0f14';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle vertical radiator fins
  ctx.fillStyle = '#181e27';
  for (let x = 16; x < 496; x += 10) {
    ctx.fillRect(x, 16, 4, 480);
  }

  // Horizontal heavy chrome louvers
  for (let y = 38; y < 485; y += 44) {
    const grad = ctx.createLinearGradient(0, y, 0, y + 18);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(0.45, '#94a3b8');
    grad.addColorStop(1, '#334155');
    ctx.fillStyle = grad;
    ctx.fillRect(20, y, 472, 16);
  }

  // Diagonal heritage grille brace behind badge
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(70, 440);
  ctx.lineTo(442, 72);
  ctx.stroke();

  // Central MACK emblem plate
  ctx.fillStyle = '#11151c';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.roundRect(92, 198, 328, 96, 12);
  ctx.fill();
  ctx.stroke();

  // Inner gold pinstripe
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(102, 208, 308, 76, 7);
  ctx.stroke();

  // Bold "M A C K" block lettering
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 58px "Chakra Petch", Impact, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M A C K', 256, 249);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Creates the 53-foot Dry-Van Trailer Side Livery texture.
 */
export function createTrailerSideTexture(primaryHex = '#c41230', secondaryHex = '#d4af37') {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 512;
  const ctx = c.getContext('2d');

  // Brushed white-silver aluminum trailer skin
  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, '#f1f5f9');
  bg.addColorStop(0.65, '#e2e8f0');
  bg.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 2048, 512);

  // Vertical aluminum dry-van rib seams + rivets
  for (let x = 0; x < 2048; x += 36) {
    ctx.fillStyle = 'rgba(100, 116, 139, 0.18)';
    ctx.fillRect(x, 18, 3, 456);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(x + 3, 18, 2, 456);
  }

  // Top & bottom extruded aluminum rub rails
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, 0, 2048, 22);
  ctx.fillRect(0, 474, 2048, 38);

  // Bold Heritage Diagonal Stripes on rear third
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(1360, 22);
  ctx.lineTo(1560, 22);
  ctx.lineTo(1350, 474);
  ctx.lineTo(1150, 474);
  ctx.closePath();
  ctx.fillStyle = primaryHex;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(1585, 22);
  ctx.lineTo(1665, 22);
  ctx.lineTo(1455, 474);
  ctx.lineTo(1375, 474);
  ctx.closePath();
  ctx.fillStyle = secondaryHex;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(1690, 22);
  ctx.lineTo(2048, 22);
  ctx.lineTo(2048, 474);
  ctx.lineTo(1480, 474);
  ctx.closePath();
  ctx.fillStyle = '#141922';
  ctx.fill();
  ctx.restore();

  // MACK Diamond Crest & Typography
  ctx.save();
  ctx.translate(190, 235);
  ctx.fillStyle = '#141922';
  ctx.strokeStyle = secondaryHex;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, -95);
  ctx.lineTo(135, 0);
  ctx.lineTo(0, 95);
  ctx.lineTo(-135, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 54px "Chakra Petch", Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MACK', 0, 3);
  ctx.restore();

  // Main "MACK TRUCKS" Side Wordmark
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 118px "Chakra Petch", Impact, Arial Black, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('MACK TRUCKS', 365, 245);

  // Accent bar + Heritage slogan
  ctx.fillStyle = primaryHex;
  ctx.fillRect(370, 268, 760, 10);

  ctx.fillStyle = '#334155';
  ctx.font = '700 34px "Chakra Petch", Arial, sans-serif';
  ctx.fillText('HEAVY-DUTY LOGISTICS  •  ALLENTOWN, PA  •  EST. 1900', 370, 318);

  // Rear dark-zone badge text
  ctx.fillStyle = secondaryHex;
  ctx.font = '800 42px "Chakra Petch", Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('BULLDOG', 2000, 225);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 30px "JetBrains Mono", monospace';
  ctx.fillText('UNIT #1900', 2000, 272);

  // Front corner unit number (visible in West Coast mirrors!)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 28px "JetBrains Mono", monospace';
  ctx.fillText('53FT // MACK-01', 42, 74);

  // DOT-C2 Red & White Conspicuity Reflective Strip along lower rub rail
  const stripeY = 478;
  for (let x = 0; x < 2048; x += 64) {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x, stripeY, 38, 16);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x + 38, stripeY, 26, 16);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Creates a neutral parked-fleet trailer side texture for adjacent dock bays.
 */
export function createParkedTrailerTexture(brandTitle = 'BULLDOG FREIGHT', stripeHex = '#2563eb') {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#dce3ec';
  ctx.fillRect(0, 0, 1024, 256);

  for (let x = 0; x < 1024; x += 24) {
    ctx.fillStyle = 'rgba(71, 85, 105, 0.16)';
    ctx.fillRect(x, 10, 2, 230);
  }

  ctx.fillStyle = stripeHex;
  ctx.fillRect(0, 178, 1024, 24);

  ctx.fillStyle = '#1e293b';
  ctx.font = '800 54px "Chakra Petch", Arial Black, sans-serif';
  ctx.fillText(brandTitle, 64, 132);

  for (let x = 0; x < 1024; x += 48) {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x, 238, 28, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 28, 238, 20, 10);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Creates the Rear Swing Barn Doors texture for the 53' trailer.
 */
export function createTrailerRearTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');

  // Brushed aluminum doors
  ctx.fillStyle = '#dde4ee';
  ctx.fillRect(0, 0, 512, 512);

  // Outer steel frame
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, 494, 494);

  // Center door split seal (black rubber gasket)
  ctx.fillStyle = '#1e242d';
  ctx.fillRect(252, 16, 8, 480);

  // Four vertical galvanized locking cam-bars + keeper latches
  const rodX = [150, 215, 297, 362];
  for (const rx of rodX) {
    const g = ctx.createLinearGradient(rx - 6, 0, rx + 6, 0);
    g.addColorStop(0, '#94a3b8');
    g.addColorStop(0.5, '#f8fafc');
    g.addColorStop(1, '#475569');
    ctx.fillStyle = g;
    ctx.fillRect(rx - 5, 20, 10, 472);

    // Handle latch
    ctx.fillStyle = '#334155';
    ctx.fillRect(rx - 10, 315, 20, 42);
  }

  // Door hinges on left and right edges
  ctx.fillStyle = '#475569';
  for (const hy of [75, 195, 315, 430]) {
    ctx.fillRect(14, hy, 34, 18);
    ctx.fillRect(464, hy, 34, 18);
  }

  // MACK branding on left door
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 34px "Chakra Petch", Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MACK', 84, 128);
  ctx.fillStyle = '#c41230';
  ctx.fillRect(42, 138, 84, 6);

  // Caution Wide Turns decal on right door
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 3;
  ctx.fillRect(386, 210, 82, 56);
  ctx.strokeRect(386, 210, 82, 56);
  ctx.fillStyle = '#111827';
  ctx.font = '800 13px Arial, sans-serif';
  ctx.fillText('CAUTION', 427, 229);
  ctx.font = '700 11px Arial, sans-serif';
  ctx.fillText('WIDE TURNS', 427, 246);
  ctx.fillText('STAY BACK', 427, 260);

  // Bottom DOT reflective strip
  for (let x = 18; x < 494; x += 48) {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x, 476, 28, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 28, 476, 20, 14);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Creates a rubber mudflap texture featuring "MACK" and gold stripe.
 */
export function createMudflapTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#12151a';
  ctx.fillRect(0, 0, 256, 256);

  // Chrome top mounting bracket
  const g = ctx.createLinearGradient(0, 0, 0, 34);
  g.addColorStop(0, '#f8fafc');
  g.addColorStop(1, '#64748b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 32);

  // Gold border & MACK text
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 50, 220, 186);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 52px "Chakra Petch", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MACK', 128, 198);

  // Stylized geometric Bulldog shield icon above MACK
  ctx.fillStyle = '#d4af37';
  ctx.beginPath();
  ctx.moveTo(128, 72);
  ctx.lineTo(168, 106);
  ctx.lineTo(152, 138);
  ctx.lineTo(104, 138);
  ctx.lineTo(88, 106);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates Dock Bay overhead sign texture ("BAY 01" .. "BAY 06").
 */
export function createBaySignTexture(bayNumber, isTarget = false) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d');

  ctx.fillStyle = isTarget ? '#064e3b' : '#161b24';
  ctx.fillRect(0, 0, 512, 160);

  ctx.strokeStyle = isTarget ? '#4ade80' : '#94a3b8';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 144);

  ctx.fillStyle = isTarget ? '#4ade80' : '#f1f5f9';
  ctx.font = '900 78px "Chakra Petch", Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = `BAY 0${bayNumber}`;
  ctx.fillText(label, 256, 84);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates painted asphalt number stencil on dock apron (readable upright from yard).
 */
export function createApronNumberTexture(bayNumber, isTarget = false) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');

  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = isTarget ? 'rgba(74, 222, 128, 0.88)' : 'rgba(250, 204, 21, 0.65)';
  ctx.font = '900 132px "Chakra Petch", Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`0${bayNumber}`, 128, 132);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates corrugated warehouse steel wall texture.
 */
export function createWarehouseWallTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#3c4452';
  ctx.fillRect(0, 0, 512, 512);

  for (let x = 0; x < 512; x += 16) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.fillRect(x, 0, 6, 512);
    ctx.fillStyle = 'rgba(226, 232, 240, 0.12)';
    ctx.fillRect(x + 6, 0, 4, 512);
  }

  // Horizontal structural panel seam
  for (let y = 0; y < 512; y += 128) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fillRect(0, y, 512, 4);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 2);
  return tex;
}

/**
 * Generates an equirectangular environment reflection map via PMREMGenerator
 * so chrome and clearcoat car paint sparkle in Day, Dusk, and Night presets!
 */
export function createProceduralEnvMap(renderer, mode = 'day') {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');

  const skyGrad = ctx.createLinearGradient(0, 0, 0, 512);
  if (mode === 'day') {
    skyGrad.addColorStop(0.0, '#1d4ed8');
    skyGrad.addColorStop(0.38, '#60a5fa');
    skyGrad.addColorStop(0.49, '#dbeafe');
    skyGrad.addColorStop(0.51, '#334155');
    skyGrad.addColorStop(1.0, '#1e293b');
  } else if (mode === 'dusk') {
    skyGrad.addColorStop(0.0, '#1e1b4b');
    skyGrad.addColorStop(0.28, '#7c2d12');
    skyGrad.addColorStop(0.47, '#fb923c');
    skyGrad.addColorStop(0.5, '#fde047');
    skyGrad.addColorStop(0.52, '#27272a');
    skyGrad.addColorStop(1.0, '#18181b');
  } else {
    // Floodlit night
    skyGrad.addColorStop(0.0, '#050811');
    skyGrad.addColorStop(0.45, '#0f172a');
    skyGrad.addColorStop(0.5, '#1e293b');
    skyGrad.addColorStop(0.53, '#0f131a');
    skyGrad.addColorStop(1.0, '#090b10');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Bright sun / stadium light hotspots for crisp chrome reflections!
  const spots =
    mode === 'night'
      ? [
          { x: 200, y: 190, r: 45, col: 'rgba(255, 244, 214, 0.95)' },
          { x: 512, y: 175, r: 50, col: 'rgba(224, 242, 254, 0.95)' },
          { x: 820, y: 190, r: 45, col: 'rgba(255, 237, 213, 0.95)' },
        ]
      : mode === 'dusk'
        ? [{ x: 740, y: 220, r: 95, col: 'rgba(254, 240, 138, 1.0)' }]
        : [{ x: 320, y: 130, r: 85, col: 'rgba(255, 255, 255, 1.0)' }];

  for (const s of spots) {
    const g = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.r);
    g.addColorStop(0, s.col);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const eqTex = new THREE.CanvasTexture(c);
  eqTex.mapping = THREE.EquirectangularReflectionMapping;
  eqTex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromEquirectangular(eqTex);
  eqTex.dispose();
  pmrem.dispose();
  return envRT;
}
