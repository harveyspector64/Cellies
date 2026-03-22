// YARD — Environment (Names, PRNG, Procedural Yard & Cell)
// ============================================================
// NAMES
// ============================================================
const FIRST_NAMES = ['Lil','Big','Tiny','Slim','Ghost','Shadow','Demon','Ace','Duke','Rook',
  'Snake','Bull','Spider','Tank','Bones','Reaper','Flaco','Lobo','Diablo','Joker',
  'Puppet','Boxer','Trigger','Casper','Sleepy','Dopey','Chino','Primo','Termite','Droopy',
  'Loco','Huero','Shorty','Syko','Creeper','Stomper','Menace','Smiley','Villain','Wicked'];

function randomName() { return randItem(FIRST_NAMES); }

// ============================================================
// SEEDED PRNG (mulberry32)
// ============================================================
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ============================================================
// PROCEDURAL YARD RENDERER — Phase 2
// ============================================================
class ProceduralYard {
  constructor(worldW, worldH) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.canvas = document.createElement('canvas');
    this.canvas.width = worldW;
    this.canvas.height = worldH;
    this.ctx = this.canvas.getContext('2d');
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.width = worldW;
    this.overlayCanvas.height = worldH;
    this.overlayCtx = this.overlayCanvas.getContext('2d');
    this._generate();
    this._generateOverlay();
  }

  _generate() {
    const c = this.ctx;
    const w = this.worldW;
    const h = this.worldH;
    const rng = mulberry32(42);

    // === Layer 1: Base concrete with subtle variation ===
    const baseR = 122, baseG = 117, baseB = 108;
    const blockSize = 6;
    for (let bx = 0; bx < w; bx += blockSize) {
      for (let by = 0; by < h; by += blockSize) {
        const noise = (rng() - 0.5) * 14;
        const r = clamp(baseR + noise + (rng() - 0.5) * 6, 0, 255);
        const g = clamp(baseG + noise + (rng() - 0.5) * 4, 0, 255);
        const b = clamp(baseB + noise + (rng() - 0.5) * 4, 0, 255);
        c.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
        c.fillRect(bx, by, blockSize, blockSize);
      }
    }

    // === Layer 2: Concrete slab seams ===
    c.strokeStyle = 'rgba(0,0,0,0.07)';
    c.lineWidth = 1;
    // Horizontal seams
    for (let y = 0; y < h; y += 80 + Math.floor(rng() * 40)) {
      const jitter = (rng() - 0.5) * 2;
      c.beginPath();
      c.moveTo(0, y + jitter);
      c.lineTo(w, y + jitter + (rng() - 0.5) * 3);
      c.stroke();
    }
    // Vertical seams
    for (let x = 0; x < w; x += 90 + Math.floor(rng() * 50)) {
      const jitter = (rng() - 0.5) * 2;
      c.beginPath();
      c.moveTo(x + jitter, 0);
      c.lineTo(x + jitter + (rng() - 0.5) * 3, h);
      c.stroke();
    }

    // Slightly different slab tones in some sections
    for (let i = 0; i < 8; i++) {
      const sx = rng() * w;
      const sy = rng() * h;
      const sw = 60 + rng() * 120;
      const sh = 50 + rng() * 100;
      c.fillStyle = rng() > 0.5 ? 'rgba(0,0,0,0.015)' : 'rgba(255,255,255,0.012)';
      c.fillRect(sx, sy, sw, sh);
    }

    // === Layer 3: Cracks ===
    for (let i = 0; i < 20; i++) {
      let cx = rng() * w;
      let cy = rng() * h;
      const len = 15 + rng() * 60;
      let ang = rng() * Math.PI * 2;
      c.strokeStyle = `rgba(0,0,0,${0.08 + rng() * 0.1})`;
      c.lineWidth = 0.5 + rng() * 1;
      c.beginPath();
      c.moveTo(cx, cy);
      for (let s = 0; s < len; s += 3) {
        ang += (rng() - 0.5) * 0.8;
        cx += Math.cos(ang) * 3;
        cy += Math.sin(ang) * 3;
        c.lineTo(cx, cy);
      }
      c.stroke();
      // Thin highlight next to crack (light catching edge)
      c.strokeStyle = 'rgba(255,255,255,0.03)';
      c.lineWidth = 0.5;
      c.beginPath();
      c.moveTo(cx + 1, cy + 1);
      c.lineTo(cx - Math.cos(ang) * 5, cy - Math.sin(ang) * 5);
      c.stroke();
    }

    // === Layer 4: Stains and weathering ===
    // Dark stains (oil, dirt)
    for (let i = 0; i < 12; i++) {
      const sx = rng() * w;
      const sy = rng() * h;
      const radius = 10 + rng() * 30;
      const grad = c.createRadialGradient(sx, sy, 0, sx, sy, radius);
      const alpha = 0.03 + rng() * 0.05;
      grad.addColorStop(0, `rgba(40,30,20,${alpha})`);
      grad.addColorStop(1, 'rgba(40,30,20,0)');
      c.fillStyle = grad;
      c.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
    }
    // Water marks (lighter)
    for (let i = 0; i < 6; i++) {
      const sx = rng() * w;
      const sy = rng() * h;
      const radius = 8 + rng() * 20;
      const grad = c.createRadialGradient(sx, sy, 0, sx, sy, radius);
      grad.addColorStop(0, `rgba(160,155,145,0.04)`);
      grad.addColorStop(1, 'rgba(160,155,145,0)');
      c.fillStyle = grad;
      c.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
    }

    // === Layer 5: Faded basketball court lines ===
    const courtCX = w * 0.5;
    const courtCY = h * 0.5;
    const courtW = Math.min(w * 0.6, 500);
    const courtH = Math.min(h * 0.7, 400);

    c.strokeStyle = 'rgba(255,255,255,0.045)';
    c.lineWidth = 2;

    // Court rectangle
    c.strokeRect(courtCX - courtW / 2, courtCY - courtH / 2, courtW, courtH);

    // Center line
    c.beginPath();
    c.moveTo(courtCX - courtW / 2, courtCY);
    c.lineTo(courtCX + courtW / 2, courtCY);
    c.stroke();

    // Center circle
    c.beginPath();
    c.arc(courtCX, courtCY, 40, 0, Math.PI * 2);
    c.stroke();

    // Free throw areas (top and bottom)
    const ftW = 80;
    const ftH = courtH * 0.25;
    c.strokeRect(courtCX - ftW / 2, courtCY - courtH / 2, ftW, ftH);
    c.strokeRect(courtCX - ftW / 2, courtCY + courtH / 2 - ftH, ftW, ftH);

    // Free throw circles
    c.beginPath();
    c.arc(courtCX, courtCY - courtH / 2 + ftH, 25, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.arc(courtCX, courtCY + courtH / 2 - ftH, 25, 0, Math.PI * 2);
    c.stroke();

    // Three point arcs
    c.setLineDash([4, 6]);
    c.strokeStyle = 'rgba(255,255,255,0.03)';
    c.beginPath();
    c.arc(courtCX, courtCY - courtH / 2, courtW * 0.35, 0.3, Math.PI - 0.3);
    c.stroke();
    c.beginPath();
    c.arc(courtCX, courtCY + courtH / 2, courtW * 0.35, Math.PI + 0.3, -0.3);
    c.stroke();
    c.setLineDash([]);

    // === Layer 6: Drain grates ===
    for (let i = 0; i < 3; i++) {
      const gx = 60 + rng() * (w - 120);
      const gy = 40 + rng() * (h - 80);
      const gw = 16;
      const gh = 16;
      c.fillStyle = '#3a3530';
      c.fillRect(gx, gy, gw, gh);
      c.strokeStyle = '#2a2520';
      c.lineWidth = 1;
      c.strokeRect(gx, gy, gw, gh);
      // Cross-hatch
      c.strokeStyle = '#4a4540';
      c.lineWidth = 0.5;
      for (let s = 0; s < gw; s += 4) {
        c.beginPath();
        c.moveTo(gx + s, gy);
        c.lineTo(gx + s, gy + gh);
        c.stroke();
      }
      for (let s = 0; s < gh; s += 4) {
        c.beginPath();
        c.moveTo(gx, gy + s);
        c.lineTo(gx + gw, gy + s);
        c.stroke();
      }
    }

    // === Layer 7: Bench shadows along south wall ===
    for (let i = 0; i < 2; i++) {
      const bx = w * 0.2 + i * w * 0.45;
      const by = h - 35;
      // Bench body
      c.fillStyle = '#5a5045';
      c.fillRect(bx, by, 50, 8);
      c.fillRect(bx + 2, by + 8, 4, 6);
      c.fillRect(bx + 44, by + 8, 4, 6);
      // Shadow
      c.fillStyle = 'rgba(0,0,0,0.06)';
      c.fillRect(bx + 3, by + 14, 48, 6);
    }

    // === Layer 8: Fence posts (ground level) — drawn on base ===
    const fenceInset = 6;
    const postSpacing = 60;
    c.fillStyle = '#4a4540';
    // Top and bottom posts
    for (let x = 0; x < w; x += postSpacing) {
      c.fillRect(x, 0, 6, fenceInset + 4);
      c.fillRect(x, h - fenceInset - 4, 6, fenceInset + 4);
    }
    // Left and right posts
    for (let y = 0; y < h; y += postSpacing) {
      c.fillRect(0, y, fenceInset + 4, 6);
      c.fillRect(w - fenceInset - 4, y, fenceInset + 4, 6);
    }

    // === Layer 9: Guard tower shadow ===
    c.fillStyle = 'rgba(0,0,0,0.035)';
    // Diagonal shadow from top-left corner
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(120, 0);
    c.lineTo(200, 140);
    c.lineTo(80, 140);
    c.closePath();
    c.fill();
  }

  _generateOverlay() {
    // Fence overlay that draws ON TOP of fighters (razor wire, chain link upper)
    const c = this.overlayCtx;
    const w = this.worldW;
    const h = this.worldH;
    const fenceH = 14;

    // Chain-link diamond mesh pattern around perimeter
    c.strokeStyle = 'rgba(90,85,75,0.5)';
    c.lineWidth = 0.5;
    const meshSize = 6;
    // Top fence
    for (let x = 0; x < w; x += meshSize) {
      for (let row = 0; row < 2; row++) {
        const y = row * meshSize;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + meshSize / 2, y + meshSize / 2);
        c.lineTo(x + meshSize, y);
        c.stroke();
        c.beginPath();
        c.moveTo(x, y + meshSize);
        c.lineTo(x + meshSize / 2, y + meshSize / 2);
        c.lineTo(x + meshSize, y + meshSize);
        c.stroke();
      }
    }
    // Bottom fence
    for (let x = 0; x < w; x += meshSize) {
      for (let row = 0; row < 2; row++) {
        const y = h - fenceH + row * meshSize;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + meshSize / 2, y + meshSize / 2);
        c.lineTo(x + meshSize, y);
        c.stroke();
        c.beginPath();
        c.moveTo(x, y + meshSize);
        c.lineTo(x + meshSize / 2, y + meshSize / 2);
        c.lineTo(x + meshSize, y + meshSize);
        c.stroke();
      }
    }
    // Left fence
    for (let y = 0; y < h; y += meshSize) {
      for (let col = 0; col < 2; col++) {
        const x = col * meshSize;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + meshSize / 2, y + meshSize / 2);
        c.lineTo(x, y + meshSize);
        c.stroke();
        c.beginPath();
        c.moveTo(x + meshSize, y);
        c.lineTo(x + meshSize / 2, y + meshSize / 2);
        c.lineTo(x + meshSize, y + meshSize);
        c.stroke();
      }
    }
    // Right fence
    for (let y = 0; y < h; y += meshSize) {
      for (let col = 0; col < 2; col++) {
        const x = w - fenceH + col * meshSize;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + meshSize / 2, y + meshSize / 2);
        c.lineTo(x, y + meshSize);
        c.stroke();
        c.beginPath();
        c.moveTo(x + meshSize, y);
        c.lineTo(x + meshSize / 2, y + meshSize / 2);
        c.lineTo(x + meshSize, y + meshSize);
        c.stroke();
      }
    }

    // Razor wire — coiled zigzag along all edges
    c.strokeStyle = 'rgba(140,140,130,0.6)';
    c.lineWidth = 1;
    const rzH = 5;
    // Top razor wire
    c.beginPath();
    for (let x = 0; x < w; x += 6) {
      c.lineTo(x, (x / 6 % 2 === 0) ? 1 : rzH);
    }
    c.stroke();
    // Bottom razor wire
    c.beginPath();
    for (let x = 0; x < w; x += 6) {
      c.lineTo(x, h - ((x / 6 % 2 === 0) ? 1 : rzH));
    }
    c.stroke();
    // Left razor wire
    c.beginPath();
    for (let y = 0; y < h; y += 6) {
      c.lineTo((y / 6 % 2 === 0) ? 1 : rzH, y);
    }
    c.stroke();
    // Right razor wire
    c.beginPath();
    for (let y = 0; y < h; y += 6) {
      c.lineTo(w - ((y / 6 % 2 === 0) ? 1 : rzH), y);
    }
    c.stroke();

    // Razor wire glints (small bright dots)
    c.fillStyle = 'rgba(200,200,190,0.5)';
    for (let x = 0; x < w; x += 18) {
      c.fillRect(x, 2, 1, 1);
      c.fillRect(x + 3, h - 3, 1, 1);
    }
    for (let y = 0; y < h; y += 18) {
      c.fillRect(2, y, 1, 1);
      c.fillRect(w - 3, y + 3, 1, 1);
    }
  }

  draw(ctx) {
    ctx.drawImage(this.canvas, 0, 0);
  }

  drawOverlay(ctx) {
    ctx.drawImage(this.overlayCanvas, 0, 0);
  }
}

// ============================================================
// PROCEDURAL CELL — Batch 3
// ============================================================
class ProceduralCell {
  constructor(worldW, worldH) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.canvas = document.createElement('canvas');
    this.canvas.width = worldW;
    this.canvas.height = worldH;
    this.ctx = this.canvas.getContext('2d');
    this._generate();
  }

  _generate() {
    const c = this.ctx;
    const w = this.worldW;
    const h = this.worldH;
    const rng = mulberry32(77);

    // Floor — dingy concrete/linoleum
    const baseR = 95, baseG = 90, baseB = 82;
    for (let bx = 0; bx < w; bx += 4) {
      for (let by = 0; by < h; by += 4) {
        const noise = (rng() - 0.5) * 12;
        const r = clamp(baseR + noise, 0, 255);
        const g = clamp(baseG + noise, 0, 255);
        const b = clamp(baseB + noise, 0, 255);
        c.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
        c.fillRect(bx, by, 4, 4);
      }
    }

    // Walls — thick dark borders (top, left, right — bottom is open bars)
    const wallThick = 16;
    c.fillStyle = '#3a3530';
    c.fillRect(0, 0, w, wallThick);          // top wall
    c.fillRect(0, 0, wallThick, h);          // left wall
    c.fillRect(w - wallThick, 0, wallThick, h); // right wall

    // Wall texture
    c.fillStyle = '#2a2520';
    for (let x = wallThick; x < w - wallThick; x += 20 + Math.floor(rng() * 10)) {
      c.fillRect(x, 0, 1, wallThick);
    }
    for (let y = 0; y < h; y += 15 + Math.floor(rng() * 8)) {
      c.fillRect(0, y, wallThick, 1);
      c.fillRect(w - wallThick, y, wallThick, 1);
    }

    // Back wall shadow
    c.fillStyle = 'rgba(0,0,0,0.08)';
    c.fillRect(wallThick, wallThick, w - wallThick * 2, 30);

    // Bunk bed (left side) — metal frame
    const bunkX = wallThick + 4;
    const bunkY = wallThick + 8;
    const bunkW = 55;
    const bunkH = 70;
    // Frame
    c.fillStyle = '#4a4540';
    c.fillRect(bunkX, bunkY, bunkW, 3);
    c.fillRect(bunkX, bunkY + bunkH, bunkW, 3);
    c.fillRect(bunkX, bunkY, 3, bunkH + 3);
    c.fillRect(bunkX + bunkW - 3, bunkY, 3, bunkH + 3);
    // Mattress top bunk
    c.fillStyle = '#5a5548';
    c.fillRect(bunkX + 4, bunkY + 4, bunkW - 8, 20);
    // Lower bunk mattress
    c.fillStyle = '#5a5548';
    c.fillRect(bunkX + 4, bunkY + bunkH - 22, bunkW - 8, 20);

    // Toilet (right wall)
    const toiletX = w - wallThick - 22;
    const toiletY = h - 40;
    c.fillStyle = '#7a7a72';
    c.fillRect(toiletX, toiletY, 16, 16);
    c.fillStyle = '#8a8a82';
    c.fillRect(toiletX + 2, toiletY + 2, 12, 10);
    c.fillStyle = '#6a6a62';
    c.fillRect(toiletX + 4, toiletY - 10, 8, 12);

    // Sink (right wall, higher up)
    const sinkX = w - wallThick - 20;
    const sinkY = wallThick + 30;
    c.fillStyle = '#8a8a82';
    c.fillRect(sinkX, sinkY, 14, 10);
    c.fillStyle = '#7a7a72';
    c.fillRect(sinkX + 2, sinkY + 2, 10, 6);

    // Stains on floor
    for (let i = 0; i < 5; i++) {
      const sx = wallThick + rng() * (w - wallThick * 2);
      const sy = wallThick + rng() * (h - wallThick - 10);
      const radius = 5 + rng() * 10;
      const grad = c.createRadialGradient(sx, sy, 0, sx, sy, radius);
      grad.addColorStop(0, `rgba(40,35,25,${0.03 + rng() * 0.04})`);
      grad.addColorStop(1, 'rgba(40,35,25,0)');
      c.fillStyle = grad;
      c.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
    }

    // Cell bars at bottom
    c.fillStyle = '#5a5550';
    const barSpacing = 12;
    for (let x = wallThick; x < w - wallThick; x += barSpacing) {
      c.fillRect(x, h - 14, 3, 14);
    }
    // Horizontal bar
    c.fillRect(wallThick, h - 14, w - wallThick * 2, 2);
    c.fillRect(wallThick, h - 3, w - wallThick * 2, 3);

    // Dim overhead light glow (center ceiling)
    const lightX = w / 2;
    const lightY = wallThick;
    const lightGrad = c.createRadialGradient(lightX, lightY, 0, lightX, lightY + 60, 80);
    lightGrad.addColorStop(0, 'rgba(180,170,140,0.06)');
    lightGrad.addColorStop(1, 'rgba(180,170,140,0)');
    c.fillStyle = lightGrad;
    c.fillRect(0, 0, w, h);
  }

  draw(ctx) {
    ctx.drawImage(this.canvas, 0, 0);
  }

  drawOverlay(ctx) {
    // No overlay for cell (no fence/razor wire)
  }
}
