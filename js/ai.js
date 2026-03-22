// YARD — AI Controller
// ============================================================
// AI CONTROLLER
// ============================================================
// Phase 1D: AI States
const AI_STATES = {
  SIZING_UP: 'sizing_up',   // Circling, reading opponent (1.5-4s)
  PRESSING: 'pressing',      // Aggressive attacks, combos (0.5-2s)
  RECOVERING: 'recovering',  // Backing off after an exchange (0.5-1.5s)
  CORNERED: 'cornered'       // Near wall/desperate, wild swings
};

class AIController {
  constructor(fighter, difficulty = 0.5) {
    this.fighter = fighter;
    this.difficulty = difficulty;
    this.state = AI_STATES.SIZING_UP;
    this.stateTimer = 0;
    this.stateDuration = 2000 + Math.random() * 2000;

    // Movement
    this.strafeDir = Math.random() > 0.5 ? 1 : -1;
    this.strafeTimer = 0;

    // Momentum system (0-100): builds from landing hits, decays over time
    this.momentum = 0;

    // Combo tracking for PRESSING state
    this.comboStep = 0;       // current position in combo pattern
    this.comboDelay = 0;      // ms until next attack in combo
    this.comboPattern = null;  // e.g. ['jab','jab','hook']

    // Reaction timers
    this.blockReactTimer = 0;
    this.lastTargetState = null;
  }

  _switchState(newState) {
    this.state = newState;
    this.stateTimer = 0;
    const p = this.fighter.personality;
    switch (newState) {
      case AI_STATES.SIZING_UP:
        // Phase 4: Tightened sizing-up — AI was too passive
        let sizeUpBase = 800;
        if (p === 'brawler' || p === 'swarmer') sizeUpBase = 500;
        else if (p === 'counterpuncher') sizeUpBase = 1200;
        else if (p === 'coward') sizeUpBase = 1000;
        this.stateDuration = sizeUpBase + Math.random() * 1200 * (1 - this.difficulty * 0.5);
        this.strafeDir = Math.random() > 0.5 ? 1 : -1;
        break;
      case AI_STATES.PRESSING:
        // Brawlers press longer, counterpunchers hit and pull back
        let pressBase = 600;
        if (p === 'brawler' || p === 'bully') pressBase = 1000;
        else if (p === 'counterpuncher') pressBase = 400;
        else if (p === 'swarmer') pressBase = 800;
        this.stateDuration = pressBase + Math.random() * 1500;
        this._pickCombo();
        break;
      case AI_STATES.RECOVERING:
        let recoverBase = 400;
        if (p === 'coward') recoverBase = 700;
        else if (p === 'brawler') recoverBase = 250;
        this.stateDuration = recoverBase + Math.random() * 800;
        break;
      case AI_STATES.CORNERED:
        this.stateDuration = 600 + Math.random() * 600;
        break;
    }
  }

  _pickCombo() {
    const p = this.fighter.personality;
    let patterns;

    // Phase 3: Personality-specific combo preferences
    switch (p) {
      case 'brawler':
        patterns = [['jab','hook'], ['hook','hook'], ['jab','jab','hook'], ['hook'], ['jab','shove']];
        break;
      case 'swarmer':
        patterns = [['jab','jab','jab'], ['jab','jab'], ['jab','jab','jab','hook'], ['jab','jab','jab','jab']];
        break;
      case 'slugger':
        patterns = [['hook'], ['jab','hook'], ['hook','hook']];
        break;
      case 'counterpuncher':
        patterns = [['jab'], ['jab','hook'], ['jab','jab']];
        break;
      case 'bully':
        patterns = [['jab','jab','hook'], ['hook'], ['jab','hook','hook'], ['shove','jab'], ['jab','shove']];
        break;
      case 'coward':
        patterns = [['jab'], ['jab','jab'], ['jab']];
        break;
      default: // balanced
        patterns = [['jab'], ['jab','jab'], ['jab','jab','hook'], ['jab','hook'], ['hook'], ['jab','jab','jab']];
        break;
    }

    const maxIdx = Math.min(patterns.length - 1, Math.floor(1 + this.difficulty * (patterns.length - 1)));
    this.comboPattern = patterns[randInt(0, maxIdx)];
    this.comboStep = 0;
    this.comboDelay = 80 + Math.random() * 60;
  }

  update(dt, target) {
    const f = this.fighter;

    // Handle auto-unblock timer
    if (f._autoUnblockTimer > 0) {
      f._autoUnblockTimer -= dt;
      if (f._autoUnblockTimer <= 0) {
        f.unblock();
        f._autoUnblockTimer = 0;
      }
    }

    if (!f.alive || f.isActing) return;
    if (f.hitstopDuration > 0) return;
    if (f.recoveryCooldown > 0) return;

    f.target = target;
    if (!target || target.state === STATES.KO) {
      f.vx = 0; f.vy = 0;
      if (f.state === STATES.WALK) f.setState(STATES.IDLE);
      return;
    }

    // Batch 1: AI clinch behavior
    if (f.inClinch) {
      f.clinchTimer += 0; // timer handled in Fighter.update
      // Personality determines clinch strategy
      if (f.personality === 'bully' || f.personality === 'brawler') {
        // Dirty boxers — gut shot repeatedly
        if (Math.random() < 0.03 * this.difficulty) f.clinchGutShot();
        // Shove after a few gut shots
        if (f.clinchTimer > 1500 && Math.random() < 0.02) f.clinchShove();
      } else if (f.personality === 'swarmer') {
        // Swarmers throw rapid gut shots
        if (Math.random() < 0.05 * this.difficulty) f.clinchGutShot();
      } else {
        // Others try to break free relatively quickly
        if (f.clinchTimer > 600 && Math.random() < 0.03) {
          if (f.stamina >= CLINCH_BREAK_STAMINA) {
            f.stamina -= CLINCH_BREAK_STAMINA;
            f.breakClinch();
          }
        }
        // But throw some gut shots while in there
        if (Math.random() < 0.02 * this.difficulty) f.clinchGutShot();
      }
      return;
    }

    // Batch 1: AI knockdown state — just wait
    if (f.state === STATES.KNOCKDOWN || f.state === STATES.GETUP) return;

    const d = dist(f, target);
    f.faceTarget();

    this.stateTimer += dt;
    this.strafeTimer += dt;

    // Decay momentum over time
    this.momentum = Math.max(0, this.momentum - dt * 0.02);

    // Boost momentum when landing hits
    if (f.comboCount > 0 && f.comboTimer > 900) {
      this.momentum = Math.min(100, this.momentum + 15);
    }

    // Phase 3: Broken fighters flee instead of fighting
    if (f.broken && f.personality !== 'brawler') {
      // Run away from target
      const fleeAng = Math.atan2(f.y - target.y, f.x - target.x);
      f.vx = Math.cos(fleeAng) * f.moveSpeed * 0.8;
      f.vy = Math.sin(fleeAng) * f.moveSpeed * 0.8;
      if (f.state !== STATES.WALK) f.setState(STATES.WALK);
      // Desperate swing if cornered and enemy close
      if (d < 40 && Math.random() < 0.03) f.jab();
      return;
    }

    // Phase 3: Bully personality targets weaker/hurt opponents
    if (f.personality === 'bully' && target.health > target.maxHealth * 0.6 && !target.broken) {
      // Look for a weaker target if available
      if (game && game.fighters) {
        const weakTarget = game.fighters.find(other =>
          other !== f && other.alive && other.gangId !== f.gangId &&
          (other.health < other.maxHealth * 0.4 || other.broken) &&
          dist(f, other) < 150
        );
        if (weakTarget) {
          f.target = weakTarget;
          // Will use this target for the rest of the frame
        }
      }
    }

    // Check if cornered (near wall)
    const wallMargin = 60;
    const nearWall = f.x < wallMargin || f.x > (game ? game.worldW - wallMargin : 9999) ||
                     f.y < wallMargin || f.y > (game ? game.worldH - wallMargin : 9999);

    // Batch 4: Reactive slip — AI reads incoming hooks and tries to slip
    let slipChance = 0.015 * this.difficulty;
    if (f.personality === 'counterpuncher') slipChance *= 3;
    else if (f.personality === 'swarmer') slipChance *= 1.5;
    else if (f.personality === 'brawler') slipChance *= 0.3;
    if (target.state === STATES.HOOK && d < 70 && f.slipCooldown <= 0 &&
        f.state !== STATES.SLIP && Math.random() < slipChance) {
      f.slip();
      return; // committed to slip this frame
    }

    // Reactive blocking: if target is attacking and we're in range
    // Phase 3: counterpunchers block more, cowards block a lot
    let blockChance = 0.02 * this.difficulty;
    if (f.personality === 'counterpuncher') blockChance *= 2.5;
    else if (f.personality === 'coward') blockChance *= 2;
    else if (f.personality === 'brawler') blockChance *= 0.4;
    if (target.state === STATES.JAB || target.state === STATES.HOOK || target.state === STATES.SHOVE) {
      if (d < 70 && Math.random() < blockChance && this.state !== AI_STATES.PRESSING) {
        f.block();
        this.blockReactTimer = 150 + Math.random() * 200;
      }
    }
    if (this.blockReactTimer > 0) {
      this.blockReactTimer -= dt;
      if (this.blockReactTimer <= 0) {
        f.unblock();
        this.blockReactTimer = 0;
      }
      return;
    }

    // Batch 4: AI counter-attack after slip
    if (f.slipCounterWindow > 0 && f.canAttack && d < 65) {
      // Throw a quick counter — hooks are better counters but jabs are safer
      if (Math.random() < 0.6) {
        f.hook(); // big counter
      } else {
        f.jab(); // safe counter
      }
      return;
    }

    // Strafe direction changes
    if (this.strafeTimer > 1200 + Math.random() * 800) {
      this.strafeTimer = 0;
      this.strafeDir *= -1;
    }

    const attackRange = 55;

    // Phase 3: Fear affects willingness to press
    const fearMod = f.fear / f.maxFear; // 0-1

    // State transitions
    switch (this.state) {
      case AI_STATES.SIZING_UP:
        if (this.stateTimer >= this.stateDuration) {
          // Phase 3: Afraid fighters less likely to press
          const pressChance = fearMod < 0.5 ? 1 : (1 - fearMod);
          if ((d < attackRange + 20 || this.momentum > 40) && Math.random() < pressChance) {
            this._switchState(AI_STATES.PRESSING);
          } else {
            this._switchState(AI_STATES.SIZING_UP);
          }
        }
        // Got hit → briefly recover
        if (f.state === STATES.HIT) {
          this._switchState(AI_STATES.RECOVERING);
        }
        if (nearWall && d < attackRange + 30) {
          this._switchState(AI_STATES.CORNERED);
        }
        break;

      case AI_STATES.PRESSING:
        if (this.stateTimer >= this.stateDuration) {
          this._switchState(AI_STATES.RECOVERING);
        }
        if (f.state === STATES.HIT) {
          this._switchState(AI_STATES.RECOVERING);
        }
        if (d > attackRange + 60) {
          this._switchState(AI_STATES.SIZING_UP);
        }
        // Phase 2: Low stamina forces recovery
        if (f.stamina < LOW_STAMINA_THRESHOLD) {
          this._switchState(AI_STATES.RECOVERING);
        }
        break;

      case AI_STATES.RECOVERING:
        if (this.stateTimer >= this.stateDuration) {
          this._switchState(AI_STATES.SIZING_UP);
        }
        if (nearWall && d < attackRange) {
          this._switchState(AI_STATES.CORNERED);
        }
        break;

      case AI_STATES.CORNERED:
        if (this.stateTimer >= this.stateDuration) {
          if (!nearWall) {
            this._switchState(AI_STATES.SIZING_UP);
          } else {
            // Stay cornered but reset timer
            this._switchState(AI_STATES.CORNERED);
          }
        }
        break;
    }

    // State behaviors
    switch (this.state) {
      case AI_STATES.SIZING_UP:
        this._behaveSizingUp(dt, target, d, attackRange);
        break;
      case AI_STATES.PRESSING:
        this._behavePressing(dt, target, d, attackRange);
        break;
      case AI_STATES.RECOVERING:
        this._behaveRecovering(dt, target, d);
        break;
      case AI_STATES.CORNERED:
        this._behaveCornered(dt, target, d, attackRange);
        break;
    }
  }

  _behaveSizingUp(dt, target, d, attackRange) {
    const f = this.fighter;
    const p = f.personality;

    // Phase 3: Personality-specific preferred distances
    let preferredDist = 55 + (1 - this.difficulty) * 15;
    if (p === 'swarmer') preferredDist -= 10;       // wants to be closer
    else if (p === 'counterpuncher') preferredDist += 15; // keeps distance
    else if (p === 'coward') preferredDist += 20;
    else if (p === 'slugger') preferredDist -= 5;

    // Fear pushes preferred distance out
    preferredDist += (f.fear / f.maxFear) * 25;

    if (d > preferredDist + 30) {
      // Approach — speed based on personality
      const ang = angle(f, target);
      let approachSpd = 0.6;
      if (p === 'brawler' || p === 'swarmer') approachSpd = 0.75;
      else if (p === 'coward') approachSpd = 0.4;
      const spd = f.moveSpeed * approachSpd;
      f.vx = Math.cos(ang) * spd;
      f.vy = Math.sin(ang) * spd;
      if (f.state !== STATES.WALK) f.setState(STATES.WALK);
    } else {
      // Circle/strafe at fighting distance
      const angToTarget = angle(f, target);
      const strafeAng = angToTarget + Math.PI / 2 * this.strafeDir;
      let strafeSpd = 0.35;
      if (p === 'counterpuncher') strafeSpd = 0.45; // faster lateral movement
      const spd = f.moveSpeed * strafeSpd;

      const distCorrect = (d - preferredDist) * 0.03;

      f.vx = Math.cos(strafeAng) * spd + Math.cos(angToTarget) * distCorrect;
      f.vy = Math.sin(strafeAng) * spd + Math.sin(angToTarget) * distCorrect;
      if (f.state !== STATES.WALK) f.setState(STATES.WALK);

      // Phase 4: More aggressive probing — AI was too passive
      let probeChance = 0.008 * this.difficulty;
      if (p === 'swarmer') probeChance *= 2;
      if (p === 'brawler') probeChance *= 1.5;
      if (p === 'counterpuncher') probeChance *= 0.5;
      if (d < attackRange && Math.random() < probeChance) {
        const ang = angle(f, target);
        f.vx = Math.cos(ang) * f.moveSpeed * 0.4;
        f.vy = Math.sin(ang) * f.moveSpeed * 0.4;
        if (p === 'slugger' && Math.random() < 0.3) {
          f.hook();
        } else {
          f.jab();
        }
      }

      // Phase 4: Opportunistic attack — when target is in recovery or just whiffed
      if (d < attackRange + 10 && (target.recoveryCooldown > 0 || target.state === STATES.HIT)) {
        const ang = angle(f, target);
        f.vx = Math.cos(ang) * f.moveSpeed * 0.6;
        f.vy = Math.sin(ang) * f.moveSpeed * 0.6;
        if (Math.random() < 0.04 * this.difficulty) {
          if (p === 'counterpuncher' && Math.random() < 0.4) {
            f.hook(); // counterpunchers love to punish
          } else {
            f.jab();
          }
        }
      }
    }
  }

  _behavePressing(dt, target, d, attackRange) {
    const f = this.fighter;

    // If target is blocking, consider shoving
    if (target.state === STATES.BLOCK && d < attackRange && Math.random() < 0.04 * this.difficulty) {
      f.shove();
      return;
    }

    if (d > attackRange) {
      // Close distance aggressively
      const ang = angle(f, target);
      const spd = f.moveSpeed * (0.8 + this.difficulty * 0.2);
      f.vx = Math.cos(ang) * spd;
      f.vy = Math.sin(ang) * spd;
      if (f.state !== STATES.WALK) f.setState(STATES.WALK);
    } else {
      // In range — execute combo pattern
      this.comboDelay -= dt;
      if (this.comboDelay <= 0 && this.comboPattern && this.comboStep < this.comboPattern.length) {
        const move = this.comboPattern[this.comboStep];

        // Step toward target slightly
        const ang = angle(f, target);
        f.vx = Math.cos(ang) * f.moveSpeed * 0.4;
        f.vy = Math.sin(ang) * f.moveSpeed * 0.4;

        if (move === 'hook') {
          f.hook();
        } else if (move === 'shove') {
          f.shove();
        } else {
          f.jab();
        }

        this.comboStep++;
        // Phase 4: Tighter combo timing — less dead time between hits
        this.comboDelay = 60 + Math.random() * 80 * (1 - this.difficulty * 0.5);

        // If combo finished, pick a new one or keep pressing
        if (this.comboStep >= this.comboPattern.length) {
          if (Math.random() < 0.5 + this.momentum * 0.004) {
            this._pickCombo(); // chain into another combo
          }
        }
      } else if (this.comboDelay > 0) {
        // Between combo hits — step toward target to stay in range
        const ang = angle(f, target);
        f.vx = Math.cos(ang) * f.moveSpeed * 0.3;
        f.vy = Math.sin(ang) * f.moveSpeed * 0.3;
        if (f.state !== STATES.WALK) f.setState(STATES.WALK);
      }
    }
  }

  _behaveRecovering(dt, target, d) {
    const f = this.fighter;

    // Back away from target
    const ang = angle(f, target);
    const retreatAng = ang + Math.PI; // opposite direction
    const spd = f.moveSpeed * 0.5;

    // Add slight strafe while retreating
    const strafeComponent = Math.PI / 4 * this.strafeDir;

    f.vx = Math.cos(retreatAng + strafeComponent) * spd;
    f.vy = Math.sin(retreatAng + strafeComponent) * spd;
    if (f.state !== STATES.WALK) f.setState(STATES.WALK);

    // Desperate block if enemy is right on us
    if (d < 45 && Math.random() < 0.025 * this.difficulty) {
      f.block();
      f._autoUnblockTimer = 150 + Math.random() * 250;
    }
  }

  _behaveCornered(dt, target, d, attackRange) {
    const f = this.fighter;

    if (d < attackRange + 10) {
      // Desperate wild swings — faster, less calculated
      if (Math.random() < 0.04 + this.difficulty * 0.03) {
        const ang = angle(f, target);
        f.vx = Math.cos(ang) * f.moveSpeed * 0.5;
        f.vy = Math.sin(ang) * f.moveSpeed * 0.5;

        // Cornered fighters throw more hooks
        if (Math.random() < 0.5) {
          f.hook();
        } else {
          f.jab();
        }
      }
    } else {
      // Try to escape the wall — move toward center of yard
      const centerX = game ? game.worldW / 2 : 400;
      const centerY = game ? game.worldH / 2 : 250;
      const escapeAng = Math.atan2(centerY - f.y, centerX - f.x);
      f.vx = Math.cos(escapeAng) * f.moveSpeed * 0.7;
      f.vy = Math.sin(escapeAng) * f.moveSpeed * 0.7;
      if (f.state !== STATES.WALK) f.setState(STATES.WALK);
    }
  }
}
