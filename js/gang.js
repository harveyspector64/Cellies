// YARD — Gang System
// ============================================================
// GANG SYSTEM
// ============================================================
const GANG_STATES = {
  MILLING: 'milling',
  TENSING: 'tensing',
  ADVANCING: 'advancing',
  FIGHTING: 'fighting',
  RETREATING: 'retreating',
  RALLYING: 'rallying'   // Phase 3: regrouping after retreat
};

class Gang {
  constructor(id, homeX, homeY) {
    this.id = id;
    this.homeX = homeX;
    this.homeY = homeY;
    this.members = [];
    this.ais = [];
    this.state = GANG_STATES.MILLING;
    this.morale = 100;
    this.targetGang = null;
    this.stateTimer = 0;
    this.tensionTimer = 0;
    this.color = GANG_COLORS[id];

    // Phase 3: Narrative tracking
    this.lastKOAnnounced = 0;   // avoid spam
    this.koCount = 0;           // total KOs suffered
    this.killCount = 0;         // total KOs inflicted
    this.hasRallied = false;    // track if gang has rallied before
    this.firstBloodAnnounced = false;
  }

  get alive() { return this.members.some(m => m.alive); }
  get aliveCount() { return this.members.filter(m => m.alive).length; }
  get center() {
    const alive = this.members.filter(m => m.alive);
    if (alive.length === 0) return { x: this.homeX, y: this.homeY };
    const cx = alive.reduce((s, m) => s + m.x, 0) / alive.length;
    const cy = alive.reduce((s, m) => s + m.y, 0) / alive.length;
    return { x: cx, y: cy };
  }

  addMember(fighter, ai) {
    this.members.push(fighter);
    this.ais.push(ai);
    fighter.gangId = this.id;
  }

  assignRoles() {
    // Sort by aggression, top are vanguard
    const sorted = [...this.members].sort((a, b) => b.traits.aggression - a.traits.aggression);
    const vanguardCount = Math.ceil(sorted.length * 0.3);
    for (let i = 0; i < sorted.length; i++) {
      if (i < vanguardCount) sorted[i].gangRole = 'vanguard';
      else if (i < vanguardCount + Math.ceil(sorted.length * 0.4)) sorted[i].gangRole = 'fighter';
      else sorted[i].gangRole = 'follower';
    }
  }

  update(dt, allGangs, allFighters) {
    this.stateTimer += dt;
    this.tensionTimer += dt;

    // Update morale based on KOs and member fear
    const aliveRatio = this.aliveCount / this.members.length;
    const avgFear = this.members.filter(m => m.alive).reduce((sum, m) => sum + m.fear, 0) /
                    Math.max(1, this.aliveCount);
    const targetMorale = aliveRatio * 80 + (1 - avgFear / 100) * 20; // Phase 3: fear affects morale
    this.morale = lerp(this.morale, targetMorale, 0.015);

    // Phase 3: Fear propagation — when an ally gets KO'd, nearby members get scared
    const currentKOs = this.members.filter(m => !m.alive).length;
    if (currentKOs > this.koCount) {
      const newKOs = currentKOs - this.koCount;
      this.koCount = currentKOs;
      // Spread fear to living members
      for (const m of this.members) {
        if (!m.alive) continue;
        const fearSpread = newKOs * 15 * (1 - m.traits.toughness * 0.5);
        m.fear = Math.min(m.maxFear, m.fear + fearSpread);
        // Leadership reduces fear spread
        const leader = this.members.find(lm => lm.alive && lm.traits.leadership > 0.5);
        if (leader && leader !== m) {
          m.fear = Math.max(0, m.fear - leader.traits.leadership * 10);
        }
      }
      // Phase 3: Narrative — announce when a fighter goes down
      if (game && game.announcer && this.stateTimer - this.lastKOAnnounced > 2000) {
        const koFighter = this.members.find(m => !m.alive && m.state === STATES.KO);
        if (koFighter) {
          const gangName = GANG_COLORS[this.id].name;
          if (aliveRatio < 0.4) {
            game.announcer.show(`${gangName} BROKEN`, `${koFighter.name} is down!`, 1500);
          } else if (!this.firstBloodAnnounced) {
            game.announcer.show(`${koFighter.name} DOWN`, `${gangName} takes a loss`, 1200);
            this.firstBloodAnnounced = true;
          }
          this.lastKOAnnounced = this.stateTimer;
        }
      }
    }

    // Find nearest rival gang
    let nearestGang = null;
    let nearestDist = Infinity;
    for (const g of allGangs) {
      if (g === this || !g.alive) continue;
      const d = dist(this.center, g.center);
      if (d < nearestDist) { nearestDist = d; nearestGang = g; }
    }
    this.targetGang = nearestGang;

    // State transitions
    switch (this.state) {
      case GANG_STATES.MILLING:
        if (this.tensionTimer > 3000) {
          this.state = GANG_STATES.TENSING;
          this.stateTimer = 0;
        }
        break;
      case GANG_STATES.TENSING:
        if (this.stateTimer > 2000) {
          this.state = GANG_STATES.ADVANCING;
          this.stateTimer = 0;
          if (game && game.announcer) {
            const gangName = GANG_COLORS[this.id].name;
            // Only announce first gang to advance
            if (!allGangs.some(g => g !== this && g.state === GANG_STATES.ADVANCING)) {
              game.announcer.show(`${gangName} MOVES`, 'Things are heating up...', 1500);
            }
          }
        }
        break;
      case GANG_STATES.ADVANCING:
        // Check if any members are fighting
        if (this.members.some(m => m.alive && (m.state === STATES.HIT || m.state === STATES.JAB || m.state === STATES.HOOK))) {
          this.state = GANG_STATES.FIGHTING;
          this.stateTimer = 0;
        }
        break;
      case GANG_STATES.FIGHTING:
        if (this.morale < 25) {
          this.state = GANG_STATES.RETREATING;
          this.stateTimer = 0;
          // Phase 3: All members get fear boost when gang retreats
          for (const m of this.members) {
            if (m.alive) m.fear = Math.min(m.maxFear, m.fear + 20);
          }
          if (game && game.announcer) {
            game.announcer.show(`${GANG_COLORS[this.id].name} FALLS BACK`, '', 1200);
          }
        }
        break;
      case GANG_STATES.RETREATING:
        if (this.stateTimer > 3000 && this.morale > 40) {
          // Phase 3: Rally mechanic — gang regroups and comes back
          const leader = this.members.find(m => m.alive && m.traits.leadership > 0.5);
          if (leader && !this.hasRallied) {
            this.state = GANG_STATES.RALLYING;
            this.stateTimer = 0;
            this.hasRallied = true;
            // Leader rallies — reduce all fear
            for (const m of this.members) {
              if (m.alive) {
                m.fear = Math.max(0, m.fear - 30 * leader.traits.leadership);
                m.broken = false;
              }
            }
            if (game && game.announcer) {
              game.announcer.show(`${leader.name} RALLIES`, `${GANG_COLORS[this.id].name} regroups!`, 1800);
            }
          } else if (this.morale > 50) {
            this.state = GANG_STATES.ADVANCING;
            this.stateTimer = 0;
          }
        }
        break;
      case GANG_STATES.RALLYING:
        // Regroup then advance again
        if (this.stateTimer > 2000) {
          this.state = GANG_STATES.ADVANCING;
          this.stateTimer = 0;
          this.morale = Math.min(100, this.morale + 20);
        }
        break;
    }

    // Update individual AI based on gang state
    for (let i = 0; i < this.members.length; i++) {
      const member = this.members[i];
      const ai = this.ais[i];
      if (!member.alive || member.isPlayer) continue;

      this._updateMemberAI(member, ai, dt, allFighters);
    }
  }

  _updateMemberAI(member, ai, dt, allFighters) {
    const f = member;
    if (f.state === STATES.KO || f.isActing || f.hitstopDuration > 0 || f.recoveryCooldown > 0) return;

    // Find nearest enemy (skip KO'd and knocked down)
    let nearestEnemy = null;
    let nearestEnemyDist = Infinity;
    for (const other of allFighters) {
      if (other === f || other.gangId === f.gangId || !other.alive) continue;
      if (other.state === STATES.KNOCKDOWN || other.state === STATES.GETUP) continue;
      const d = dist(f, other);
      if (d < nearestEnemyDist) {
        nearestEnemyDist = d;
        nearestEnemy = other;
      }
    }

    f.target = nearestEnemy;

    switch (this.state) {
      case GANG_STATES.MILLING: {
        // Wander near home
        if (Math.random() < 0.02) {
          const wX = this.homeX + randRange(-40, 40);
          const wY = this.homeY + randRange(-40, 40);
          const ang = Math.atan2(wY - f.y, wX - f.x);
          f.vx = Math.cos(ang) * f.moveSpeed * 0.3;
          f.vy = Math.sin(ang) * f.moveSpeed * 0.3;
          if (f.state !== STATES.WALK) f.setState(STATES.WALK);
        } else if (Math.random() < 0.05) {
          f.vx = 0; f.vy = 0;
          if (f.state !== STATES.IDLE) f.setState(STATES.IDLE);
        }
        break;
      }

      case GANG_STATES.TENSING: {
        // Tighten formation, face rival gang
        const gc = this.center;
        const d = dist(f, gc);
        if (d > 30) {
          const ang = Math.atan2(gc.y - f.y, gc.x - f.x);
          f.vx = Math.cos(ang) * f.moveSpeed * 0.5;
          f.vy = Math.sin(ang) * f.moveSpeed * 0.5;
          if (f.state !== STATES.WALK) f.setState(STATES.WALK);
        } else {
          f.vx = 0; f.vy = 0;
          if (f.state !== STATES.IDLE) f.setState(STATES.IDLE);
        }
        if (nearestEnemy) f.faceTarget();
        break;
      }

      case GANG_STATES.ADVANCING: {
        if (!this.targetGang) break;
        const targetCenter = this.targetGang.center;
        const gangCenter = this.center;

        // Role-based behavior
        let targetX, targetY, speedMult;
        if (f.gangRole === 'vanguard') {
          // Vanguard pushes toward enemy
          targetX = targetCenter.x;
          targetY = targetCenter.y;
          speedMult = 0.6 + f.traits.aggression * 0.4;
        } else if (f.gangRole === 'fighter') {
          // Fighters follow behind vanguard
          targetX = lerp(gangCenter.x, targetCenter.x, 0.5);
          targetY = lerp(gangCenter.y, targetCenter.y, 0.5);
          speedMult = 0.4 + f.traits.aggression * 0.3;
        } else {
          // Followers stay closer to gang center
          targetX = lerp(gangCenter.x, targetCenter.x, 0.2);
          targetY = lerp(gangCenter.y, targetCenter.y, 0.2);
          speedMult = 0.3;
        }

        // Add some spread so they don't stack
        targetX += (Math.sin(f.x * 0.1 + f.y * 0.07) * 20);
        targetY += (Math.cos(f.x * 0.07 + f.y * 0.1) * 15);

        const d = dist(f, { x: targetX, y: targetY });
        if (d > 10) {
          const ang = Math.atan2(targetY - f.y, targetX - f.x);
          f.vx = Math.cos(ang) * f.moveSpeed * speedMult;
          f.vy = Math.sin(ang) * f.moveSpeed * speedMult;
          if (f.state !== STATES.WALK) f.setState(STATES.WALK);
        }

        // Attack if enemy in range
        if (nearestEnemy && nearestEnemyDist < 60) {
          f.faceTarget();
          ai.update(dt, nearestEnemy);
        } else if (nearestEnemy) {
          f.faceTarget();
        }
        break;
      }

      case GANG_STATES.FIGHTING: {
        // Full combat mode - use individual AI
        if (nearestEnemy) {
          ai.update(dt, nearestEnemy);
        }
        break;
      }

      case GANG_STATES.RETREATING: {
        // Move back toward home
        const ang = Math.atan2(this.homeY - f.y, this.homeX - f.x);
        f.vx = Math.cos(ang) * f.moveSpeed * 0.7;
        f.vy = Math.sin(ang) * f.moveSpeed * 0.7;
        if (f.state !== STATES.WALK) f.setState(STATES.WALK);

        // Still fight if cornered
        if (nearestEnemy && nearestEnemyDist < 50) {
          ai.update(dt, nearestEnemy);
        }
        break;
      }

      case GANG_STATES.RALLYING: {
        // Phase 3: Regroup around gang center / leader
        const gc = this.center;
        const d = dist(f, gc);
        if (d > 25) {
          const ang = Math.atan2(gc.y - f.y, gc.x - f.x);
          f.vx = Math.cos(ang) * f.moveSpeed * 0.5;
          f.vy = Math.sin(ang) * f.moveSpeed * 0.5;
          if (f.state !== STATES.WALK) f.setState(STATES.WALK);
        } else {
          f.vx = 0; f.vy = 0;
          if (f.state !== STATES.IDLE) f.setState(STATES.IDLE);
        }
        if (nearestEnemy) f.faceTarget();
        // Defend if attacked
        if (nearestEnemy && nearestEnemyDist < 50) {
          ai.update(dt, nearestEnemy);
        }
        break;
      }
    }

    // Phase 3: Individual fear overrides — broken fighters in any gang state
    if (f.broken && !f.isPlayer && this.state !== GANG_STATES.RETREATING) {
      // Broken member tries to flee back to home even if gang is fighting
      const ang = Math.atan2(this.homeY - f.y, this.homeX - f.x);
      f.vx = Math.cos(ang) * f.moveSpeed * 0.6;
      f.vy = Math.sin(ang) * f.moveSpeed * 0.6;
      if (f.state !== STATES.WALK) f.setState(STATES.WALK);
    }
  }
}
