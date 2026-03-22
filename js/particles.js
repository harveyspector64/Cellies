// YARD — Particle System
// ============================================================
class Particle {
  constructor(x, y, vx, vy, color, size, life, gravity = 0, friction = 0.98) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.gravity = gravity;
    this.friction = friction;
    this.alive = true;
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }
    this.vy += this.gravity * dt / 16;
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.x += this.vx * dt / 16;
    this.y += this.vy * dt / 16;
  }
  draw(ctx, cam) {
    const alpha = clamp(this.life / this.maxLife, 0, 1);
    const sx = (this.x - cam.x) * cam.zoom;
    const sy = (this.y - cam.y) * cam.zoom;
    const sz = Math.max(1, this.size * cam.zoom * alpha);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;

    // Phase 2: line-shaped particles (speed lines, sparks)
    if (this.shape === 'line' && this.angle !== undefined) {
      const len = sz * 3;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, sz * 0.5);
      ctx.beginPath();
      ctx.moveTo(sx - Math.cos(this.angle) * len / 2, sy - Math.sin(this.angle) * len / 2);
      ctx.lineTo(sx + Math.cos(this.angle) * len / 2, sy + Math.sin(this.angle) * len / 2);
      ctx.stroke();
    } else {
      ctx.fillRect(Math.floor(sx - sz/2), Math.floor(sy - sz/2), Math.ceil(sz), Math.ceil(sz));
    }
    ctx.globalAlpha = 1;
  }
}

class ParticleSystem {
  constructor() { this.particles = []; }
  add(p) { this.particles.push(p); }
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (!this.particles[i].alive) this.particles.splice(i, 1);
    }
  }
  draw(ctx, cam) {
    for (const p of this.particles) p.draw(ctx, cam);
  }
  clear() { this.particles = []; }

  // Spawn blood burst
  blood(x, y, dir, intensity = 1) {
    const count = Math.floor(10 + intensity * 16);
    const colors = ['#cc1111', '#aa0000', '#880000', '#dd2222', '#991111', '#ff3333'];
    for (let i = 0; i < count; i++) {
      const ang = (dir > 0 ? 0 : Math.PI) + randRange(-1.0, 1.0);
      const spd = randRange(2, 8) * intensity;
      const vx = Math.cos(ang) * spd;
      const vy = Math.sin(ang) * spd + randRange(-3, 1);
      const size = randRange(3, 7);
      const life = randRange(400, 1200);
      this.add(new Particle(x, y, vx, vy, randItem(colors), size, life, 0.12, 0.94));
    }
    // Some drip particles (slower, larger, fall down)
    for (let i = 0; i < 3; i++) {
      const vx = randRange(-1, 1) + dir * 2;
      const vy = randRange(0.5, 2);
      this.add(new Particle(x, y, vx, vy, '#880000', randRange(4, 8), randRange(800, 1500), 0.15, 0.97));
    }
    // Batch 5: Persistent blood stains
    if (game && game.bloodStains && game.bloodStains.length < BLOOD_STAIN_MAX) {
      const stainCount = Math.floor(intensity * 2);
      for (let i = 0; i < stainCount; i++) {
        if (Math.random() < BLOOD_STAIN_CHANCE) {
          game.bloodStains.push({
            x: x + randRange(-10, 10) + dir * randRange(5, 20),
            y: y + randRange(-5, 10),
            size: randRange(2, 5 + intensity * 2),
            alpha: randRange(0.15, 0.35),
            color: randItem(['#660000', '#550000', '#440000', '#771111'])
          });
        }
      }
    }
  }

  // Blood pool that stays on ground
  bloodPool(x, y) {
    const colors = ['#550000', '#440000', '#660000', '#330000', '#770000'];
    for (let i = 0; i < 8; i++) {
      const px = x + randRange(-15, 15);
      const py = y + randRange(-4, 12);
      const size = randRange(4, 10);
      this.add(new Particle(px, py, 0, 0, randItem(colors), size, 20000, 0, 1));
    }
  }

  // Dust when walking
  dust(x, y) {
    const colors = ['#8a7a5a', '#7a6a4a', '#6a5a3a'];
    for (let i = 0; i < 3; i++) {
      const vx = randRange(-1, 1);
      const vy = randRange(-0.5, 0.2);
      this.add(new Particle(x + randRange(-8, 8), y + 12, vx, vy, randItem(colors), randRange(2, 5), randRange(200, 500), 0, 0.93));
    }
  }

  // Impact flash - big white burst with cross sparks
  impact(x, y) {
    const colors = ['#ffffff', '#ffffcc', '#ffddaa', '#ffffff'];
    for (let i = 0; i < 12; i++) {
      const ang = (Math.PI * 2 / 12) * i + randRange(-0.3, 0.3);
      const spd = randRange(3, 8);
      this.add(new Particle(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, randItem(colors), randRange(3, 6), randRange(60, 200), 0, 0.88));
    }
    // Phase 2: Cross-shaped spark (4 elongated lines)
    for (let i = 0; i < 4; i++) {
      const ang = (Math.PI / 2) * i + randRange(-0.2, 0.2);
      const spd = randRange(5, 12);
      const p = new Particle(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, '#ffffee', randRange(2, 3), randRange(40, 100), 0, 0.82);
      p.shape = 'line';
      p.angle = ang;
      this.add(p);
    }
  }

  // Batch 5: Impact dust at feet when knocked back
  impactDust(x, y) {
    const colors = ['#887766', '#776655', '#665544', '#998877'];
    for (let i = 0; i < IMPACT_DUST_COUNT; i++) {
      const ang = randRange(-Math.PI, Math.PI);
      const spd = randRange(0.5, 2);
      this.add(new Particle(
        x + randRange(-8, 8), y + randRange(8, 16),
        Math.cos(ang) * spd, Math.sin(ang) * spd - 0.5,
        randItem(colors), randRange(3, 6), randRange(300, 600), 0.02, 0.96
      ));
    }
  }

  // Phase 2: Speed lines on hooks
  speedLines(x, y, dirX, dirY) {
    const colors = ['#ffffff', '#ffffdd', '#ffeebb'];
    for (let i = 0; i < 5; i++) {
      const spread = randRange(-0.4, 0.4);
      const ang = Math.atan2(dirY, dirX) + spread;
      const spd = randRange(8, 16);
      const p = new Particle(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, randItem(colors), randRange(1.5, 2.5), randRange(60, 120), 0, 0.85);
      p.shape = 'line';
      p.angle = ang;
      this.add(p);
    }
  }
}
