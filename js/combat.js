// YARD — Collision & Combat System
// ============================================================
// COLLISION
// ============================================================
function boxOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolveFighterCollisions(fighters) {
  for (let i = 0; i < fighters.length; i++) {
    for (let j = i + 1; j < fighters.length; j++) {
      const a = fighters[i];
      const b = fighters[j];
      if (a.state === STATES.KO || b.state === STATES.KO) continue;
      if (a.state === STATES.KNOCKDOWN || b.state === STATES.KNOCKDOWN) continue;
      // Don't separate fighters in clinch with each other
      if (a.inClinch && a.clinchPartner === b) continue;
      if (b.inClinch && b.clinchPartner === a) continue;
      const d = dist(a, b);
      const minDist = 36;
      if (d < minDist && d > 0) {
        const overlap = (minDist - d) / 2;
        const nx = (b.x - a.x) / d;
        const ny = (b.y - a.y) / d;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;
      }

      // Batch 1: Clinch detection — enemies close together for long enough
      if (d < CLINCH_DISTANCE && a.gangId !== b.gangId &&
          a.alive && b.alive &&
          !a.inClinch && !b.inClinch &&
          a.clinchCooldown <= 0 && b.clinchCooldown <= 0 &&
          a.canAct && b.canAct &&
          a.state !== STATES.BLOCK && b.state !== STATES.BLOCK) {
        // Track proximity time on the first fighter
        a.clinchProximityTimer += 16; // approximate dt
        if (a.clinchProximityTimer >= CLINCH_TIME_NEEDED) {
          a.clinchProximityTimer = 0;
          b.clinchProximityTimer = 0;
          a.enterClinch(b);
          b.enterClinch(a);
          // Face each other
          a.facing = b.x > a.x ? 1 : -1;
          b.facing = a.x > b.x ? 1 : -1;
        }
      } else {
        a.clinchProximityTimer = Math.max(0, a.clinchProximityTimer - 8);
      }
    }
  }
}

// ============================================================
// COMBAT SYSTEM
// ============================================================
function processCombat(attackers, defenders, particles, camera) {
  for (const attacker of attackers) {
    if (attacker.state !== STATES.JAB && attacker.state !== STATES.HOOK && attacker.state !== STATES.SHOVE) continue;
    if (!attacker.hitboxActive) continue;

    const hitbox = attacker.getHitbox();
    if (!hitbox) continue;

    for (const defender of defenders) {
      if (defender === attacker) continue;
      if (attacker.gangId && attacker.gangId === defender.gangId) continue;
      if (attacker.hitTargets.has(defender)) continue;
      if (defender.invulnFrames > 0) continue;

      // Post-KO hits — 1v1/cell: unlimited beating. Riot: 1.5s then scenery
      if (defender.state === STATES.KO) {
        const isRiot = game && game.mode === 'riot';
        if (isRiot && defender.koTimer < KO_DURATION - 1500) continue; // riot: stop after 1.5s
        const hurtbox = defender.getHurtbox();
        if (!boxOverlap(hitbox, hurtbox)) continue;
        attacker.hitTargets.add(defender);
        // Ragdoll knockback — body gets shoved around
        const knockDir = Math.atan2(defender.y - attacker.y, defender.x - attacker.x);
        const isHook = attacker.state === STATES.HOOK;
        defender.vx += Math.cos(knockDir) * (isHook ? 6 : 3);
        defender.vy += Math.sin(knockDir) * (isHook ? 6 : 3);
        defender.hitFlash = 4;
        // Particles + sound
        const hitX = (attacker.x + defender.x) / 2 + attacker.facing * 8;
        const hitY = (attacker.y + defender.y) / 2;
        particles.blood(hitX, hitY, attacker.facing, isHook ? 1.2 : 0.6);
        particles.impact(hitX, hitY);
        if (isHook) { SFX.hookHit(0.7); } else { SFX.punchHit(0.7); }
        camera.shake(isHook ? 3 : 1.5, 80, Math.cos(knockDir), Math.sin(knockDir));
        attacker.hitConfirmTimer = HIT_CONFIRM_DURATION;
        attacker.lastAttackHit = true;
        continue; // skip normal damage processing
      }

      const hurtbox = defender.getHurtbox();
      if (!boxOverlap(hitbox, hurtbox)) continue;

      // HIT!
      attacker.hitTargets.add(defender);

      const isHook = attacker.state === STATES.HOOK;
      const isShove = attacker.state === STATES.SHOVE;

      // Slip dodge — hooks always miss, jabs miss if timed in first 120ms of slip
      if (defender.isSlipping && !isShove) {
        const slipElapsed = SLIP_DURATION - defender.slipTimer;
        const jabDodge = !isHook && slipElapsed < 120; // tight window — duck under jab
        if (isHook || jabDodge) {
          if (game && game.dmgNumbers) {
            game.dmgNumbers.add(defender.x, defender.y - FRAME_H * SCALE / 2 - 12, 0, false, false,
              jabDodge ? 'DUCK!' : 'SLIP!');
          }
          if (game && game.announcer && (defender.isPlayer || attacker.isPlayer)) {
            game.announcer.show(jabDodge ? 'DUCKED IT!' : 'SLIPPED!', '', 600);
          }
          SFX.whiff();
          continue;
        }
      }

      const moveDef = isShove ? MOVE_DEFS.shove : (isHook ? MOVE_DEFS.hook : MOVE_DEFS.jab);
      const baseDmg = moveDef.damage;
      const baseKnock = moveDef.knockback;
      // Phase 2: low stamina weakens damage
      const staminaMult = attacker.stamina < LOW_STAMINA_THRESHOLD ? LOW_STAMINA_DAMAGE_MULT : 1;
      // Fear weakens the attacker's commitment
      const fearWeakness = attacker.fear > 0 ? 1 - (attacker.fear / attacker.maxFear) * 0.25 : 1;

      // Batch 4: Heat damage bonus
      const heatMult = 1 + (attacker.heat / HEAT_MAX) * HEAT_DAMAGE_BONUS;
      // Batch 4: Counter-attack bonus
      const counterMult = attacker._isCounterAttack ? SLIP_COUNTER_DAMAGE_MULT : 1;
      // Batch 4: Corner pressure — defender near arena edge takes more
      let cornerMult = 1;
      if (game) {
        const arenaW = game.mode === 'cell' ? YARD_CELL_W : game.yardWidth || 800;
        const arenaH = game.mode === 'cell' ? YARD_CELL_H : game.yardHeight || 500;
        const edgeDist = Math.min(defender.x, arenaW - defender.x, defender.y, arenaH - defender.y);
        if (edgeDist < CORNER_PRESSURE_DIST) {
          cornerMult = CORNER_PRESSURE_DMG_MULT;
        }
      }

      const damage = baseDmg * attacker.damageMult * staminaMult * fearWeakness * heatMult * counterMult * cornerMult;
      const knockDir = Math.atan2(defender.y - attacker.y, defender.x - attacker.x);
      const knockForce = baseKnock;

      const result = defender.takeDamage(damage, knockDir, knockForce, attacker, isHook);
      if (!result) continue;

      // Combo tracking
      attacker.comboCount++;
      attacker.comboTimer = 1000;

      // Phase 4: Stats tracking
      attacker.hitsLanded++;
      attacker.damageDealt += result.damage;
      if (defender.state === STATES.KO) attacker.knockdowns++;
      attacker.lastAttackHit = true; // Batch 4: whiff tracking

      // Batch 5: Hit confirm flash + combo display
      if (!result.blocked) {
        attacker.hitConfirmTimer = HIT_CONFIRM_DURATION;
        attacker.comboDisplayTimer = COMBO_DISPLAY_DURATION;
      }

      // Batch 4: Heat gain on successful hit
      if (!result.blocked) {
        const heatGain = isHook ? HEAT_GAIN_HOOK : HEAT_GAIN_PER_HIT;
        attacker.heat = Math.min(HEAT_MAX, attacker.heat + heatGain);
        attacker.heatDecayTimer = 0;
      }

      // Batch 4: Counter-attack announcement
      if (attacker._isCounterAttack && !result.blocked) {
        attacker._isCounterAttack = false;
        if (game && game.announcer) {
          game.announcer.show('COUNTER!', '', 700);
        }
        // Extra fear on counter
        if (defender.alive) {
          defender.fear = Math.min(defender.maxFear, defender.fear + 8);
        }
      }

      // Batch 4: Corner pressure — extra fear when cornered
      if (cornerMult > 1 && !result.blocked && defender.alive) {
        const bonusFear = moveDef.fearDamage * (CORNER_PRESSURE_FEAR_MULT - 1);
        defender.fear = Math.min(defender.maxFear, defender.fear + bonusFear);
      }

      // Phase 4: Floating damage numbers
      if (game && game.dmgNumbers) {
        const numY = defender.y - FRAME_H * SCALE / 2 - 12;
        game.dmgNumbers.add(defender.x, numY, result.damage, result.blocked, isHook && !result.blocked);
      }

      // Phase 1A: Asymmetric time-based hitstop
      const isKO = defender.state === STATES.KO;
      let hitstopMs = moveDef.hitstop;
      if (isKO) hitstopMs = KO_HITSTOP; // long dramatic freeze on KO
      defender.hitstopDuration = hitstopMs;
      defender.hitstopTimer = 0;
      attacker.hitstopDuration = hitstopMs * HITSTOP_ATTACKER_MULT;
      attacker.hitstopTimer = 0;

      // Phase 1B: Set knockback deceleration curve
      if (!result.blocked) {
        const kbDur = isHook ? KNOCKBACK_DURATION_HOOK : KNOCKBACK_DURATION_JAB;
        defender.knockbackDuration = kbDur;
        defender.knockbackTimer = 0;
        // Vertical bounce on hooks
        if (isHook) {
          defender.bounceVy = HOOK_VERTICAL_BOUNCE;
          defender.bounceY = 0;
        }
        // Batch 5: Impact dust at feet
        particles.impactDust(defender.x, defender.y);
      }

      // Particles
      const hitX = (attacker.x + defender.x) / 2 + attacker.facing * 8;
      const hitY = (attacker.y + defender.y) / 2;

      // Phase 2/4: directional shake + zoom punch, scaled by distance from player
      const shDirX = Math.cos(knockDir);
      const shDirY = Math.sin(knockDir);

      // Phase 4: Scale camera effects by proximity to player
      let camScale = 1;
      if (game && game.player && game.player.alive) {
        const dToPlayer = dist({x: hitX, y: hitY}, game.player);
        const isInvolved = attacker.isPlayer || defender.isPlayer;
        if (!isInvolved) {
          // Far-away fights cause less screen disruption
          camScale = clamp(1 - (dToPlayer - 80) / 200, 0.1, 1);
        }
      }

      if (result.blocked) {
        particles.impact(hitX, hitY);
        camera.shake(2 * camScale, 80, shDirX, shDirY);
        SFX.blockHit();
      } else {
        const intensity = isHook ? 1.5 : 0.8;
        particles.blood(hitX, hitY, attacker.facing, intensity);
        particles.impact(hitX, hitY);
        camera.shake((isHook ? 6 : 3) * camScale, isHook ? 200 : 100, shDirX, shDirY);

        // Sound — jab vs hook vs shove
        if (isShove) {
          SFX.shove();
        } else if (isHook) {
          SFX.hookHit(camScale);
        } else {
          SFX.punchHit(camScale);
        }

        // Phase 2: Zoom punch + screen flash on hooks
        if (isHook) {
          camera.zoomPunch(0.06 * camScale, 180);
          if (game) game.hitFlashAlpha = 0.08 * camScale;
          particles.speedLines(hitX, hitY, shDirX, shDirY);
        }

        // Blood pool on KO
        if (isKO) {
          SFX.koHit();
          SFX.crowdRoar(camScale);
          particles.bloodPool(defender.x, defender.y + 4);
          camera.shake(10 * camScale, 350, shDirX, shDirY);
          camera.zoomPunch(0.12 * camScale, 350);
          if (game) game.hitFlashAlpha = 0.2 * camScale;

          // Phase 3: Witnessing a KO spreads fear to nearby fighters
          if (game) {
            for (const f of game.fighters) {
              if (!f.alive || f === attacker || f === defender) continue;
              const dToKO = dist(f, defender);
              if (dToKO < 120) {
                if (f.gangId === defender.gangId) {
                  f.fear = Math.min(f.maxFear, f.fear + 25 * (1 - f.traits.toughness * 0.4));
                } else if (f.gangId === attacker.gangId) {
                  f.fear = Math.max(0, f.fear - 15);
                }
              }
            }
          }
        }
      }

      // Shove wall-splat check
      if (attacker.state === STATES.SHOVE && !result.blocked && game) {
        const wallMargin = 35;
        const nearWall = defender.x < wallMargin || defender.x > game.worldW - wallMargin ||
                         defender.y < wallMargin || defender.y > game.worldH - wallMargin;
        if (nearWall) {
          defender.knockDown();
          camera.shake(10, 300, shDirX, shDirY);
          game.hitFlashAlpha = 0.15;
          game.announcer.show('WALL SPLAT!', '', 800);
          defender.fear = Math.min(defender.maxFear, defender.fear + 20);
        }
      }
    }
  }
}
