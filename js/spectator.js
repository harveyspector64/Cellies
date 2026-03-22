// YARD — Spectator NPCs
// SPECTATOR NPCs — Batch 2
// ============================================================
class Spectator {
  constructor(x, y, edge) {
    this.x = x;
    this.y = y;
    this.edge = edge; // 'top', 'bottom', 'left', 'right'
    this.facing = 1;
    this.fidgetTimer = Math.random() * 3000;
    this.fidgetInterval = 2000 + Math.random() * 4000;
    this.lookAtFight = false;
    this.reactTimer = 0;
    this.reactType = null; // 'flinch', 'cheer'
    this.bodyOffset = Math.random() * 2 - 1; // slight height variation
    // Visual variation
    this.skinTone = randItem(['#8d6e4a', '#6b4c33', '#c4956a', '#a07855', '#5a3d28', '#d4a574']);
    this.shirtColor = randItem(['#666655', '#777766', '#5a5a4a', '#6a6a5a', '#888877']);
    this.pantsColor = randItem(['#3a3a35', '#444440', '#333330', '#4a4a45']);
    this.height = 12 + Math.floor(Math.random() * 4); // 12-15px tall at scale
  }

  update(dt, fighters) {
    // Fidget — occasionally shift weight
    this.fidgetTimer += dt;
    if (this.fidgetTimer > this.fidgetInterval) {
      this.fidgetTimer = 0;
      this.fidgetInterval = 2000 + Math.random() * 4000;
      // Random small position shift
      if (this.edge === 'top' || this.edge === 'bottom') {
        this.x += randRange(-3, 3);
      } else {
        this.y += randRange(-3, 3);
      }
    }

    // Look toward nearest fight
    let nearestFightDist = Infinity;
    let nearestFighter = null;
    for (const f of fighters) {
      if (!f.alive) continue;
      if (f.state === STATES.JAB || f.state === STATES.HOOK || f.state === STATES.HIT ||
          f.state === STATES.KNOCKDOWN || f.state === STATES.KO) {
        const d = dist(this, f);
        if (d < nearestFightDist) {
          nearestFightDist = d;
          nearestFighter = f;
        }
      }
    }

    if (nearestFighter && nearestFightDist < 300) {
      this.facing = nearestFighter.x > this.x ? 1 : -1;
      this.lookAtFight = true;

      // React to nearby KOs or knockdowns
      if (nearestFightDist < 150) {
        if (nearestFighter.state === STATES.KO && this.reactTimer <= 0) {
          this.reactType = Math.random() < 0.5 ? 'flinch' : 'cheer';
          this.reactTimer = 800;
        } else if (nearestFighter.state === STATES.KNOCKDOWN && this.reactTimer <= 0) {
          this.reactType = 'flinch';
          this.reactTimer = 500;
        }
      }
    } else {
      this.lookAtFight = false;
    }

    // Reaction timer
    if (this.reactTimer > 0) {
      this.reactTimer -= dt;
      if (this.reactTimer <= 0) this.reactType = null;
    }
  }

  draw(ctx) {
    const sx = Math.floor(this.x);
    const sy = Math.floor(this.y + this.bodyOffset);
    const sc = 2.5; // slightly smaller than fighters

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 6 * sc, 4 * sc, 2 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(sx, sy);
    if (this.facing === -1) ctx.scale(-1, 1);

    // Reaction animation offset
    let headOff = 0;
    if (this.reactType === 'flinch') {
      headOff = -2;
    } else if (this.reactType === 'cheer') {
      headOff = -3 + Math.sin(Date.now() * 0.015) * 2;
    }

    // Legs
    ctx.fillStyle = this.pantsColor;
    ctx.fillRect(-2 * sc, 2 * sc, 2 * sc, 4 * sc);
    ctx.fillRect(0.5 * sc, 2 * sc, 2 * sc, 4 * sc);

    // Body
    ctx.fillStyle = this.shirtColor;
    ctx.fillRect(-2.5 * sc, -3 * sc, 5 * sc, 5.5 * sc);

    // Head
    ctx.fillStyle = this.skinTone;
    ctx.fillRect(-1.5 * sc, (-5 + headOff) * sc, 3.5 * sc, 3 * sc);

    // Cheer — raised arm
    if (this.reactType === 'cheer') {
      ctx.fillStyle = this.skinTone;
      ctx.fillRect(2.5 * sc, (-6 + headOff) * sc, 1.5 * sc, 3 * sc);
    }

    ctx.restore();
  }
}
