// YARD — Fighter Class

const STATES = {
  IDLE: 'idle',
  WALK: 'walk',
  JAB: 'jab',
  HOOK: 'hook',
  BLOCK: 'block',
  HIT: 'hit',
  KNOCKDOWN: 'knockdown',
  GETUP: 'getup',
  SHOVE: 'shove',
  CLINCH: 'clinch',
  SLIP: 'slip',
  KO: 'ko'
};

class Fighter {
  constructor(x, y, charDef, gangId, traits = {}) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.charDef = charDef;
    this.gangId = gangId;
    this.facing = 1; // 1=right, -1=left

    // Traits (0-1 scale)
    this.traits = {
      aggression: traits.aggression ?? 0.5,
      toughness:  traits.toughness ?? 0.5,
      speed:      traits.speed ?? 0.5,
      power:      traits.power ?? 0.5,
      leadership: traits.leadership ?? 0,
      ...traits
    };

    // Phase 3: Fighter personality
    // Derived from traits — affects AI behavior style
    this.personality = this._derivePersonality();

    // Phase 3: Individual morale/fear (0=fearless, 100=terrified)
    this.fear = 0;
    this.maxFear = 100;
    this.fearDecayRate = 3 + this.traits.toughness * 4;
    this.fearThreshold = 60 + this.traits.toughness * 30;
    this.broken = false;

    // Phase 4: Injury system
    this.injuries = 0;
    this.injuryThresholds = [25, 50, 75];
    this.hitsLanded = 0;
    this.hitsTaken = 0;
    this.damageDealt = 0;
    this.knockdowns = 0;        // KOs inflicted (stat)

    // Batch 1: Knockdown system (reworked)
    this.knockdownCount = 0;    // times this fighter has been knocked down
    this.knockdownTimer = 0;    // time remaining on ground
    this.getupTaps = 0;         // player mash counter
    this.isDown = false;        // currently on the ground
    this.wobbleTimer = 0;       // post-knockdown wobble (slow + vulnerable)
    this.aiGetupDelay = 0;      // variable AI get-up timing

    // Batch 2: Blood trail
    this.bloodTrailTimer = 0;

    // Batch 2: Stagger system
    this.rapidHitCount = 0;     // consecutive hits in window
    this.rapidHitTimer = 0;     // time since first hit in rapid sequence
    this.staggerTimer = 0;      // remaining stagger time
    this.isStaggered = false;

    // Batch 1: Clinch system
    this.clinchPartner = null;  // the other fighter in clinch
    this.clinchTimer = 0;       // how long in clinch
    this.clinchProximityTimer = 0; // how long close enough to trigger clinch
    this.clinchCooldown = 0;    // prevent instant re-clinch after break

    // Derived stats
    this.maxHealth = MAX_HEALTH * (0.8 + this.traits.toughness * 0.4);
    this.health = this.maxHealth;
    this.baseMoveSpeed = 1.2 + this.traits.speed * 0.8;
    this.damageMult = 0.7 + this.traits.power * 0.6;

    // Phase 2: Stamina
    this.stamina = MAX_STAMINA;
    this.maxStamina = MAX_STAMINA;

    // State
    this.state = STATES.IDLE;
    this.stateTimer = 0;
    this.animFrame = 0;
    this.animTimer = 0;
    this.hitFlash = 0;
    this.invulnFrames = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.dustTimer = 0;
    this.target = null;
    this.isPlayer = false;
    this.alive = true;
    this.koTimer = 0;
    this.gangRole = 'fighter'; // vanguard, fighter, follower
    this.name = '';

    // Phase 1A: Time-based hitstop
    this.hitstopTimer = 0;
    this.hitstopDuration = 0;

    // Phase 1B: Knockback deceleration curves
    this.knockbackTimer = 0;
    this.knockbackDuration = 0;
    this.bounceVy = 0;       // vertical bounce velocity (visual only)
    this.bounceY = 0;        // current vertical offset from bounce

    // Phase 1C: Attack recovery cooldown
    this.recoveryCooldown = 0;

    // Input buffer — stores attack input so rapid pressing feels responsive
    this.inputBuffer = null;      // 'jab', 'hook', 'shove', or null
    this.inputBufferTimer = 0;    // ms remaining on buffered input

    // Block commitment & guard mechanics
    this.blockRaiseTimer = 0;
    this.blockRaised = false;
    this.guardStunTimer = 0;
    this.guardPressure = 0;
    this.lastAttackMoveMult = 0.5;

    // AI auto-unblock timer
    this._autoUnblockTimer = 0;

    // Fear submission timer
    this._brokenTimer = 0;

    // Batch 4: Heat (momentum) system
    this.heat = 0;
    this.heatDecayTimer = 0;       // ms since last hit landed
    this.lastHitLandedTime = 0;    // timestamp of last successful hit

    // Batch 4: Slip/duck
    this.isSlipping = false;
    this.slipTimer = 0;
    this.slipCooldown = 0;
    this.slipCounterWindow = 0;    // ms remaining where next attack is a counter

    // Batch 4: Whiff tracking
    this.lastAttackHit = false;    // did the last attack connect?

    // Batch 5: Juice
    this.hitConfirmTimer = 0;      // white outline flash when you land a hit
    this.comboDisplayTimer = 0;    // ms remaining to show combo counter
    this.failedInputTimer = 0;    // red flash when attack input blocked
    this.lastSlipDirection = 0;    // direction player was holding during slip

    // Hitbox tracking
    this.hitboxActive = false;
    this.hitRegistered = false; // prevent multi-hit per swing
    this.hitTargets = new Set();
  }

  _derivePersonality() {
    const a = this.traits.aggression;
    const t = this.traits.toughness;
    const s = this.traits.speed;
    const p = this.traits.power;

    // Personality archetypes based on trait combinations
    if (a > 0.7 && p > 0.6) return 'brawler';       // Aggressive heavy hitter, walks forward throwing
    if (a < 0.4 && s > 0.6) return 'counterpuncher'; // Patient, waits for openings
    if (a > 0.6 && t > 0.7) return 'bully';          // Pressures weak opponents, fights dirty
    if (t < 0.4 && a < 0.5) return 'coward';         // Fights from edges, runs when hurt
    if (s > 0.7 && a > 0.5) return 'swarmer';        // Fast, gets in close, rapid jabs
    if (p > 0.7 && s < 0.5) return 'slugger';        // Slow but devastating hooks
    return 'balanced';
  }

  get cx() { return this.x; }
  get cy() { return this.y; }
  get moveSpeed() {
    let spd = this.baseMoveSpeed;
    // Batch 4: Heat speed bonus
    if (this.heat > 0) spd *= (1 + (this.heat / HEAT_MAX) * HEAT_SPEED_BONUS);
    // Wobble slows you down
    if (this.wobbleTimer > 0) spd *= WOBBLE_SPEED_MULT;
    return spd;
  }
  get isActing() {
    return this.state === STATES.JAB || this.state === STATES.HOOK || this.state === STATES.SHOVE ||
           this.state === STATES.HIT || this.state === STATES.KNOCKDOWN ||
           this.state === STATES.GETUP || this.state === STATES.CLINCH || this.state === STATES.KO ||
           this.state === STATES.SLIP || this.isStaggered;
  }
  get canMove() {
    if (this.state === STATES.HIT || this.state === STATES.KNOCKDOWN ||
        this.state === STATES.GETUP || this.state === STATES.KO ||
        this.state === STATES.CLINCH || this.state === STATES.SLIP) return false;
    if (this.isStaggered) return false;
    return true;
  }

  get canAttack() {
    if (this.recoveryCooldown > 0) return false;
    if (this.state === STATES.JAB || this.state === STATES.HOOK ||
        this.state === STATES.SHOVE || this.state === STATES.HIT ||
        this.state === STATES.KNOCKDOWN || this.state === STATES.GETUP ||
        this.state === STATES.CLINCH || this.state === STATES.KO) return false;
    if (this.guardStunTimer > 0) return false;
    return true;
  }

  get recoveryMoveSpeed() {
    if (this.recoveryCooldown > 0) {
      return this.lastAttackMoveMult || 0.5;
    }
    return 1;
  }

  get canAct() {
    return this.canAttack;
  }
  get inClinch() {
    return this.state === STATES.CLINCH && this.clinchPartner !== null;
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this.stateTimer = 0;
    this.animFrame = 0;
    this.animTimer = 0;
    this.hitboxActive = false;
    this.hitRegistered = false;
    this.hitTargets.clear();
    // Clear input buffer on hit/knockdown/KO — don't auto-attack out of stun
    if (newState === STATES.HIT || newState === STATES.KNOCKDOWN || newState === STATES.KO) {
      this.inputBuffer = null;
      this.inputBufferTimer = 0;
    }
  }

  // Batch 5: Smart lunge — scales by distance, no lunge if already close
  _applyLunge(force) {
    if (!this.target) {
      this.vx += this.facing * force * 0.5;
      return;
    }
    const d = Math.hypot(this.target.x - this.x, this.target.y - this.y);
    if (d < LUNGE_MIN_DIST) return; // already in their face, no lunge
    const scale = Math.min(1, (d - LUNGE_MIN_DIST) / (LUNGE_MAX_DIST - LUNGE_MIN_DIST));
    const dir = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    this.vx += Math.cos(dir) * force * scale;
    this.vy += Math.sin(dir) * force * scale;
  }

  jab() {
    if (!this.canAttack) return;
    if (this.stamina < JAB_STAMINA_COST * 0.5) return;
    if (this.slipCounterWindow > 0) this._isCounterAttack = true;
    this.stamina -= JAB_STAMINA_COST;
    if (this.stamina < 0) this.stamina = 0;
    // Batch 5: Lock facing at moment of attack
    if (this.target) this.faceTarget();
    this.setState(STATES.JAB);
    this.lastAttackMoveMult = MOVE_DEFS.jab.moveSpeedMult;
    this.lastAttackHit = false;
    this._applyLunge(LUNGE_FORCE_JAB);
  }

  hook() {
    if (!this.canAttack) return;
    if (this.stamina < HOOK_STAMINA_COST * 0.5) return;
    if (this.slipCounterWindow > 0) this._isCounterAttack = true;
    this.stamina -= HOOK_STAMINA_COST;
    if (this.stamina < 0) this.stamina = 0;
    if (this.target) this.faceTarget();
    this.setState(STATES.HOOK);
    this.lastAttackMoveMult = MOVE_DEFS.hook.moveSpeedMult;
    this.lastAttackHit = false;
    this._applyLunge(LUNGE_FORCE_HOOK);
  }

  block() {
    if (this.state === STATES.HIT || this.state === STATES.KNOCKDOWN || this.state === STATES.KO) return;
    if (this.guardStunTimer > 0) return; // can't block during guard stun
    if (this.state !== STATES.BLOCK) {
      this.setState(STATES.BLOCK);
      this.blockRaiseTimer = 0;
      this.blockRaised = false;
    }
  }

  unblock() {
    if (this.state === STATES.BLOCK) this.setState(STATES.IDLE);
  }

  shove() {
    if (!this.canAttack) return;
    if (this.stamina < MOVE_DEFS.shove.staminaCost * 0.5) return;
    this.stamina -= MOVE_DEFS.shove.staminaCost;
    if (this.stamina < 0) this.stamina = 0;
    this.setState(STATES.SHOVE);
    this.lastAttackMoveMult = MOVE_DEFS.shove.moveSpeedMult;
  }

  // Batch 4: Slip/duck — dodges hooks, vulnerable to jabs
  slip(slipDirX, slipDirY) {
    if (this.state !== STATES.IDLE && this.state !== STATES.WALK && this.state !== STATES.BLOCK) return;
    if (this.slipCooldown > 0) return;
    if (this.guardStunTimer > 0) return;
    this.setState(STATES.SLIP);
    this.isSlipping = true;
    this.slipTimer = SLIP_DURATION;
    this.slipCooldown = SLIP_DURATION + SLIP_COOLDOWN;
    SFX.slip();
    // Batch 5: Directional slip — player controls slip direction
    if (slipDirX !== undefined && (slipDirX !== 0 || slipDirY !== 0)) {
      const len = Math.hypot(slipDirX, slipDirY) || 1;
      this.vx += (slipDirX / len) * 2.5;
      this.vy += (slipDirY / len) * 2.5;
    } else if (this.target) {
      // AI/default: lateral dodge relative to attacker
      const perpDir = Math.atan2(this.target.y - this.y, this.target.x - this.x) + (Math.random() > 0.5 ? Math.PI/2 : -Math.PI/2);
      this.vx += Math.cos(perpDir) * 2;
      this.vy += Math.sin(perpDir) * 2;
    }
  }

  // Batch 1: Clinch actions
  enterClinch(partner) {
    if (this.state === STATES.KO || this.state === STATES.KNOCKDOWN || this.state === STATES.GETUP) return;
    this.clinchPartner = partner;
    this.clinchTimer = 0;
    this.setState(STATES.CLINCH);
    this.vx = 0; this.vy = 0;
  }

  clinchGutShot() {
    if (!this.inClinch) return;
    if (this.stamina < 3) return;
    this.stamina -= 3;
    const partner = this.clinchPartner;
    if (partner && partner.alive) {
      partner.health -= CLINCH_GUT_SHOT_DAMAGE * this.damageMult;
      partner.injuries = Math.min(100, partner.injuries + CLINCH_GUT_SHOT_INJURY / 100 * 40);
      partner.hitFlash = 4;
      partner.hitsTaken++;
      this.hitsLanded++;
      this.damageDealt += CLINCH_GUT_SHOT_DAMAGE * this.damageMult;
      // Damage number
      if (game && game.dmgNumbers) {
        game.dmgNumbers.add(partner.x, partner.y - 20, CLINCH_GUT_SHOT_DAMAGE * this.damageMult, false, false);
      }
      if (partner.health <= 0) {
        partner.health = 0;
        this.breakClinch();
        partner.setState(STATES.KO);
        partner.koTimer = KO_DURATION;
        partner.alive = false;
      }
    }
  }

  clinchShove() {
    if (!this.inClinch) return;
    if (this.stamina < CLINCH_SHOVE_STAMINA) return;
    this.stamina -= CLINCH_SHOVE_STAMINA;
    const partner = this.clinchPartner;
    if (partner) {
      const ang = Math.atan2(partner.y - this.y, partner.x - this.x);
      partner.vx = Math.cos(ang) * CLINCH_SHOVE_FORCE;
      partner.vy = Math.sin(ang) * CLINCH_SHOVE_FORCE;
      partner.setState(STATES.HIT);
      partner.invulnFrames = 8;
    }
    this.breakClinch();
  }

  breakClinch() {
    const partner = this.clinchPartner;
    this.clinchPartner = null;
    this.clinchTimer = 0;
    this.clinchCooldown = 800;
    if (this.state === STATES.CLINCH) this.setState(STATES.IDLE);
    if (partner) {
      partner.clinchPartner = null;
      partner.clinchTimer = 0;
      partner.clinchCooldown = 800;
      if (partner.state === STATES.CLINCH) partner.setState(STATES.IDLE);
    }
  }

  // Reworked knockdown
  knockDown() {
    this.knockdownCount++;
    this.isDown = true;
    this.getupTaps = 0;
    this.setState(STATES.KNOCKDOWN);
    this.knockdownTimer = KNOCKDOWN_DURATION;
    this.vx = 0; this.vy = 0;

    // Variable AI get-up delay based on condition
    if (!this.isPlayer) {
      // "Willpower" to get up — how much fight is left
      let willToGetUp = this.traits.toughness * 0.4 + 0.3;
      willToGetUp -= this.knockdownCount * 0.15;      // each knockdown saps will
      willToGetUp -= (this.injuries / 100) * 0.25;    // injuries make it harder
      willToGetUp -= (this.fear / this.maxFear) * 0.2; // fear saps will
      willToGetUp = clamp(willToGetUp, 0, 1);

      if (willToGetUp < 0.15) {
        // Too broken — AI stays down, will time out to KO
        this.aiGetupDelay = KNOCKDOWN_DURATION + 999; // won't try
      } else {
        // Variable timing: tough fighters get up faster, hurt fighters struggle
        const fastest = KNOCKDOWN_DURATION * 0.25;
        const slowest = KNOCKDOWN_DURATION * 0.8;
        this.aiGetupDelay = lerp(slowest, fastest, willToGetUp);
        // Add randomness so it doesn't feel robotic
        this.aiGetupDelay += randRange(-200, 300);
      }
    }

    SFX.knockdown();

    // Camera + effects
    if (game) {
      const shDirX = this.facing * -1;
      game.camera.shake(8, 300, shDirX, 0);
      game.camera.zoomPunch(0.08, 250);
      game.hitFlashAlpha = 0.12;
      game.particles.bloodPool(this.x, this.y + 4);
    }

    if (game) {
      game.announcer.show(`${this.name} DOWN!`, `Knockdown #${this.knockdownCount}`, 1500);
    }
  }

  attemptGetUp() {
    if (this.state !== STATES.KNOCKDOWN || !this.isDown) return;
    this.getupTaps++;
    const needed = GETUP_TAPS_NEEDED + (this.knockdownCount - 1) * 2; // harder each time
    if (this.getupTaps >= needed) {
      this.isDown = false;
      this.setState(STATES.GETUP);
      // Recovery — fighting spirit gives a small health boost
      this.health = Math.min(this.maxHealth, this.health + this.maxHealth * KNOCKDOWN_HEALTH_RECOVERY);
      this.invulnFrames = 30; // brief invuln on get-up
      this.fear = Math.max(0, this.fear - 15); // adrenaline reduces fear
      // Post-knockdown wobble — fighter is slow and vulnerable after getting up
      this.wobbleTimer = WOBBLE_DURATION + this.knockdownCount * 400; // wobble longer each knockdown
      // Get-up animation timer
      this.stateTimer = 0;
    }
  }

  takeDamage(amount, knockDir, knockForce, attacker, isHook = false) {
    if (this.invulnFrames > 0 || this.state === STATES.KO || this.state === STATES.KNOCKDOWN) return false;

    let actualDamage = amount;
    let actualKnock = knockForce;
    let blocked = false;

    if (this.state === STATES.BLOCK && this.blockRaised) {
      const fromRight = attacker.x > this.x;
      const facingAttacker = (fromRight && this.facing === 1) || (!fromRight && this.facing === -1);
      if (facingAttacker) {
        actualDamage *= BLOCK_DAMAGE_MULT;
        actualKnock *= BLOCK_KNOCKBACK_MULT;
        blocked = true;

        // Guard mechanics — shoves and hooks crack guard
        const moveDef = isHook ? MOVE_DEFS.hook :
                        (attacker.state === STATES.SHOVE ? MOVE_DEFS.shove : MOVE_DEFS.jab);
        this.guardStunTimer = moveDef.guardStun;
        this.guardPressure += moveDef.guardDamage;

        // Pushback on block
        const pushDir = Math.atan2(this.y - attacker.y, this.x - attacker.x);
        this.vx += Math.cos(pushDir) * moveDef.blockPushback;
        this.vy += Math.sin(pushDir) * moveDef.blockPushback;

        // Guard break — too much pressure cracks the guard
        if (this.guardPressure >= 40) {
          this.guardPressure = 0;
          this.guardStunTimer = 400;
          this.unblock();
          this.isStaggered = true;
          this.staggerTimer = 500;
          blocked = false; // the breaking hit gets through
          actualDamage = amount * 0.6; // partial damage on guard break
          if (game) game.announcer.show('GUARD BREAK!', '', 800);
        }
      }
    }

    this.health -= actualDamage;
    this.vx += Math.cos(knockDir) * actualKnock;
    this.vy += Math.sin(knockDir) * actualKnock;
    this.hitFlash = 6;

    // Phase 3: Fear increases when hit
    if (!blocked) {
      const fearGain = (actualDamage / this.maxHealth) * 80 * (1 - this.traits.toughness * 0.5);
      this.fear = Math.min(this.maxFear, this.fear + fearGain);
      if (this.fear >= this.fearThreshold) this.broken = true;
      this.setState(STATES.HIT);
      this.invulnFrames = 8;

      // Batch 4: Getting hit kills your momentum
      this.heat *= (1 - HEAT_RESET_ON_HIT);
      this.heatDecayTimer = 0;

      // Phase 4: Accumulate injuries
      this.injuries = Math.min(100, this.injuries + (actualDamage / this.maxHealth) * 40);
      this.hitsTaken++;

      // Batch 2: Stagger — track rapid consecutive hits
      if (this.rapidHitTimer > 0 && this.rapidHitTimer < STAGGER_HIT_WINDOW) {
        this.rapidHitCount++;
      } else {
        this.rapidHitCount = 1;
      }
      this.rapidHitTimer = STAGGER_HIT_WINDOW;
      // Trigger stagger at threshold
      if (this.rapidHitCount >= STAGGER_HIT_THRESHOLD && !this.isStaggered) {
        this.isStaggered = true;
        this.staggerTimer = STAGGER_DURATION;
        this.rapidHitCount = 0;
        if (game && game.particles) {
          // Dizzy stars effect
          for (let i = 0; i < 5; i++) {
            const p = new Particle(
              this.x + randRange(-10, 10), this.y - 20 + randRange(-5, 5),
              randRange(-1, 1), randRange(-1.5, -0.3),
              '#ffdd44', randRange(2, 4), 500, 0, 0.95
            );
            game.particles.add(p);
          }
        }
      }
    } else {
      this.fear = Math.min(this.maxFear, this.fear + 3);
    }

    // Reworked knockdown/KO system — not every fight goes to 3 knockdowns
    if (this.health <= 0) {
      const overkill = Math.abs(this.health) / this.maxHealth; // how far past 0

      // Instant KO chance — devastating hits can skip knockdown entirely
      let instantKOChance = INSTANT_KO_BASE_CHANCE;
      if (isHook) instantKOChance += INSTANT_KO_HOOK_BONUS;
      instantKOChance += overkill * INSTANT_KO_OVERKILL_SCALE;
      if (attacker) instantKOChance += attacker.traits.power * 0.12;
      // Already been down? More likely to stay down for good
      instantKOChance += this.knockdownCount * 0.15;
      // High injuries make instant KO more likely
      instantKOChance += (this.injuries / 100) * 0.15;

      if (Math.random() < instantKOChance || this.knockdownCount >= MAX_KNOCKDOWNS) {
        // Straight KO — lights out
        this.health = 0;
        this.setState(STATES.KO);
        this.koTimer = KO_DURATION;
        this.alive = false;
        if (game && this.knockdownCount >= MAX_KNOCKDOWNS) {
          game.announcer.show('TKO!', `${this.name} can't continue`, 2000);
        }
        return { blocked, damage: actualDamage, ko: true };
      } else {
        // Knockdown — fighter goes down but might get up
        this.health = 1; // keep alive
        this.knockDown();
        return { blocked, damage: actualDamage, knockdown: true };
      }
    } else if (!blocked) {
      // Chance of knockdown on hooks when health is low
      const healthPct = this.health / this.maxHealth;
      if (healthPct < KNOCKDOWN_THRESHOLD && isHook) {
        const knockdownChance = KNOCKDOWN_HOOK_CHANCE * (1 - healthPct / KNOCKDOWN_THRESHOLD);
        if (Math.random() < knockdownChance && this.knockdownCount < MAX_KNOCKDOWNS) {
          this.knockDown();
          return { blocked, damage: actualDamage, knockdown: true };
        }
      }
    }

    return { blocked, damage: actualDamage };
  }

  getHitbox() {
    if (!this.hitboxActive) return null;
    const reach = PUNCH_REACH;
    return {
      x: this.x + this.facing * reach - PUNCH_WIDTH / 2,
      y: this.y - PUNCH_HEIGHT / 2,
      w: PUNCH_WIDTH,
      h: PUNCH_HEIGHT
    };
  }

  getHurtbox() {
    return {
      x: this.x - 14,
      y: this.y - 16,
      w: 28,
      h: 32
    };
  }

  faceTarget() {
    if (this.target) {
      this.facing = this.target.x > this.x ? 1 : -1;
    }
  }

  update(dt) {
    // Phase 1A: Time-based hitstop with ease-out
    if (this.hitstopDuration > 0) {
      this.hitstopTimer += dt;
      if (this.hitstopTimer >= this.hitstopDuration) {
        this.hitstopTimer = 0;
        this.hitstopDuration = 0;
      } else {
        // Ease-out: allow slight movement toward end of hitstop for weight feel
        const t = this.hitstopTimer / this.hitstopDuration;
        const easeOut = t * t; // quadratic ease — frozen at start, easing out at end
        // During hitstop, scale dt by easeOut so we're nearly frozen early, unfreezing late
        dt *= easeOut * 0.3; // even at the end of hitstop, only 30% speed
        if (dt < 0.1) return; // effectively frozen
      }
    }

    this.stateTimer += dt;
    if (this.hitFlash > 0) this.hitFlash--;
    if (this.invulnFrames > 0) this.invulnFrames--;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }
    // Batch 5: Hit confirm + combo display + failed input timers
    if (this.hitConfirmTimer > 0) this.hitConfirmTimer -= dt;
    if (this.comboDisplayTimer > 0) this.comboDisplayTimer -= dt;
    if (this.failedInputTimer > 0) this.failedInputTimer -= dt;

    // Phase 1C: Tick recovery cooldown
    if (this.recoveryCooldown > 0) {
      this.recoveryCooldown -= dt;
      if (this.recoveryCooldown < 0) this.recoveryCooldown = 0;
    }

    // Input buffer — execute buffered attack when able
    if (this.inputBuffer && this.inputBufferTimer > 0) {
      this.inputBufferTimer -= dt;
      if (this.inputBufferTimer <= 0) {
        this.inputBuffer = null;
        this.inputBufferTimer = 0;
      } else if (this.canAttack) {
        const buffered = this.inputBuffer;
        this.inputBuffer = null;
        this.inputBufferTimer = 0;
        if (buffered === 'jab') this.jab();
        else if (buffered === 'hook') this.hook();
        else if (buffered === 'shove') this.shove();
      }
    }

    // Guard stun timer decay
    if (this.guardStunTimer > 0) {
      this.guardStunTimer -= dt;
      if (this.guardStunTimer < 0) this.guardStunTimer = 0;
    }
    // Guard pressure decay
    if (this.guardPressure > 0) {
      this.guardPressure -= dt * 0.015; // slow decay
      if (this.guardPressure < 0) this.guardPressure = 0;
    }

    // Batch 4: Heat decay
    this.heatDecayTimer += dt;
    if (this.heat > 0 && this.heatDecayTimer > HEAT_DECAY_DELAY) {
      this.heat -= HEAT_DECAY_RATE * dt / 1000;
      if (this.heat < 0) this.heat = 0;
    }

    // Batch 4: Slip timer
    if (this.slipCooldown > 0) {
      this.slipCooldown -= dt;
      if (this.slipCooldown < 0) this.slipCooldown = 0;
    }
    if (this.slipCounterWindow > 0) {
      this.slipCounterWindow -= dt;
      if (this.slipCounterWindow < 0) this.slipCounterWindow = 0;
    }
    if (this.state === STATES.SLIP) {
      this.slipTimer -= dt;
      if (this.slipTimer <= 0) {
        this.isSlipping = false;
        this.slipTimer = 0;
        this.slipCounterWindow = SLIP_COUNTER_WINDOW; // counter window opens after slip
        this.setState(STATES.IDLE);
      }
    }

    // Block raise timer
    if (this.state === STATES.BLOCK) {
      this.blockRaiseTimer += dt;
      const fearSlowdown = 1 + (this.fear / this.maxFear) * 0.8; // up to 80% slower at max fear
      if (this.blockRaiseTimer >= 80 * fearSlowdown && !this.blockRaised) {
        this.blockRaised = true;
      }
    }

    // Phase 2: Stamina regen/drain
    if (this.state === STATES.BLOCK) {
      this.stamina -= BLOCK_STAMINA_DRAIN * dt / 1000;
      if (this.stamina <= 0) { this.stamina = 0; this.unblock(); }
    } else if (this.state === STATES.IDLE || this.state === STATES.WALK) {
      this.stamina = Math.min(this.maxStamina, this.stamina + STAMINA_REGEN_RATE * dt / 1000);
    }

    // Reworked knockdown timer — variable AI get-up
    if (this.state === STATES.KNOCKDOWN && this.isDown) {
      this.knockdownTimer -= dt;
      // AI variable get-up — timing depends on condition/willpower
      if (!this.isPlayer) {
        const timeOnGround = KNOCKDOWN_DURATION - this.knockdownTimer;
        if (timeOnGround >= this.aiGetupDelay) {
          // AI tries to get up — simulate effort (not instant)
          this.attemptGetUp();
          // Stagger the attempts so it looks like struggling
          if (timeOnGround > this.aiGetupDelay + 100) this.attemptGetUp();
          if (timeOnGround > this.aiGetupDelay + 200) this.attemptGetUp();
          if (timeOnGround > this.aiGetupDelay + 300) {
            this.attemptGetUp();
            this.attemptGetUp();
          }
        }
      }
      if (this.knockdownTimer <= 0 && this.isDown) {
        // Failed to get up — KO
        this.isDown = false;
        this.health = 0;
        this.setState(STATES.KO);
        this.koTimer = KO_DURATION;
        this.alive = false;
        if (game) game.announcer.show('KO!', `${this.name} couldn't get up`, 2000);
      }
    }

    // Batch 1: Get-up animation (brief recovery)
    if (this.state === STATES.GETUP) {
      this.stateTimer += dt;
      if (this.stateTimer > 500) {
        this.setState(STATES.IDLE);
      }
    }

    // Batch 1: Clinch timer + auto-break
    if (this.state === STATES.CLINCH) {
      this.clinchTimer += dt;
      if (this.clinchTimer >= CLINCH_DURATION_MAX) {
        this.breakClinch();
      }
      // Keep fighters locked together
      if (this.clinchPartner) {
        const p = this.clinchPartner;
        const midX = (this.x + p.x) / 2;
        const midY = (this.y + p.y) / 2;
        this.x = lerp(this.x, midX - this.facing * 12, 0.1);
        this.y = lerp(this.y, midY, 0.1);
      }
    }
    if (this.clinchCooldown > 0) this.clinchCooldown -= dt;

    // Phase 3: Fear decay over time (calming down)
    if (this.fear > 0 && this.state !== STATES.HIT && this.state !== STATES.KNOCKDOWN) {
      this.fear -= this.fearDecayRate * dt / 1000;
      if (this.fear < 0) this.fear = 0;
      if (this.broken && this.fear < 20) this.broken = false;
    }

    // Post-knockdown wobble timer
    if (this.wobbleTimer > 0) {
      this.wobbleTimer -= dt;
      if (this.wobbleTimer < 0) this.wobbleTimer = 0;
    }

    // Batch 2: Stagger timer
    if (this.isStaggered) {
      this.staggerTimer -= dt;
      if (this.staggerTimer <= 0) {
        this.isStaggered = false;
        this.staggerTimer = 0;
      }
    }
    // Batch 2: Rapid hit window decay
    if (this.rapidHitTimer > 0) {
      this.rapidHitTimer -= dt;
      if (this.rapidHitTimer <= 0) {
        this.rapidHitTimer = 0;
        this.rapidHitCount = 0;
      }
    }

    // Batch 2: Blood trail — drip blood while moving when injured
    if (this.injuries > BLOOD_TRAIL_INJURY_THRESHOLD && this.state === STATES.WALK && game) {
      const interval = this.injuries > 60 ? BLOOD_TRAIL_HEAVY_INTERVAL : BLOOD_TRAIL_INTERVAL;
      this.bloodTrailTimer += dt;
      if (this.bloodTrailTimer >= interval) {
        this.bloodTrailTimer -= interval;
        const intensity = (this.injuries - BLOOD_TRAIL_INJURY_THRESHOLD) / 70; // 0-1
        const colors = ['#880000', '#660000', '#770000', '#550000'];
        // Small blood drops on the ground (long life = stays visible)
        const drip = new Particle(
          this.x + randRange(-6, 6), this.y + randRange(4, 10),
          0, 0,
          randItem(colors),
          randRange(2, 3 + intensity * 3),
          15000, // long life like blood pools
          0, 1
        );
        game.particles.add(drip);
        // Occasional larger splatter
        if (Math.random() < 0.3 * intensity) {
          const splat = new Particle(
            this.x + randRange(-8, 8), this.y + randRange(2, 8),
            randRange(-0.3, 0.3), randRange(0, 0.3),
            randItem(colors),
            randRange(3, 5 + intensity * 2),
            15000, 0, 1
          );
          game.particles.add(splat);
        }
      }
    }

    // Phase 1B: Knockback deceleration curve
    let friction;
    if (this.knockbackDuration > 0) {
      this.knockbackTimer += dt;
      if (this.knockbackTimer >= this.knockbackDuration) {
        this.knockbackTimer = 0;
        this.knockbackDuration = 0;
        friction = 0.85; // normal friction after knockback ends
      } else {
        // Interpolate friction: starts loose (body flies), ends heavy (brakes)
        const t = this.knockbackTimer / this.knockbackDuration;
        friction = lerp(KB_FRICTION_START, KB_FRICTION_END, t * t); // quadratic ramp to heavy braking
      }
    } else {
      friction = 0.85;
    }

    // Physics
    // Stagger + wobble reduce movement
    let moveMult = 1;
    if (this.isStaggered) moveMult *= STAGGER_SPEED_MULT;
    if (this.wobbleTimer > 0) moveMult *= WOBBLE_SPEED_MULT;
    this.x += this.vx * moveMult * dt / 16;
    this.y += this.vy * moveMult * dt / 16;
    this.vx *= friction;
    this.vy *= friction;
    if (Math.abs(this.vx) < 0.01) this.vx = 0;
    if (Math.abs(this.vy) < 0.01) this.vy = 0;

    // Phase 1B: Vertical bounce (visual offset, no Y-axis gameplay impact)
    if (this.bounceVy !== 0 || this.bounceY < 0) {
      this.bounceVy += BOUNCE_GRAVITY * dt / 16;
      this.bounceY += this.bounceVy * dt / 16;
      if (this.bounceY >= 0) {
        this.bounceY = 0;
        // Spawn dust burst on landing
        if (Math.abs(this.bounceVy) > 0.5 && game) {
          game.particles.dust(this.x, this.y + 6);
          game.particles.dust(this.x - 6, this.y + 6);
          game.particles.dust(this.x + 6, this.y + 6);
        }
        this.bounceVy = 0;
      }
    }

    // Dust when walking
    if (this.state === STATES.WALK) {
      this.dustTimer += dt;
      if (this.dustTimer > 200) {
        this.dustTimer -= 200;
        if (game) game.particles.dust(this.x, this.y + 6);
      }
    }

    // State-specific animation updates
    switch (this.state) {
      case STATES.IDLE:
        this._updateAnim(dt, ANIM_IDLE_SPD, 2, true);
        break;
      case STATES.WALK:
        this._updateAnim(dt, ANIM_WALK_SPD, this.charDef.walkFrames, true);
        break;
      case STATES.JAB:
        this._updateAttackAnim(dt, ANIM_JAB_SPD, this.charDef.jabFrames, 'jab');
        break;
      case STATES.HOOK:
        this._updateAttackAnim(dt, ANIM_HOOK_SPD, this.charDef.hookFrames, 'hook');
        break;
      case STATES.SHOVE:
        this._updateAttackAnim(dt, ANIM_JAB_SPD, this.charDef.jabFrames, 'shove');
        break;
      case STATES.BLOCK:
        this.animFrame = Math.min(2, this.charDef.blockFrames > 0 ? 2 : 0);
        break;
      case STATES.HIT:
        this._updateAnim(dt, ANIM_HIT_SPD, this.charDef.hitFrames, false);
        if (this.animFrame >= this.charDef.hitFrames - 1 && this.stateTimer > ANIM_HIT_SPD * this.charDef.hitFrames) {
          this.setState(STATES.IDLE);
        }
        break;
      case STATES.KNOCKDOWN:
        this._updateAnim(dt, 100, this.charDef.hitFrames, false);
        if (this.stateTimer > 800) this.setState(STATES.IDLE);
        break;
      case STATES.KO:
        this.animFrame = Math.max(0, this.charDef.hitFrames - 1);
        this.koTimer -= dt;
        break;
      case STATES.SLIP:
        // Use walk frame 0 (ducking pose) — visually the sprite squishes down
        this.animFrame = 0;
        break;
    }
  }

  _updateAnim(dt, speed, frameCount, loop) {
    this.animTimer += dt;
    if (this.animTimer >= speed) {
      this.animTimer -= speed;
      this.animFrame++;
      if (loop) {
        this.animFrame = this.animFrame % frameCount;
      } else {
        this.animFrame = Math.min(this.animFrame, frameCount - 1);
      }
    }
  }

  _updateAttackAnim(dt, speed, frameCount, attackType) {
    this.animTimer += dt;
    if (this.animTimer >= speed) {
      this.animTimer -= speed;
      this.animFrame++;

      if (this.animFrame >= frameCount) {
        // Phase 1C: Set recovery cooldown based on attack type
        this.recoveryCooldown = MOVE_DEFS[attackType] ? MOVE_DEFS[attackType].recovery :
          (attackType === 'hook' ? HOOK_RECOVERY_MS : JAB_RECOVERY_MS);
        // Batch 4: Whiff backstep — drift backward on miss
        if (!this.lastAttackHit && attackType !== 'shove') {
          SFX.whiff();
          const backstepDir = this.target ?
            Math.atan2(this.y - this.target.y, this.x - this.target.x) :
            (this.facing === 1 ? Math.PI : 0);
          this.vx += Math.cos(backstepDir) * WHIFF_BACKSTEP;
          this.vy += Math.sin(backstepDir) * WHIFF_BACKSTEP;
        }
        this._isCounterAttack = false;
        this.setState(STATES.IDLE);
        return;
      }
    }

    // Determine active frames (middle frames have hitbox)
    const startupEnd = Math.max(1, Math.floor(frameCount * 0.25));
    const activeEnd = Math.max(startupEnd + 1, Math.floor(frameCount * 0.75));
    this.hitboxActive = this.animFrame >= startupEnd && this.animFrame < activeEnd;
  }

  draw(ctx, cam) {
    const drawX = this.x;
    // Idle breathing — subtle Y oscillation when standing still
    let breathOffset = 0;
    if (this.state === STATES.IDLE && this.alive) {
      breathOffset = Math.sin(Date.now() * 0.003 + this.x * 0.1) * 1.2;
    }
    const drawY = this.y + this.bounceY + breathOffset; // Phase 1B: vertical bounce offset + breathing

    // Shadow — dark ellipse under feet
    if (this.alive || this.state === STATES.KO) {
      const shadowAlpha = this.state === STATES.KO ? 0.12 : 0.2;
      const shadowScale = this.state === STATES.KNOCKDOWN ? 1.3 : 1;
      ctx.globalAlpha = shadowAlpha;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(Math.floor(this.x), Math.floor(this.y + FRAME_H * SCALE / 2 - 2), 16 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Determine which sprite sheet to use
    let sheetKey, frameCount;
    switch (this.state) {
      case STATES.IDLE:
        sheetKey = this.charDef.walk;
        frameCount = this.charDef.walkFrames;
        break;
      case STATES.WALK:
        sheetKey = this.charDef.walk;
        frameCount = this.charDef.walkFrames;
        break;
      case STATES.JAB:
        sheetKey = this.charDef.jab;
        frameCount = this.charDef.jabFrames;
        break;
      case STATES.HOOK:
        sheetKey = this.charDef.hook;
        frameCount = this.charDef.hookFrames;
        break;
      case STATES.SHOVE:
        sheetKey = this.charDef.jab;
        frameCount = this.charDef.jabFrames;
        break;
      case STATES.BLOCK:
        sheetKey = this.charDef.block || this.charDef.walk;
        frameCount = this.charDef.blockFrames || this.charDef.walkFrames;
        break;
      case STATES.HIT:
      case STATES.KNOCKDOWN:
      case STATES.KO:
        sheetKey = this.charDef.hit;
        frameCount = this.charDef.hitFrames;
        break;
      case STATES.SLIP:
        sheetKey = this.charDef.walk;
        frameCount = this.charDef.walkFrames;
        break;
      default:
        sheetKey = this.charDef.walk;
        frameCount = this.charDef.walkFrames;
    }

    const sheet = assets[sheetKey];
    if (!sheet) return;

    const frame = clamp(this.animFrame, 0, frameCount - 1);
    const srcX = frame * FRAME_W;
    const srcY = 0;
    const srcW = FRAME_W;
    const srcH = Math.min(FRAME_H, sheet.height);

    ctx.save();
    ctx.translate(Math.floor(drawX), Math.floor(drawY));

    // Hit flash effect
    if (this.hitFlash > 0 && this.hitFlash % 2 === 0) {
      ctx.filter = 'brightness(3)';
    }

    // KO tint
    if (this.state === STATES.KO) {
      ctx.globalAlpha = 0.6;
    }

    // Batch 1: Knockdown — squash sprite to look like they're on the ground
    if (this.state === STATES.KNOCKDOWN) {
      ctx.globalAlpha = 0.8;
      ctx.scale(1, 0.35); // flatten vertically
      ctx.translate(0, FRAME_H * SCALE * 0.8); // shift down
    }

    // Batch 1: Get-up animation — stretching back up
    if (this.state === STATES.GETUP) {
      const t = Math.min(1, this.stateTimer / 400);
      const yScale = 0.35 + t * 0.65;
      ctx.scale(1, yScale);
      ctx.translate(0, FRAME_H * SCALE * (1 - yScale) * 0.5);
    }

    // Batch 4: Slip — duck down, squish sprite to show dodging
    if (this.state === STATES.SLIP) {
      const slipT = 1 - (this.slipTimer / SLIP_DURATION); // 0→1
      const duckAmount = Math.sin(slipT * Math.PI); // smooth arc: up→duck→up
      ctx.scale(1.15, 1 - duckAmount * 0.4); // widen slightly, squish down 40%
      ctx.translate(0, FRAME_H * SCALE * duckAmount * 0.35); // shift down
    }

    // Flip for facing direction
    if (this.facing === -1) {
      ctx.scale(-1, 1);
    }

    // Draw sprite centered
    const dw = FRAME_W * SCALE;
    const dh = srcH * SCALE;
    ctx.drawImage(sheet, srcX, srcY, srcW, srcH, -dw/2, -dh/2, dw, dh);

    // Phase 4: Injury tint overlay — reddish bruising
    if (this.injuries > 25) {
      const injAlpha = Math.min(0.3, (this.injuries - 25) / 200);
      ctx.globalAlpha = injAlpha;
      ctx.fillStyle = '#880022';
      ctx.fillRect(-dw/2, -dh/2, dw, dh);
      ctx.globalAlpha = 1;
    }

    // Batch 4: Heat glow — fighter pulses warm when momentum is high
    if (this.heat > 25) {
      const heatIntensity = (this.heat - 25) / 75; // 0→1 over 25-100 range
      const pulse = 0.5 + Math.sin(Date.now() * 0.006) * 0.5; // slow pulse
      ctx.globalAlpha = heatIntensity * 0.15 * (0.7 + pulse * 0.3);
      ctx.fillStyle = this.heat > 70 ? '#ff4400' : '#ff8800';
      ctx.fillRect(-dw/2 - 2, -dh/2 - 2, dw + 4, dh + 4);
      ctx.globalAlpha = 1;
    }

    // Batch 5: Hit confirm — white outline flash when you land a clean hit
    if (this.hitConfirmTimer > 0) {
      const t = this.hitConfirmTimer / HIT_CONFIRM_DURATION;
      ctx.globalAlpha = t * 0.6;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-dw/2 - 1, -dh/2 - 1, dw + 2, dh + 2);
      ctx.globalAlpha = 1;
    }

    // Batch 5: Failed input — brief red tint when attack can't execute
    if (this.failedInputTimer > 0) {
      const t = this.failedInputTimer / FAILED_INPUT_FLASH;
      ctx.globalAlpha = t * 0.25;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(-dw/2, -dh/2, dw, dh);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Post-knockdown wobble visual — sway
    if (this.wobbleTimer > 0 && this.state !== STATES.KNOCKDOWN && this.state !== STATES.KO) {
      const wobbleIntensity = clamp(this.wobbleTimer / WOBBLE_DURATION, 0, 1);
      const sway = Math.sin(Date.now() * 0.008) * 2 * wobbleIntensity;
      // Draw small wobble lines above head
      ctx.strokeStyle = `rgba(255,220,100,${0.3 * wobbleIntensity})`;
      ctx.lineWidth = 1;
      const wy = drawY - FRAME_H * SCALE / 2 - 14;
      ctx.beginPath();
      ctx.moveTo(drawX - 8 + sway, wy);
      ctx.quadraticCurveTo(drawX + sway * 2, wy - 3, drawX + 8 + sway, wy);
      ctx.stroke();
    }

    // Batch 2: Stagger visual — wobble + stars
    if (this.isStaggered) {
      const wobble = Math.sin(Date.now() * 0.02) * 3;
      const starY = drawY - dh/2 - 12;
      ctx.fillStyle = '#ffdd44';
      ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.01) * 0.3;
      for (let s = 0; s < 3; s++) {
        const starAng = Date.now() * 0.005 + s * (Math.PI * 2 / 3);
        const sx = drawX + Math.cos(starAng) * 12;
        const sy = starY + Math.sin(starAng) * 4;
        ctx.fillRect(Math.floor(sx) - 1, Math.floor(sy) - 1, 3, 3);
      }
      ctx.globalAlpha = 1;
    }

    // Gang color circle under feet
    if (this.gangId) {
      const gc = GANG_COLORS[this.gangId];
      if (gc) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = gc.primary;
        ctx.beginPath();
        ctx.ellipse(Math.floor(drawX), Math.floor(drawY + dh/2 - 4), 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Player indicator - arrow + glow
    if (this.isPlayer) {
      const indY = drawY - dh/2 - 10;
      // Glow
      ctx.fillStyle = 'rgba(255,208,128,0.3)';
      ctx.beginPath();
      ctx.ellipse(Math.floor(drawX), Math.floor(drawY + dh/2 - 4), 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Arrow
      ctx.fillStyle = '#ffd080';
      ctx.beginPath();
      ctx.moveTo(drawX - 5, indY);
      ctx.lineTo(drawX, indY - 7);
      ctx.lineTo(drawX + 5, indY);
      ctx.closePath();
      ctx.fill();
    }

    // Batch 5: Combo counter display
    if (this.comboCount >= 2 && this.comboDisplayTimer > 0) {
      const alpha = Math.min(1, this.comboDisplayTimer / 300);
      const bobY = Math.sin(Date.now() * 0.008) * 2;
      const cx = drawX + (this.facing === 1 ? 28 : -28);
      const cy = drawY - dh/2 - 8 + bobY;
      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      // Shadow
      ctx.fillStyle = '#000';
      ctx.fillText(`${this.comboCount}x`, cx + 1, cy + 1);
      // Color — escalates with combo
      ctx.fillStyle = this.comboCount >= 5 ? '#ff4444' : this.comboCount >= 3 ? '#ffaa00' : '#ffdd44';
      ctx.fillText(`${this.comboCount}x`, cx, cy);
      ctx.restore();
    }
  }

  drawHealthBar(ctx, cam) {
    if (this.state === STATES.KO && this.koTimer <= 0) return;
    const barW = 40;
    const barH = 4;
    const bx = this.x - barW / 2;
    const by = this.y - FRAME_H * SCALE / 2 - 8;
    const healthPct = this.health / this.maxHealth;

    // Background
    ctx.fillStyle = '#1a1111';
    ctx.fillRect(Math.floor(bx - 1), Math.floor(by - 1), barW + 2, barH + 2);

    // Health
    const hColor = healthPct > 0.5 ? '#44aa44' : healthPct > 0.25 ? '#ccaa22' : '#cc2222';
    ctx.fillStyle = hColor;
    ctx.fillRect(Math.floor(bx), Math.floor(by), Math.ceil(barW * healthPct), barH);

    // Batch 1: Knockdown count indicator
    if (this.knockdownCount > 0 && this.alive) {
      const kdX = this.x - 10;
      const kdY = by - 6;
      for (let i = 0; i < MAX_KNOCKDOWNS; i++) {
        ctx.fillStyle = i < this.knockdownCount ? '#cc2222' : '#3a3530';
        ctx.fillRect(Math.floor(kdX + i * 7), Math.floor(kdY), 5, 3);
      }
    }

    // Batch 1: Clinch indicator
    if (this.inClinch) {
      ctx.fillStyle = '#ffaa44';
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CLINCH', this.x, by - 6);
    }

    // Batch 2: Stagger indicator
    if (this.isStaggered) {
      ctx.fillStyle = '#ffdd44';
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.008) * 0.3;
      ctx.fillText('DAZED', this.x, by - (this.inClinch ? 12 : 6));
      ctx.globalAlpha = 1;
    }

    // Batch 1: Get-up progress bar during knockdown
    if (this.state === STATES.KNOCKDOWN && this.isDown && this.isPlayer) {
      const progW = 30;
      const progH = 4;
      const progX = this.x - progW / 2;
      const progY = this.y + 20;
      const needed = GETUP_TAPS_NEEDED + (this.knockdownCount - 1) * 2;
      const pct = this.getupTaps / needed;
      ctx.fillStyle = '#1a1111';
      ctx.fillRect(Math.floor(progX), Math.floor(progY), progW, progH);
      ctx.fillStyle = '#ffdd44';
      ctx.fillRect(Math.floor(progX), Math.floor(progY), Math.ceil(progW * pct), progH);
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(Math.floor(progX), Math.floor(progY), progW, progH);
      // "MASH!" text
      ctx.fillStyle = '#ffdd44';
      ctx.font = '4px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
      ctx.fillText('MASH!', this.x, progY + 10);
      ctx.globalAlpha = 1;
    }

    // Phase 3: Fear/broken indicator
    if (this.broken) {
      ctx.fillStyle = '#ff4444';
      ctx.font = '4px monospace';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.008) * 0.3;
      ctx.fillText('!!', this.x, by - 3);
      ctx.globalAlpha = 1;
    } else if (this.fear > this.fearThreshold * 0.7) {
      ctx.fillStyle = '#ffaa44';
      ctx.font = '4px monospace';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.4;
      ctx.fillText('!', this.x, by - 3);
      ctx.globalAlpha = 1;
    }
  }
}
