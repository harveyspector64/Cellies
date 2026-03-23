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

// ============================================================
// PROCEDURAL MEDICAL BAY — Tournament loss / recovery screen
// ============================================================
class ProceduralMedical {
  constructor() {
    // Small confined room — prison infirmary, not a hospital
    this.roomW = 320;
    this.roomH = 200;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.roomW;
    this.canvas.height = this.roomH;
    this.ctx = this.canvas.getContext('2d');
    this._generate();
  }

  _generate() {
    const c = this.ctx;
    const w = this.roomW;
    const h = this.roomH;
    const rng = mulberry32(42);

    // Floor — pale greenish-grey linoleum tile
    const baseR = 145, baseG = 155, baseB = 140;
    for (let bx = 0; bx < w; bx += 3) {
      for (let by = 0; by < h; by += 3) {
        const noise = (rng() - 0.5) * 10;
        c.fillStyle = `rgb(${Math.floor(baseR + noise)},${Math.floor(baseG + noise)},${Math.floor(baseB + noise)})`;
        c.fillRect(bx, by, 3, 3);
      }
    }

    // Tile grid lines
    c.strokeStyle = 'rgba(0,0,0,0.05)';
    c.lineWidth = 1;
    for (let x = 0; x < w; x += 24) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
    }
    for (let y = 0; y < h; y += 24) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
    }

    // Walls — three sides (top, left, right)
    const wallH = 48;
    const wallSide = 20;
    // Back wall
    c.fillStyle = '#8a9088';
    c.fillRect(0, 0, w, wallH);
    c.fillStyle = '#6a7068';
    c.fillRect(0, wallH - 3, w, 3);
    // Left wall
    c.fillStyle = '#7e8880';
    c.fillRect(0, 0, wallSide, h);
    c.fillStyle = '#6a7068';
    c.fillRect(wallSide - 2, wallH, 2, h - wallH);
    // Right wall
    c.fillStyle = '#7e8880';
    c.fillRect(w - wallSide, 0, wallSide, h);
    c.fillStyle = '#6a7068';
    c.fillRect(w - wallSide, wallH, 2, h - wallH);

    // Wall texture
    c.strokeStyle = 'rgba(0,0,0,0.03)';
    for (let y = 6; y < wallH - 3; y += 5 + Math.floor(rng() * 3)) {
      c.beginPath(); c.moveTo(wallSide, y); c.lineTo(w - wallSide, y); c.stroke();
    }

    // Medical cot/bed — left-center of room
    const bedX = wallSide + 28;
    const bedY = wallH + 22;
    const bedW = 90;
    const bedH = 36;

    // Bed shadow
    c.fillStyle = 'rgba(0,0,0,0.08)';
    c.fillRect(bedX + 3, bedY + bedH + 2, bedW, 6);

    // Frame — metal grey
    c.fillStyle = '#585858';
    c.fillRect(bedX, bedY, bedW, bedH);
    c.fillStyle = '#4a4a4a';
    c.fillRect(bedX, bedY, bedW, 2);
    c.fillRect(bedX, bedY + bedH - 2, bedW, 2);
    c.fillRect(bedX, bedY, 2, bedH);
    c.fillRect(bedX + bedW - 2, bedY, 2, bedH);
    // Headboard — slightly taller
    c.fillStyle = '#505050';
    c.fillRect(bedX, bedY - 4, 3, bedH + 4);
    // Mattress
    c.fillStyle = '#c4c0b4';
    c.fillRect(bedX + 3, bedY + 3, bedW - 6, bedH - 6);
    // Pillow
    c.fillStyle = '#ccc8bc';
    c.fillRect(bedX + 5, bedY + 7, 18, bedH - 14);
    c.fillStyle = '#d4d0c4';
    c.fillRect(bedX + 6, bedY + 8, 16, bedH - 16);
    // Sheet wrinkles
    c.strokeStyle = 'rgba(0,0,0,0.04)';
    for (let x = bedX + 26; x < bedX + bedW - 8; x += 10 + Math.floor(rng() * 6)) {
      c.beginPath(); c.moveTo(x, bedY + 5); c.lineTo(x + 3, bedY + bedH - 5); c.stroke();
    }
    // Bed legs
    c.fillStyle = '#404040';
    c.fillRect(bedX, bedY + bedH, 3, 5);
    c.fillRect(bedX + bedW - 3, bedY + bedH, 3, 5);

    // IV stand — between bed and right side
    const ivX = bedX + bedW + 10;
    const ivY = bedY - 14;
    c.fillStyle = '#606060';
    c.fillRect(ivX, ivY, 2, 52);
    c.fillRect(ivX - 4, ivY + 48, 10, 2);
    // IV bag
    c.fillStyle = '#a0c0d0';
    c.fillRect(ivX - 3, ivY, 8, 11);
    c.fillStyle = '#80a8b8';
    c.fillRect(ivX - 2, ivY + 1, 6, 9);
    // Tube
    c.strokeStyle = 'rgba(120,160,170,0.6)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(ivX + 1, ivY + 11);
    c.quadraticCurveTo(ivX + 1, ivY + 28, bedX + bedW - 4, bedY + 8);
    c.stroke();

    // Supply cabinet against back wall, right side
    const cabX = w - wallSide - 46;
    const cabY = wallH + 1;
    const cabW = 40;
    const cabH = 46;
    c.fillStyle = '#6e7870';
    c.fillRect(cabX, cabY, cabW, cabH);
    // Drawers
    c.fillStyle = '#5e6860';
    c.fillRect(cabX + 2, cabY + 2, cabW - 4, 13);
    c.fillRect(cabX + 2, cabY + 17, cabW - 4, 13);
    c.fillRect(cabX + 2, cabY + 32, cabW - 4, 12);
    // Handles
    c.fillStyle = '#8a928a';
    c.fillRect(cabX + cabW / 2 - 3, cabY + 10, 6, 2);
    c.fillRect(cabX + cabW / 2 - 3, cabY + 25, 6, 2);
    c.fillRect(cabX + cabW / 2 - 3, cabY + 39, 6, 2);

    // Clipboard on wall above cabinet
    c.fillStyle = '#907860';
    c.fillRect(cabX + cabW / 2 - 5, wallH - 18, 10, 16);
    c.fillStyle = '#d8d0c0';
    c.fillRect(cabX + cabW / 2 - 4, wallH - 16, 8, 12);
    // Clip
    c.fillStyle = '#808080';
    c.fillRect(cabX + cabW / 2 - 3, wallH - 19, 6, 3);

    // Small stool next to bed for nurse
    const stoolX = bedX + bedW + 26;
    const stoolY = bedY + bedH - 6;
    c.fillStyle = '#585858';
    c.fillRect(stoolX, stoolY, 14, 10);
    c.fillStyle = '#505050';
    c.fillRect(stoolX + 1, stoolY + 10, 3, 4);
    c.fillRect(stoolX + 10, stoolY + 10, 3, 4);

    // Fluorescent light strip on ceiling — cool white
    c.fillStyle = 'rgba(200,210,195,0.12)';
    c.fillRect(w * 0.3, 4, w * 0.4, 6);
    // Light glow
    const lightGrad = c.createRadialGradient(w * 0.5, 0, 5, w * 0.5, h * 0.4, w * 0.45);
    lightGrad.addColorStop(0, 'rgba(220,228,210,0.06)');
    lightGrad.addColorStop(1, 'rgba(220,228,210,0)');
    c.fillStyle = lightGrad;
    c.fillRect(0, 0, w, h);

    // Doorway at bottom-right — opening in right wall
    const doorY = h - 60;
    const doorW = 28;
    const doorH = 50;
    // Door opening — darker to suggest hallway beyond
    c.fillStyle = '#3a3e3a';
    c.fillRect(w - wallSide - 2, doorY, wallSide + 4, doorH);
    // Door frame
    c.fillStyle = '#5a5e58';
    c.fillRect(w - wallSide - 3, doorY - 2, 3, doorH + 4);
    c.fillRect(w - wallSide - 3, doorY - 2, wallSide + 5, 3);
    // Hallway depth hint
    c.fillStyle = '#444844';
    c.fillRect(w - wallSide, doorY + 1, wallSide, doorH - 2);

    // Small red cross on back wall — medical marker
    const crossX = w * 0.5;
    const crossY = wallH - 28;
    c.fillStyle = '#8a3030';
    c.fillRect(crossX - 5, crossY, 10, 3);
    c.fillRect(crossX - 1.5, crossY - 4, 3, 11);

    // Biohazard bin near door
    const binX = w - wallSide - 20;
    const binY = doorY - 18;
    c.fillStyle = '#8a3535';
    c.fillRect(binX, binY, 14, 16);
    c.fillStyle = '#702828';
    c.fillRect(binX + 1, binY + 1, 12, 3);
    // Lid
    c.fillStyle = '#993838';
    c.fillRect(binX - 1, binY - 2, 16, 3);

    // Floor stains — cleaning marks and old scuffs
    for (let i = 0; i < 3; i++) {
      const sx = wallSide + 10 + rng() * (w - wallSide * 2 - 20);
      const sy = wallH + 10 + rng() * (h - wallH - 20);
      const radius = 4 + rng() * 8;
      const grad = c.createRadialGradient(sx, sy, 0, sx, sy, radius);
      grad.addColorStop(0, `rgba(100,90,70,${0.02 + rng() * 0.03})`);
      grad.addColorStop(1, 'rgba(100,90,70,0)');
      c.fillStyle = grad;
      c.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
    }

    // Mop streak marks on floor
    c.strokeStyle = 'rgba(160,165,155,0.06)';
    c.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const mx = wallSide + 20 + rng() * (w - wallSide * 2 - 40);
      const my = wallH + 30 + rng() * (h - wallH - 60);
      c.beginPath();
      c.moveTo(mx, my);
      c.quadraticCurveTo(mx + 20 + rng() * 30, my + rng() * 20 - 10, mx + 40 + rng() * 40, my + rng() * 15);
      c.stroke();
    }

    // Store positions for sprites
    this.bedX = bedX;
    this.bedY = bedY;
    this.bedW = bedW;
    this.bedH = bedH;
    this.nurseX = stoolX + 7;
    this.nurseY = bedY + bedH * 0.3;
    this.guardX = w - wallSide - 14; // guard stands by door
    this.guardY = doorY - 4;
    this.wallH = wallH;
  }

  draw(ctx) {
    // Draw zoomed and centered on the canvas
    const scaleX = CANVAS_W / this.roomW;
    const scaleY = CANVAS_H / this.roomH;
    const scale = Math.max(scaleX, scaleY);
    const dx = (CANVAS_W - this.roomW * scale) / 2;
    const dy = (CANVAS_H - this.roomH * scale) / 2;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.scale(scale, scale);
    ctx.drawImage(this.canvas, 0, 0);
    ctx.restore();
  }
}

// ============================================================
// LIVING CELL — Interactive home cell using hand-drawn art
// ============================================================
// Uses artist-made sprites composited with z-axis depth scaling.
// Art is at 32px character density. Engine scales everything up.
//
// Coordinate system:
//   Y=0 is the BACK wall (far from camera, objects draw smaller)
//   Y=cellH is the FRONT (bars/door, close to camera, objects draw bigger)
//   depthScale(y) returns a scale multiplier: ~0.82 at back, 1.0 at front
//
class LivingCell {
  constructor() {
    // Cell art dimensions (pixels at art density)
    this.artW = 64;   // cell background width
    this.artH = 48;   // cell background height

    // World dimensions = art × base scale
    this.scale = SM().SCALE;  // 2.5 for 32-bit
    this.worldW = this.artW * this.scale;   // 160
    this.worldH = this.artH * this.scale;   // 120

    // Camera zoom to fill screen
    const zoomX = CANVAS_W / this.worldW;
    const zoomY = CANVAS_H / this.worldH;
    this.zoom = Math.min(zoomX, zoomY) * 0.92;

    // Depth scaling — z-axis perspective, spread across the full floor range
    this.depthNear = 1.25;   // bigger up front — character towers over toilet/sink
    this.depthFar = 0.82;    // smaller at back wall — wider range = more gradual scaling

    // Floor area — narrow strip at bottom of cell, full width
    this.floorBackY = 44;   // where floor visually starts
    this.floorFrontY = 60;  // well past bottom edge — characters clip at waist up front
    this.floorLeftX = 3;    // tight to left wall at floor level
    this.floorRightX = 61;  // tight to right wall at floor level

    // Furniture definitions — positions are in art pixels
    // footY = bottom edge of sprite in art pixels
    // layer: 'back' = always behind characters, 'sort' = Y-sorted with characters
    this.furniture = {
      bunk: {
        assetKey: 'loc_bunk',
        sprW: 32, sprH: 32,
        left: 3, top: 11,
        layer: 'back',
      },
      toilet: {
        assetKey: 'loc_toilet',
        sprW: 32, sprH: 32,
        left: 40, top: 28,
        sortY: 56,
        layer: 'sort',
      },
    };

    // Interactive spots
    this.spots = {
      bunk:   { x: 16, y: 24, label: 'BUNK' },
      toilet: { x: 52, y: 46, label: 'TOILET' },
      door:   { x: 32, y: 48, label: 'DOOR' },
    };
  }

  // Returns depth scale for a given Y in art-pixel space
  depthScale(artY) {
    const t = clamp(artY / this.artH, 0, 1);
    return this.depthFar + (this.depthNear - this.depthFar) * t;
  }

  // Draw the cell background
  drawBackground(ctx) {
    const cellBg = assets['loc_cell'];
    if (!cellBg) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cellBg, 0, 0, this.artW, this.artH,
      0, 0, this.worldW, this.worldH);
  }

  // Draw a furniture piece at its top-left art pixel position, scaled up
  _drawFurnitureItem(ctx, item) {
    const sheet = assets[item.assetKey];
    if (!sheet) return;
    const dw = item.sprW * this.scale;
    const dh = item.sprH * this.scale;
    const dx = item.left * this.scale;
    const dy = item.top * this.scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, 0, 0, item.sprW, item.sprH, dx, dy, dw, dh);
  }

  // Draw a character — anchored at bottom-center, feet on groundY, depth-scaled by Y
  _drawChar(ctx, charSheet, frameW, frameH, frame, artX, artY, facingLeft) {
    if (!charSheet) return;

    // Depth scale: interpolate between depthFar (back) and depthNear (front)
    const floorRange = this.floorFrontY - this.floorBackY;
    const t = floorRange > 0 ? clamp((artY - this.floorBackY) / floorRange, 0, 1) : 1;
    const depthSc = this.depthFar + (this.depthNear - this.depthFar) * t;

    const dw = frameW * this.scale * depthSc;
    const dh = frameH * this.scale * depthSc;
    const dx = artX * this.scale;
    const dy = artY * this.scale; // feet position

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (facingLeft) {
      ctx.translate(dx, dy - dh);
      ctx.scale(-1, 1);
      ctx.drawImage(charSheet, frame * frameW, 0, frameW, frameH,
        -dw / 2, 0, dw, dh);
    } else {
      ctx.drawImage(charSheet, frame * frameW, 0, frameW, frameH,
        dx - dw / 2, dy - dh, dw, dh);
    }
    ctx.restore();
  }

  // Apply/restore camera transform
  applyCamera(ctx) {
    const offsetX = (CANVAS_W - this.worldW * this.zoom) / 2;
    const offsetY = (CANVAS_H - this.worldH * this.zoom) / 2;
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(this.zoom, this.zoom);
  }
  restoreCamera(ctx) { ctx.restore(); }

  // Main draw:
  //  1. Background
  //  2. 'back' layer furniture (bunk — always behind characters)
  //  3. Characters and 'sort' furniture, Y-sorted together
  // characters: array of { x, y (footY in art px), sheet, fw, fh, frame, flip }
  draw(ctx, characters) {
    ctx.fillStyle = '#0a0806';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    this.applyCamera(ctx);
    this.drawBackground(ctx);

    // Draw back-layer furniture first (always behind everything)
    for (const key in this.furniture) {
      if (this.furniture[key].layer === 'back') {
        this._drawFurnitureItem(ctx, this.furniture[key]);
      }
    }

    // Build sorted list of characters + 'sort' furniture
    const sortList = [];

    // Add sortable furniture
    for (const key in this.furniture) {
      const item = this.furniture[key];
      if (item.layer === 'sort') {
        sortList.push({
          sortY: item.sortY || (item.top + item.sprH), // use sortY or bottom edge
          type: 'furniture',
          item: item
        });
      }
    }

    // Add characters — sortY is their Y position (higher Y = more in front)
    if (characters) {
      characters.forEach(ch => {
        sortList.push({
          sortY: ch.y,
          type: 'character',
          ch: ch
        });
      });
    }

    // Sort: lower sortY draws first (further back / higher on screen)
    sortList.sort((a, b) => a.sortY - b.sortY);

    for (const entry of sortList) {
      if (entry.type === 'furniture') {
        this._drawFurnitureItem(ctx, entry.item);
      } else {
        const ch = entry.ch;
        const f = ch.fighter; // optional Fighter reference for combat effects
        if (f && (f.state === STATES.KNOCKDOWN || f.state === STATES.KO)) {
          // Knocked down — flatten sprite
          ctx.save();
          const dx = ch.x * this.scale;
          const dy = ch.y * this.scale;
          ctx.translate(dx, dy);
          ctx.scale(1, 0.35);
          ctx.translate(-dx, -dy);
          if (f.state === STATES.KO) ctx.globalAlpha = 0.6;
          else ctx.globalAlpha = 0.8;
          this._drawChar(ctx, ch.sheet, ch.fw, ch.fh, ch.frame, ch.x, ch.y, ch.flip);
          ctx.restore();
        } else if (f && f.hitFlash > 0 && f.hitFlash % 2 === 0) {
          ctx.save();
          ctx.filter = 'brightness(3)';
          this._drawChar(ctx, ch.sheet, ch.fw, ch.fh, ch.frame, ch.x, ch.y, ch.flip);
          ctx.restore();
        } else {
          this._drawChar(ctx, ch.sheet, ch.fw, ch.fh, ch.frame, ch.x, ch.y, ch.flip);
        }
      }
    }

    this.restoreCamera(ctx);
  }
}
