// YARD — Game Class
// ============================================================
// MAIN GAME CLASS
// ============================================================
class Game {
  constructor(mode, playerGang, config = null) {
    this.mode = mode;
    this.playerGang = playerGang;
    this.customConfig = config;
    this.fighters = [];
    this.gangs = [];
    this.particles = new ParticleSystem();
    this.dmgNumbers = new DamageNumberSystem(); // Phase 4
    this.camera = new Camera();
    this.announcer = new Announcer();
    this.bloodStains = []; // Batch 5: persistent blood marks on ground
    this.player = null;

    // World size — custom mode uses arena setting, scales with fighter count
    if (mode === 'custom' && config) {
      const totalFighters = config.crewSize + config.enemyTeams.reduce((s, t) => s + t.count, 0);
      if (config.arena === 'cell') {
        this.worldW = YARD_CELL_W;
        this.worldH = YARD_CELL_H;
      } else if (totalFighters <= 2) {
        this.worldW = YARD_1V1_W;
        this.worldH = YARD_1V1_H;
      } else if (totalFighters <= 6) {
        // Scale yard with fighter count
        this.worldW = Math.floor(YARD_1V1_W + (YARD_RIOT_W - YARD_1V1_W) * ((totalFighters - 2) / 8));
        this.worldH = Math.floor(YARD_1V1_H + (YARD_RIOT_H - YARD_1V1_H) * ((totalFighters - 2) / 8));
      } else {
        this.worldW = YARD_RIOT_W;
        this.worldH = YARD_RIOT_H;
      }
    } else {
      this.worldW = mode === 'riot' ? YARD_RIOT_W : mode === 'cell' ? YARD_CELL_W : YARD_1V1_W;
      this.worldH = mode === 'riot' ? YARD_RIOT_H : mode === 'cell' ? YARD_CELL_H : YARD_1V1_H;
    }

    this.camera.worldW = this.worldW;
    this.camera.worldH = this.worldH;
    this.ais = [];
    this.gameOver = false;
    this.gameOverTimer = 0;
    this.riotTriggered = false;
    this.slowmo = 0;
    this.hitFlashAlpha = 0; // Phase 2: screen flash on big hits

    const isCell = (mode === 'cell') || (mode === 'custom' && config && config.arena === 'cell');
    this.yard = isCell ? new ProceduralCell(this.worldW, this.worldH) : new ProceduralYard(this.worldW, this.worldH);

    // Fight intro/outro
    this.introTimer = 0;
    const totalFighters = mode === 'custom' && config ?
      config.crewSize + config.enemyTeams.reduce((s, t) => s + t.count, 0) : 0;
    const isSmallFight = (mode === '1v1' || mode === 'cell' || (mode === 'custom' && totalFighters <= 4));
    this.introPhase = isSmallFight ? 'staredown' : 'none';
    this.introDuration = 2400;
    this.outroTimer = 0;
    this.outroActive = false;

    // Phase 3: Riot phase tracking
    this.riotPhase = 'calm';       // calm → tension → eruption → chaos → aftermath
    this.riotTimer = 0;
    this.totalKOs = 0;
    this.lastStandingGang = null;

    // Batch 2: Guard alarm (riot/custom multi mode)
    this.guardAlarmDuration = GUARD_ALARM_MIN + Math.random() * (GUARD_ALARM_MAX - GUARD_ALARM_MIN);
    this.guardAlarmTimer = 0;
    this.guardAlarmActive = false;
    this.guardWarningShown = false;
    this.guardRecallActive = false;
    this.guardRecallTimer = 0;

    // Batch 2: Spectator NPCs
    this.spectators = [];

    if (mode === 'custom') {
      this._setupCustom(config);
    } else if (mode === '1v1') {
      this._setup1v1();
    } else if (mode === 'cell') {
      this._setupCell();
    } else {
      this._setupRiot();
    }
  }

  _setup1v1() {
    const pDef = getCharDef(this.playerGang);
    // Pick a random opponent gang
    const otherGangs = Object.keys(GANG_COLORS).filter(g => g !== this.playerGang);
    const oppGang = randItem(otherGangs);
    const eDef = getCharDef(oppGang);

    const player = new Fighter(this.worldW * 0.3, this.worldH * 0.5, pDef, this.playerGang, {
      aggression: playerTraits.aggression,
      toughness: playerTraits.toughness,
      speed: playerTraits.speed,
      power: playerTraits.power
    });
    player.isPlayer = true;
    player.name = randomName();
    player.facing = 1;

    const enemy = new Fighter(this.worldW * 0.7, this.worldH * 0.5, eDef, oppGang, {
      aggression: 0.6 + Math.random() * 0.3,
      toughness: 0.5 + Math.random() * 0.3,
      speed: 0.5 + Math.random() * 0.3,
      power: 0.5 + Math.random() * 0.3
    });
    enemy.name = randomName();
    enemy.facing = -1;

    this.player = player;
    this.fighters = [player, enemy];
    const ai = new AIController(enemy, 0.55 + Math.random() * 0.35);
    this.ais = [ai];

    // Camera centered on arena
    this.camera.zoom = 1.5;
    this.camera.followFast = true;
    this.camera.targetX = this.worldW / 2;
    this.camera.targetY = this.worldH / 2;
    this.camera.x = (this.worldW - CANVAS_W / this.camera.zoom) / 2;
    this.camera.y = (this.worldH - CANVAS_H / this.camera.zoom) / 2;

    // Intro handled by intro system — set opponent gang for display
    this._oppGang = oppGang;
  }

  _setupCell() {
    const pDef = getCharDef(this.playerGang);
    const otherGangs = Object.keys(GANG_COLORS).filter(g => g !== this.playerGang);
    const oppGang = randItem(otherGangs);
    const eDef = getCharDef(oppGang);

    // Tight cell — fighters start close
    const player = new Fighter(this.worldW * 0.3, this.worldH * 0.55, pDef, this.playerGang, {
      aggression: playerTraits.aggression,
      toughness: playerTraits.toughness,
      speed: playerTraits.speed,
      power: playerTraits.power
    });
    player.isPlayer = true;
    player.name = randomName();
    player.facing = 1;

    const enemy = new Fighter(this.worldW * 0.7, this.worldH * 0.55, eDef, oppGang, {
      aggression: 0.5 + Math.random() * 0.4,
      toughness: 0.5 + Math.random() * 0.4,
      speed: 0.4 + Math.random() * 0.4,
      power: 0.5 + Math.random() * 0.4
    });
    enemy.name = randomName();
    enemy.facing = -1;

    this.player = player;
    this.fighters = [player, enemy];
    const ai = new AIController(enemy, 0.5 + Math.random() * 0.4);
    this.ais = [ai];

    // Zoomed in tight — claustrophobic
    this.camera.zoom = 2.2;
    this.camera.followFast = true;
    this.camera.targetX = this.worldW / 2;
    this.camera.targetY = this.worldH / 2;
    this.camera.x = (this.worldW - CANVAS_W / this.camera.zoom) / 2;
    this.camera.y = (this.worldH - CANVAS_H / this.camera.zoom) / 2;

    this._oppGang = oppGang;
  }

  _setupRiot() {
    const gangIds = Object.keys(GANG_COLORS);
    const positions = [
      { x: this.worldW * 0.2, y: this.worldH * 0.3 },
      { x: this.worldW * 0.8, y: this.worldH * 0.3 },
      { x: this.worldW * 0.2, y: this.worldH * 0.7 },
      { x: this.worldW * 0.8, y: this.worldH * 0.7 },
    ];

    for (let gi = 0; gi < gangIds.length; gi++) {
      const gangId = gangIds[gi];
      const pos = positions[gi];
      const gang = new Gang(gangId, pos.x, pos.y);
      const memberCount = randInt(5, 7);

      for (let i = 0; i < memberCount; i++) {
        const def = getCharDef(gangId);
        const traits = {
          aggression: 0.3 + Math.random() * 0.6,
          toughness: 0.3 + Math.random() * 0.5,
          speed: 0.3 + Math.random() * 0.5,
          power: 0.3 + Math.random() * 0.5,
          leadership: i === 0 ? 0.8 : Math.random() * 0.3
        };
        const fx = pos.x + randRange(-55, 55);
        const fy = pos.y + randRange(-40, 40);
        const fighter = new Fighter(fx, fy, def, gangId, traits);
        fighter.name = randomName();

        const isPlayerFighter = gangId === this.playerGang && i === 0;
        if (isPlayerFighter) {
          fighter.isPlayer = true;
          // Use player-created traits
          fighter.traits.aggression = playerTraits.aggression;
          fighter.traits.toughness = playerTraits.toughness;
          fighter.traits.speed = playerTraits.speed;
          fighter.traits.power = playerTraits.power;
          fighter.personality = fighter._derivePersonality();
          // Recalculate derived stats
          fighter.maxHealth = MAX_HEALTH * (0.8 + fighter.traits.toughness * 0.4);
          fighter.health = fighter.maxHealth;
          fighter.baseMoveSpeed = T('BASE_MOVE_SPEED_MIN', 1.2) + fighter.traits.speed * T('BASE_MOVE_SPEED_RANGE', 0.8);
          fighter.damageMult = 0.7 + fighter.traits.power * 0.6;
          this.player = fighter;
        }

        const ai = new AIController(fighter, 0.5 + traits.aggression * 0.4);
        gang.addMember(fighter, ai);
        this.fighters.push(fighter);
        if (!isPlayerFighter) this.ais.push(ai);
      }

      gang.assignRoles();
      this.gangs.push(gang);
    }

    // Camera follows player - zoom out to see more of the yard
    this.camera.zoom = Math.min(CANVAS_W / 700, CANVAS_H / 480);

    // Batch 2: Spawn spectator NPCs along yard edges
    this._spawnSpectators();

    this.announcer.show('YARD TIME', 'Tensions are rising...', 3000);
  }

  _setupCustom(config) {
    const isCell = config.arena === 'cell';
    const totalFighters = config.crewSize + config.enemyTeams.reduce((s, t) => s + t.count, 0);
    const isMulti = totalFighters > 4;

    // Spawn player's crew
    const pDef = getCharDef(this.playerGang);
    for (let i = 0; i < config.crewSize; i++) {
      const fx = this.worldW * 0.25 + randRange(-40, 40);
      const fy = this.worldH * 0.5 + randRange(-30, 30);
      const traits = i === 0 ? {
        aggression: playerTraits.aggression,
        toughness: playerTraits.toughness,
        speed: playerTraits.speed,
        power: playerTraits.power
      } : {
        aggression: 0.3 + Math.random() * 0.5,
        toughness: 0.3 + Math.random() * 0.5,
        speed: 0.3 + Math.random() * 0.5,
        power: 0.3 + Math.random() * 0.5
      };
      const fighter = new Fighter(fx, fy, pDef, this.playerGang, traits);
      fighter.name = randomName();
      fighter.facing = 1;

      if (i === 0) {
        fighter.isPlayer = true;
        this.player = fighter;
      } else {
        const ai = new AIController(fighter, 0.45 + Math.random() * 0.35);
        this.ais.push(ai);
      }
      this.fighters.push(fighter);
    }

    // Spawn enemy teams
    const teamPositions = [
      { x: this.worldW * 0.75, y: this.worldH * 0.5 },
      { x: this.worldW * 0.5, y: this.worldH * 0.2 },
      { x: this.worldW * 0.5, y: this.worldH * 0.8 },
    ];
    config.enemyTeams.forEach((team, ti) => {
      const pos = teamPositions[ti % teamPositions.length];
      const eDef = getCharDef(team.gang);
      for (let i = 0; i < team.count; i++) {
        const fx = pos.x + randRange(-35, 35);
        const fy = pos.y + randRange(-25, 25);
        const traits = {
          aggression: 0.4 + Math.random() * 0.5,
          toughness: 0.3 + Math.random() * 0.5,
          speed: 0.3 + Math.random() * 0.5,
          power: 0.3 + Math.random() * 0.5
        };
        const enemy = new Fighter(fx, fy, eDef, team.gang, traits);
        enemy.name = randomName();
        enemy.facing = -1;
        this.fighters.push(enemy);
        const ai = new AIController(enemy, 0.45 + Math.random() * 0.4);
        this.ais.push(ai);
      }
    });

    // Set targets — enemies target player's gang, allies target nearest enemy
    for (const f of this.fighters) {
      if (!f.isPlayer) {
        const enemies = this.fighters.filter(e => e.gangId !== f.gangId && e.alive);
        if (enemies.length > 0) {
          f.target = enemies[Math.floor(Math.random() * enemies.length)];
        }
      }
    }

    // Camera setup
    if (isCell) {
      this.camera.zoom = 2.2;
    } else if (totalFighters <= 2) {
      this.camera.zoom = 1.5;
    } else {
      this.camera.zoom = Math.min(CANVAS_W / (this.worldW * 0.7), CANVAS_H / (this.worldH * 0.7));
    }
    this.camera.followFast = true;
    this.camera.targetX = this.worldW / 2;
    this.camera.targetY = this.worldH / 2;
    this.camera.x = (this.worldW - CANVAS_W / this.camera.zoom) / 2;
    this.camera.y = (this.worldH - CANVAS_H / this.camera.zoom) / 2;

    // Spectators for yard fights
    if (!isCell && totalFighters > 2) {
      this._spawnSpectators();
    }

    // Build intro text
    const gangNames = config.enemyTeams.map(t => GANG_COLORS[t.gang].name);
    const vsText = gangNames.join(' & ');
    const crewText = config.crewSize > 1 ? `${config.crewSize} ${GANG_COLORS[this.playerGang].name}` : GANG_COLORS[this.playerGang].name;
    this._oppGang = config.enemyTeams[0].gang;

    if (totalFighters <= 4) {
      // Small fight — use intro system
    } else {
      // Big fight — skip intro, just announce
      this.introPhase = 'none';
      this.announcer.show(`${crewText} vs ${vsText}`, `${totalFighters} fighters`, 2500);
    }
  }

  _spawnSpectators() {
    const w = this.worldW;
    const h = this.worldH;
    const margin = 18; // how close to edge
    const minSpacing = 25;

    // Top edge spectators
    for (let x = 40; x < w - 40; x += minSpacing + Math.random() * 20) {
      if (Math.random() < 0.5) continue; // sparse distribution
      this.spectators.push(new Spectator(x, margin + randRange(-2, 4), 'top'));
    }
    // Bottom edge spectators
    for (let x = 40; x < w - 40; x += minSpacing + Math.random() * 20) {
      if (Math.random() < 0.5) continue;
      this.spectators.push(new Spectator(x, h - margin + randRange(-4, 2), 'bottom'));
    }
    // Left edge
    for (let y = 50; y < h - 50; y += minSpacing + Math.random() * 25) {
      if (Math.random() < 0.6) continue;
      this.spectators.push(new Spectator(margin + randRange(-2, 4), y, 'left'));
    }
    // Right edge
    for (let y = 50; y < h - 50; y += minSpacing + Math.random() * 25) {
      if (Math.random() < 0.6) continue;
      this.spectators.push(new Spectator(w - margin + randRange(-4, 2), y, 'right'));
    }
  }

  update(dt) {
    // Fight intro — freeze fighters during staredown
    if (this.introPhase !== 'none' && this.introPhase !== 'done') {
      this.introTimer += dt;
      if (this.introTimer < 800) {
        this.introPhase = 'staredown';
      } else if (this.introTimer < 1600) {
        this.introPhase = 'names';
      } else if (this.introTimer < 2200) {
        if (this.introPhase !== 'go') {
          this.introPhase = 'go';
          SFX.bell();
        }
      } else {
        this.introPhase = 'done';
      }
      // During intro, only update camera and announcer
      this.announcer.update(dt);
      this.camera.update(dt);
      return;
    }

    // Fight outro — slow-mo + desaturate on KO
    if (this.outroActive) {
      this.outroTimer += dt;
    }

    // Slowmo effect
    let effectiveDt = dt;
    if (this.slowmo > 0) {
      effectiveDt = dt * 0.3;
      this.slowmo -= dt;
    }

    this.announcer.update(dt);

    // Phase 2: Decay screen flash
    if (this.hitFlashAlpha > 0) {
      this.hitFlashAlpha -= dt * 0.004;
      if (this.hitFlashAlpha < 0) this.hitFlashAlpha = 0;
    }

    // Update player input — allow movement even after game over (winner walks around)
    if (this.player && this.player.alive && this.player.state !== STATES.KO) {
      this._handlePlayerInput(effectiveDt);
    }

    // Update gangs (riot mode)
    for (const gang of this.gangs) {
      gang.update(effectiveDt, this.gangs, this.fighters);
    }

    // Phase 3: Riot phase tracking
    if (this.mode === 'riot' && !this.gameOver) {
      this.riotTimer += effectiveDt;
      const currentKOs = this.fighters.filter(f => !f.alive).length;

      if (currentKOs > this.totalKOs) {
        this.totalKOs = currentKOs;
      }

      // Phase transitions based on conditions
      switch (this.riotPhase) {
        case 'calm':
          if (this.gangs.some(g => g.state === GANG_STATES.ADVANCING || g.state === GANG_STATES.FIGHTING)) {
            this.riotPhase = 'tension';
          }
          break;
        case 'tension':
          if (this.gangs.filter(g => g.state === GANG_STATES.FIGHTING).length >= 2) {
            this.riotPhase = 'eruption';
            this.announcer.show('RIOT!', 'All yards are locked down!', 2000);
          }
          break;
        case 'eruption':
          if (this.totalKOs >= 3) {
            this.riotPhase = 'chaos';
          }
          break;
        case 'chaos':
          // Check for last standing gang
          const aliveGangs = this.gangs.filter(g => g.alive);
          if (aliveGangs.length <= 1) {
            this.riotPhase = 'aftermath';
            if (aliveGangs.length === 1) {
              this.lastStandingGang = aliveGangs[0];
              this.announcer.show(`${GANG_COLORS[aliveGangs[0].id].name} WINS`, 'The yard belongs to them', 3000);
            }
          }
          break;
      }
    }

    // Batch 2: Guard alarm — countdown during riot
    if (this.mode === 'riot' && !this.gameOver) {
      // Start alarm timer when riot erupts
      if (!this.guardAlarmActive && (this.riotPhase === 'eruption' || this.riotPhase === 'chaos')) {
        this.guardAlarmActive = true;
        this.guardAlarmTimer = 0;
      }
      if (this.guardAlarmActive && !this.guardRecallActive) {
        this.guardAlarmTimer += effectiveDt;
        const timeLeft = this.guardAlarmDuration - this.guardAlarmTimer;
        // Warning whistle at 10 seconds before
        if (timeLeft <= GUARD_WARNING_TIME && !this.guardWarningShown) {
          this.guardWarningShown = true;
          this.announcer.show('WHISTLE!', 'Guards incoming — 10 seconds!', 2000);
          SFX.whistle();
        }
        // Guard recall
        if (this.guardAlarmTimer >= this.guardAlarmDuration) {
          this.guardRecallActive = true;
          this.guardRecallTimer = 0;
          this.announcer.show('GET DOWN!', 'All yards recalled!', 3000);
          // Force all gangs into retreating
          for (const gang of this.gangs) {
            gang.state = GANG_STATES.RETREATING;
            gang.stateTimer = 0;
            // All fighters stop fighting, fear maxes out
            for (const m of gang.members) {
              if (m.alive) {
                m.fear = m.maxFear;
                m.broken = true;
              }
            }
          }
          this.riotPhase = 'aftermath';
        }
      }
      // Guard recall in progress — end game after fighters scatter
      if (this.guardRecallActive) {
        this.guardRecallTimer += effectiveDt;
        if (this.guardRecallTimer > 4000) {
          this.gameOver = true;
          this.announcer.show('YARD DOWN', 'R: Rematch · Q: Menu', 999999);
        }
      }
    }

    // Riot events — emergent situations
    if (this.mode === 'riot' && !this.gameOver && (this.riotPhase === 'eruption' || this.riotPhase === 'chaos')) {
      if (!this._riotEventTimer) this._riotEventTimer = 5000 + Math.random() * 8000;
      this._riotEventTimer -= effectiveDt;
      if (this._riotEventTimer <= 0) {
        this._riotEventTimer = 12000 + Math.random() * 15000;
        this._triggerRiotEvent();
      }
    }

    // Batch 2: Update spectators
    for (const spec of this.spectators) {
      spec.update(effectiveDt, this.fighters);
    }

    // Update AIs — custom/1v1/cell modes
    if (this.mode === '1v1' || this.mode === 'cell') {
      for (const ai of this.ais) {
        ai.update(effectiveDt, this.player);
      }
    } else if (this.mode === 'custom') {
      for (const ai of this.ais) {
        const f = ai.fighter;
        // Find nearest enemy (different gang)
        let nearest = null, nd = Infinity;
        for (const e of this.fighters) {
          if (e === f || e.gangId === f.gangId || !e.alive) continue;
          const d = dist(f, e);
          if (d < nd) { nd = d; nearest = e; }
        }
        ai.update(effectiveDt, nearest);
      }
    }

    // Update all fighters
    for (const f of this.fighters) {
      f.update(effectiveDt);
      // Clamp to world bounds
      f.x = clamp(f.x, 24, this.worldW - 24);
      f.y = clamp(f.y, 24, this.worldH - 24);
    }

    // Resolve collisions
    resolveFighterCollisions(this.fighters.filter(f => f.alive));

    // Fear submission check (1v1/cell only)
    if ((this.mode === '1v1' || this.mode === 'cell') && !this.gameOver) {
      for (const f of this.fighters) {
        if (!f.isPlayer && f.alive && f.broken && f.fear >= f.maxFear * 0.95) {
          if (!f._brokenTimer) f._brokenTimer = 0;
          f._brokenTimer += effectiveDt;
          if (f._brokenTimer > 2000) {
            this.gameOver = true;
            this.slowmo = 1500;
            this.announcer.show('BACKED DOWN', `${f.name} wants no more`, 999999);
          }
        } else if (f.isPlayer && f.alive && f.broken && f.fear >= f.maxFear * 0.95) {
          if (!f._brokenTimer) f._brokenTimer = 0;
          f._brokenTimer += effectiveDt;
          if (f._brokenTimer > 2000) {
            this.gameOver = true;
            this.slowmo = 1500;
            this.announcer.show('YOU BROKE', 'R: Rematch · Q: Menu', 999999);
          }
        } else {
          f._brokenTimer = 0;
        }
      }
    }

    // Process combat
    processCombat(this.fighters, this.fighters, this.particles, this.camera);

    // Update particles & damage numbers
    this.particles.update(effectiveDt);
    this.dmgNumbers.update(effectiveDt);

    // Update camera
    if (this.mode === 'custom' && this.customConfig && this.customConfig.arena === 'cell') {
      // Custom cell: tight zoom centered
      const mx = this.fighters.reduce((s, f) => s + f.x, 0) / this.fighters.length;
      const my = this.fighters.reduce((s, f) => s + f.y, 0) / this.fighters.length;
      this.camera.setTarget(mx, my);
      this.camera.zoom = lerp(this.camera.zoom, 2.2, 0.08);
    } else if (this.mode === '1v1' || this.mode === 'cell') {
      // Track midpoint, dynamically zoom to keep both fighters visible
      const f0 = this.fighters[0];
      const f1 = this.fighters[1];
      const mx = (f0.x + f1.x) / 2;
      const my = (f0.y + f1.y) / 2;
      this.camera.setTarget(mx, my);

      if (this.mode === 'cell') {
        // Cell: fixed tight zoom, no dynamic zoom-out
        const targetZoom = 2.2;
        this.camera.zoom = lerp(this.camera.zoom, targetZoom, 0.08);
      } else {
        // Dynamic zoom - zoom out when fighters are far apart
        const fd = Math.hypot(f0.x - f1.x, f0.y - f1.y);
        const margin = 120;
        const needW = fd + margin * 2;
        const needH = fd * 0.6 + margin * 2;
        const zoomW = CANVAS_W / Math.max(needW, 300);
        const zoomH = CANVAS_H / Math.max(needH, 200);
        const zMin = T('CAMERA_1V1_ZOOM_MIN', 0.8);
        const zMax = T('CAMERA_1V1_ZOOM_MAX', 1.8);
        const targetZoom = clamp(Math.min(zoomW, zoomH), zMin, zMax);
        this.camera.zoom = lerp(this.camera.zoom, targetZoom, 0.12);
      }
    } else if (this.player) {
      // Riot/yard mode — follow player with configurable zoom
      this.camera.setTarget(this.player.x, this.player.y);
      const riotZoom = T('CAMERA_RIOT_ZOOM', 1.0);
      this.camera.zoom = lerp(this.camera.zoom, riotZoom, 0.04);
    }
    this.camera.update(effectiveDt);

    // Check game over
    this._checkGameOver(dt);

    // Post-KO celebration — keep trying until winners transition to celebrate
    this._updateCelebration();

    // Batch 5: Fight narrative announcements
    this._updateAnnouncements(dt);
  }

  _updateAnnouncements(dt) {
    if (!this.player || !this.player.alive) return;
    const p = this.player;
    const opp = this.fighters.find(f => f !== p && f.alive && (!f.gangId || f.gangId !== p.gangId));
    if (!opp) return;

    // Track announcement cooldown to avoid spam
    if (!this._announceCooldown) this._announceCooldown = 0;
    this._announceCooldown -= dt;
    if (this._announceCooldown > 0) return;

    // "HE'S HURT!" when opponent drops below threshold — varied text
    if (opp.health < opp.maxHealth * 0.3 && opp.health > 0 && !this._announcedHurt) {
      const hurtLines = ["HE'S HURT!", "WOBBLING!", "HE FELT THAT!", "ROCKED HIM!"];
      const sub = opp.health < opp.maxHealth * 0.15 ? 'About to go...' : '';
      this.announcer.show(randItem(hurtLines), sub, 900);
      this._announcedHurt = true;
      this._announceCooldown = 2000;
      return;
    }
    if (opp.health >= opp.maxHealth * 0.3) this._announcedHurt = false;

    // Player hurt too
    if (p.health < p.maxHealth * 0.25 && p.health > 0 && !this._announcedPlayerHurt) {
      const lines = ['STAY UP!', 'DIG DEEP!', 'SURVIVE!'];
      this.announcer.show(randItem(lines), '', 800);
      this._announcedPlayerHurt = true;
      this._announceCooldown = 3000;
      return;
    }
    if (p.health >= p.maxHealth * 0.25) this._announcedPlayerHurt = false;

    // "ON FIRE!" when player maxes heat
    if (p.heat >= 90 && !this._announcedFire) {
      const fireLines = ['ON FIRE!', 'UNLEASHED!', 'NO MERCY!'];
      this.announcer.show(randItem(fireLines), '', 800);
      this._announcedFire = true;
      this._announceCooldown = 3000;
      return;
    }
    if (p.heat < 50) this._announcedFire = false;

    // Big combo
    if (p.comboCount >= 4 && !this._announcedCombo) {
      const comboLines = ['COMBINATION!', 'LAYING IT ON!', 'FLURRY!'];
      this.announcer.show(randItem(comboLines), `${p.comboCount} hits!`, 800);
      this._announcedCombo = true;
      this._announceCooldown = 2500;
      return;
    }
    if (p.comboCount < 2) this._announcedCombo = false;

    // "BACKED HIM UP!" on corner pressure
    if (opp.alive && !this._announcedCorner) {
      const arenaW = this.mode === 'cell' ? YARD_CELL_W : this.worldW;
      const arenaH = this.mode === 'cell' ? YARD_CELL_H : this.worldH;
      const edgeDist = Math.min(opp.x, arenaW - opp.x, opp.y, arenaH - opp.y);
      if (edgeDist < 40) {
        const cornerLines = ['BACKED UP!', 'NOWHERE TO GO!', 'TRAPPED!'];
        this.announcer.show(randItem(cornerLines), '', 700);
        this._announcedCorner = true;
        this._announceCooldown = 3000;
        return;
      }
    }
    if (this._announcedCorner) {
      const arenaW = this.mode === 'cell' ? YARD_CELL_W : this.worldW;
      const arenaH = this.mode === 'cell' ? YARD_CELL_H : this.worldH;
      const edgeDist = Math.min(opp.x, arenaW - opp.x, opp.y, arenaH - opp.y);
      if (edgeDist > 80) this._announcedCorner = false;
    }

    // Guard break aftermath
    if (opp.isStaggered && !this._announcedStagger) {
      this.announcer.show('DAZED!', 'Open him up!', 700);
      this._announcedStagger = true;
      this._announceCooldown = 2000;
      return;
    }
    if (!opp.isStaggered) this._announcedStagger = false;

    // Riot-specific: gang narrative
    if (this.mode === 'riot' && this.riotPhase === 'chaos') {
      if (!this._riotNarrativeTimer) this._riotNarrativeTimer = 0;
      this._riotNarrativeTimer -= dt;
      if (this._riotNarrativeTimer <= 0) {
        this._riotNarrativeTimer = 8000 + Math.random() * 5000;
        // Find the weakest and strongest gangs
        const aliveGangs = this.gangs.filter(g => g.alive);
        if (aliveGangs.length >= 2) {
          const sorted = [...aliveGangs].sort((a, b) => b.morale - a.morale);
          const strong = sorted[0];
          const weak = sorted[sorted.length - 1];
          const strongName = GANG_COLORS[strong.id].name;
          const weakName = GANG_COLORS[weak.id].name;
          const riotLines = [
            [`${strongName} dominating`, `${weakName} falling back`],
            [`${weakName} losing ground`, ''],
            ['Blood on the concrete', ''],
            ['No guards in sight', ''],
            [`${strongName} pressing hard`, ''],
          ];
          const line = randItem(riotLines);
          this.announcer.show(line[0], line[1], 1500);
          this._announceCooldown = 4000;
        }
      }
    }
  }

  _triggerRiotEvent() {
    const aliveGangs = this.gangs.filter(g => g.alive);
    if (aliveGangs.length < 2) return;
    const aliveFighters = this.fighters.filter(f => f.alive && !f.isPlayer);
    if (aliveFighters.length < 4) return;

    const roll = Math.random();

    if (roll < 0.2) {
      // BEEF — two random fighters from different gangs get personal
      const f1 = randItem(aliveFighters);
      const f2 = aliveFighters.find(f => f.gangId !== f1.gangId && f.alive);
      if (f1 && f2) {
        // Both get aggressive boost + focus each other
        f1.traits.aggression = Math.min(1, f1.traits.aggression + 0.3);
        f2.traits.aggression = Math.min(1, f2.traits.aggression + 0.3);
        f1.fear = Math.max(0, f1.fear - 30);
        f2.fear = Math.max(0, f2.fear - 30);
        f1.target = f2;
        f2.target = f1;
        this.announcer.show('OLD BEEF!', `${f1.name} and ${f2.name} have history`, 2000);
      }
    } else if (roll < 0.35) {
      // SECOND WIND — a hurt fighter gets a surge of adrenaline
      const hurt = aliveFighters.filter(f => f.health < f.maxHealth * 0.4 && f.health > 0);
      if (hurt.length > 0) {
        const f = randItem(hurt);
        f.health = Math.min(f.maxHealth, f.health + f.maxHealth * 0.15);
        f.fear = Math.max(0, f.fear - 40);
        f.heat = Math.min(HEAT_MAX, f.heat + 50);
        f.wobbleTimer = 0;
        this.announcer.show('SECOND WIND!', `${f.name} finds something extra`, 1800);
        SFX.crowdRoar(0.6);
      }
    } else if (roll < 0.5) {
      // GANG RALLY — weakest gang gets a morale boost
      const weakest = [...aliveGangs].sort((a, b) => a.morale - b.morale)[0];
      weakest.morale = Math.min(100, weakest.morale + 25);
      for (const m of weakest.members) {
        if (m.alive) {
          m.fear = Math.max(0, m.fear - 20);
        }
      }
      const name = GANG_COLORS[weakest.id].name;
      const rallyLines = [
        [`${name} rally!`, 'They\'re not done yet'],
        [`${name} regroup!`, 'Finding their nerve'],
        [`${name} dig in!`, 'Pride on the line'],
      ];
      const line = randItem(rallyLines);
      this.announcer.show(line[0], line[1], 1800);
      SFX.crowdRoar(0.4);
    } else if (roll < 0.65) {
      // BERSERKER — one fighter goes wild, ignores defense
      const f = randItem(aliveFighters);
      f.traits.aggression = 1;
      f.traits.toughness = Math.min(1, f.traits.toughness + 0.2);
      f.fear = 0;
      f.heat = HEAT_MAX;
      f.personality = 'brawler';
      this.announcer.show('SNAPPED!', `${f.name} has lost it`, 1800);
    } else if (roll < 0.8) {
      // TARGETED — strongest fighter becomes everyone's priority
      let strongest = null, mostDmg = 0;
      for (const f of aliveFighters) {
        if (f.damageDealt > mostDmg) { mostDmg = f.damageDealt; strongest = f; }
      }
      if (strongest) {
        // Nearby enemies focus this fighter
        for (const f of aliveFighters) {
          if (f.gangId !== strongest.gangId && dist(f, strongest) < 200) {
            f.target = strongest;
          }
        }
        this.announcer.show('MARKED MAN!', `Everyone wants ${strongest.name}`, 1800);
      }
    } else {
      // TENSION SPIKE — brief fear surge across the yard
      for (const f of aliveFighters) {
        f.fear = Math.min(f.maxFear, f.fear + 10 + Math.random() * 15);
      }
      const lines = [
        ['TENSION SPIKES!', 'Someone screams'],
        ['PANIC SPREADS!', 'The yard feels it'],
        ['NERVES FRAYING!', 'Who breaks first?'],
      ];
      this.announcer.show(...randItem(lines), 1500);
    }
  }

  _handlePlayerInput(dt) {
    const p = this.player;
    if (!p || !p.alive) return;

    // Batch 1: Knockdown — mash any key to get up
    if (p.state === STATES.KNOCKDOWN && p.isDown) {
      if (input.wasPressed('KeyJ') || input.wasPressed('KeyK') ||
          input.wasPressed('KeyW') || input.wasPressed('KeyA') ||
          input.wasPressed('KeyS') || input.wasPressed('KeyD')) {
        p.attemptGetUp();
      }
      return; // can't do anything else while down
    }

    // Batch 1: Get-up animation — wait
    if (p.state === STATES.GETUP) return;

    // Batch 1: Clinch controls
    if (p.inClinch) {
      if (input.wasPressed('KeyJ')) {
        p.clinchGutShot(); // J = gut shot
      }
      if (input.wasPressed('KeyK')) {
        p.clinchShove(); // K = shove away
      }
      if (input.wasPressed('KeyL') || input.wasPressed('KeyA') || input.wasPressed('KeyD')) {
        if (p.stamina >= CLINCH_BREAK_STAMINA) {
          p.stamina -= CLINCH_BREAK_STAMINA;
          p.breakClinch(); // L/A/D = break away
        }
      }
      return; // can't move while in clinch
    }

    // Movement
    let mx = 0, my = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) my = -1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) my = 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx = -1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx = 1;

    // Block
    if (input.isDown('KeyL')) {
      p.block();
    } else if (p.state === STATES.BLOCK) {
      p.unblock();
    }

    // Attacks — with input buffer for responsive feel
    if (input.wasPressed('KeyJ')) {
      if (p.canAttack) {
        p.jab();
      } else {
        p.inputBuffer = 'jab';
        p.inputBufferTimer = INPUT_BUFFER_WINDOW;
        p.failedInputTimer = FAILED_INPUT_FLASH; // Batch 5: visual feedback
      }
    }
    if (input.wasPressed('KeyK')) {
      if (p.canAttack) {
        p.hook();
      } else {
        p.inputBuffer = 'hook';
        p.inputBufferTimer = INPUT_BUFFER_WINDOW;
        p.failedInputTimer = FAILED_INPUT_FLASH;
      }
    }
    if (input.wasPressed('KeyH') || input.wasPressed('Space')) {
      if (p.canAttack) {
        p.shove();
      } else {
        p.inputBuffer = 'shove';
        p.inputBufferTimer = INPUT_BUFFER_WINDOW;
        p.failedInputTimer = FAILED_INPUT_FLASH;
      }
    }

    // Batch 4: Slip/duck — tap S while not holding W/A/D
    // Batch 5: Slip direction = last movement direction (or lateral to target)
    if (input.wasPressed('KeyS') && !input.isDown('KeyW') && !input.isDown('KeyA') && !input.isDown('KeyD') &&
        !input.isDown('ArrowUp') && !input.isDown('ArrowLeft') && !input.isDown('ArrowRight')) {
      if ((p.state === STATES.IDLE || p.state === STATES.WALK) && p.slipCooldown <= 0) {
        // Use last velocity as slip direction, or default lateral
        const slipX = Math.abs(p.vx) > 0.1 ? p.vx : 0;
        const slipY = Math.abs(p.vy) > 0.1 ? p.vy : 0;
        p.slip(slipX, slipY);
        my = 0;
      }
    }

    // Taunt/celebrate — T key while idle or walking
    if (input.wasPressed('KeyT') && (p.state === STATES.IDLE || p.state === STATES.WALK) &&
        p.charDef.celebrate && p.charDef.celebrateFrames > 0) {
      p.setState(STATES.CELEBRATE);
    }

    // Cancel taunt on movement or attack (let the player bail out)
    if (p.state === STATES.CELEBRATE && (mx !== 0 || my !== 0 ||
        input.wasPressed('KeyJ') || input.wasPressed('KeyK'))) {
      p.setState(STATES.IDLE);
    }

    // Movement while blocking (slow)
    if (p.state === STATES.BLOCK && (mx !== 0 || my !== 0)) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
      p.vx = mx * p.moveSpeed * 0.35;
      p.vy = my * p.moveSpeed * 0.35;
    }

    // Movement (allow during recovery at reduced speed)
    if (p.canMove && p.state !== STATES.BLOCK) {
      if (mx !== 0 || my !== 0) {
        // Normalize diagonal
        const len = Math.hypot(mx, my);
        mx /= len; my /= len;
        let spdMult = p.stamina < LOW_STAMINA_THRESHOLD ? LOW_STAMINA_SPEED_MULT : 1;
        // Phase 4: Injuries slow you down
        spdMult *= (1 - p.injuries * 0.002);
        spdMult *= p.recoveryMoveSpeed; // recovery drift
        p.vx = mx * p.moveSpeed * spdMult;
        p.vy = my * p.moveSpeed * spdMult;
        if (p.state !== STATES.WALK && p.recoveryCooldown <= 0) p.setState(STATES.WALK);
        if (mx !== 0) p.facing = mx > 0 ? 1 : -1;
      } else {
        if (p.state === STATES.WALK) p.setState(STATES.IDLE);
      }
    }

    // In 1v1/cell, always face opponent
    if ((this.mode === '1v1' || this.mode === 'cell') && this.fighters.length > 1) {
      const opp = this.fighters.find(f => f !== p && f.alive);
      if (opp) {
        p.target = opp;
        if (p.state !== STATES.JAB && p.state !== STATES.HOOK && p.state !== STATES.SHOVE) {
          p.faceTarget();
        }
      }
    } else if (this.mode === 'riot' || this.mode === 'custom') {
      // Face nearest enemy
      let nearest = null, nd = Infinity;
      for (const f of this.fighters) {
        if (f === p || f.gangId === p.gangId || !f.alive) continue;
        const d = dist(p, f);
        if (d < nd) { nd = d; nearest = f; }
      }
      if (nearest && nd < 120) {
        p.target = nearest;
        if (p.state !== STATES.JAB && p.state !== STATES.HOOK && p.state !== STATES.SHOVE) {
          p.faceTarget();
        }
      }

      // Batch 1: Sucker punch — player can trigger riot early
      const playerGang = this.gangs.find(g => g.id === this.playerGang);
      if (playerGang && (playerGang.state === GANG_STATES.MILLING || playerGang.state === GANG_STATES.TENSING)) {
        if ((input.wasPressed('KeyJ') || input.wasPressed('KeyK')) && nearest && nd < 70) {
          // Sucker punch! Trigger the riot
          this.announcer.show('SUCKER PUNCH!', `${p.name} starts it off!`, 1800);
          // Force all gangs into fighting immediately
          for (const gang of this.gangs) {
            gang.state = GANG_STATES.FIGHTING;
            gang.stateTimer = 0;
            gang.tensionTimer = 99999; // skip tension phase
          }
          this.riotPhase = 'eruption';
          // The punch itself
          p.faceTarget();
          if (input.wasPressed('KeyK')) { p.hook(); } else { p.jab(); }
        }
      }
    }
  }

  _triggerCelebration() {
    // Mark that celebration should happen — checked each frame until fighters are ready
    this._celebrationPending = true;
  }

  _updateCelebration() {
    if (!this._celebrationPending || !this.gameOver) return;
    let allDone = true;
    for (const f of this.fighters) {
      if (!f.alive || f.state === STATES.KO || f.state === STATES.KNOCKDOWN) continue;
      if (f.state === STATES.CELEBRATE) continue;
      // No celebrate art — skip, don't block others
      if (!f.charDef.celebrate || f.charDef.celebrateFrames <= 0) continue;
      if (f.isPlayer) continue; // let player celebrate manually via T key
      if (f.state === STATES.IDLE || f.state === STATES.WALK) {
        f.setState(STATES.CELEBRATE);
      } else {
        allDone = false; // still waiting for this fighter to finish their action
      }
    }
    if (allDone) this._celebrationPending = false;
  }

  _checkGameOver(dt) {
    if (this.gameOver) {
      this.gameOverTimer += dt;
      return;
    }

    if (this.mode === '1v1' || this.mode === 'cell') {
      const deadFighter = this.fighters.find(f => f.state === STATES.KO && !f.alive);
      if (deadFighter) {
        this.gameOver = true;
        this.slowmo = 1500;
        this.outroActive = true;
        this.outroTimer = 0;
        const winner = deadFighter === this.player ? 'DEFEAT' : 'KNOCKOUT';
        if (!this.announcer.text || this.announcer.life <= 0) {
          this.announcer.show(winner, 'R: Rematch · Q: Menu', 999999);
        }
        this._triggerCelebration();
      }
    } else if (this.mode === 'custom') {
      // Custom: player KO = loss, all enemies dead = win
      if (this.player && this.player.state === STATES.KO) {
        this.gameOver = true;
        this.slowmo = 1500;
        this.outroActive = true;
        this.outroTimer = 0;
        this.announcer.show('LIGHTS OUT', 'R: Rematch · Q: Menu', 999999);
      } else {
        const enemiesAlive = this.fighters.filter(f => f.gangId !== this.playerGang && f.alive);
        const alliesAlive = this.fighters.filter(f => f.gangId === this.playerGang && f.alive);
        if (enemiesAlive.length === 0 && alliesAlive.length > 0) {
          this.gameOver = true;
          this.slowmo = 1500;
          this.outroActive = true;
          this.outroTimer = 0;
          const survived = alliesAlive.length;
          this.announcer.show('CLEARED', `${survived} standing · R: Rematch · Q: Menu`, 999999);
          this._triggerCelebration();
        } else if (alliesAlive.length === 0) {
          this.gameOver = true;
          this.slowmo = 1500;
          this.outroActive = true;
          this.outroTimer = 0;
          this.announcer.show('WIPED OUT', 'R: Rematch · Q: Menu', 999999);
        }
      }
    } else {
      // Riot ends when only one gang standing or player KO'd
      if (this.player && this.player.state === STATES.KO) {
        this.gameOver = true;
        this.slowmo = 1500;
        this.outroActive = true;
        this.outroTimer = 0;
        this.announcer.show('LIGHTS OUT', 'R: Rematch · Q: Menu', 999999);
      } else {
        const aliveGangs = this.gangs.filter(g => g.alive);
        if (aliveGangs.length <= 1) {
          this.gameOver = true;
          this.slowmo = 1500;
          this.outroActive = true;
          this.outroTimer = 0;
          const winner = aliveGangs[0];
          const isPlayerGang = winner && winner.id === this.playerGang;
          this.announcer.show(
            isPlayerGang ? 'YARD CLEARED' : 'DEFEAT',
            'R: Rematch · Q: Menu',
            999999
          );
        }
      }
    }
  }

  draw(ctx) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background
    ctx.fillStyle = '#1a1a15';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    this.camera.apply(ctx);

    // Yard (procedural)
    this.yard.draw(ctx);

    // Split fighters: dead on ground layer, alive sorted by Y on top
    const dead = this.fighters.filter(f => f.state === STATES.KO);
    const alive = this.fighters.filter(f => f.state !== STATES.KO).sort((a, b) => a.y - b.y);
    const sorted = [...dead, ...alive]; // dead drawn first (underneath)

    // Batch 5: Persistent blood stains (under everything)
    for (const stain of this.bloodStains) {
      ctx.globalAlpha = stain.alpha;
      ctx.fillStyle = stain.color;
      ctx.beginPath();
      ctx.ellipse(Math.floor(stain.x), Math.floor(stain.y), stain.size, stain.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ground particles (blood pools, blood trails)
    for (const p of this.particles.particles) {
      if (p.life > 5000) p.draw(ctx, { x: 0, y: 0, zoom: 1 });
    }

    // KO'd fighters — drawn on the ground, under living fighters
    for (const f of dead) {
      f.draw(ctx, this.camera);
    }

    // Batch 2: Spectators behind fighters (top/left edge — lower Y)
    for (const spec of this.spectators) {
      if (spec.edge === 'top' || spec.edge === 'left') {
        spec.draw(ctx);
      }
    }

    // Draw living fighters (Y-sorted)
    for (const f of alive) {
      f.draw(ctx, this.camera);
    }

    // Health bars (world space) — alive fighters only
    for (const f of alive) {
      f.drawHealthBar(ctx, this.camera);
    }

    // Airborne particles
    for (const p of this.particles.particles) {
      if (p.life <= 5000) p.draw(ctx, { x: 0, y: 0, zoom: 1 });
    }

    // Batch 2: Spectators in front of fighters (bottom/right edge — higher Y)
    for (const spec of this.spectators) {
      if (spec.edge === 'bottom' || spec.edge === 'right') {
        spec.draw(ctx);
      }
    }

    // Phase 4: Floating damage numbers (world space)
    this.dmgNumbers.draw(ctx);

    // Fence overlay (razor wire in front of fighters)
    this.yard.drawOverlay(ctx);

    this.camera.restore(ctx);

    // Phase 2: Screen flash on big hits
    if (this.hitFlashAlpha > 0) {
      ctx.globalAlpha = this.hitFlashAlpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = 1;
    }

    // HUD (screen space)
    drawHUD(ctx, this.mode);

    // Announcements
    this.announcer.draw(ctx);

    // Vignette overlay — pulses red when player is in danger
    const vgrad = ctx.createRadialGradient(CANVAS_W/2, CANVAS_H/2, CANVAS_W * 0.3, CANVAS_W/2, CANVAS_H/2, CANVAS_W * 0.7);
    let vignetteColor = 'rgba(0,0,0,0.5)';
    if (this.player && this.player.alive && this.player.health < this.player.maxHealth * DANGER_HEALTH_THRESHOLD) {
      const dangerT = 1 - (this.player.health / (this.player.maxHealth * DANGER_HEALTH_THRESHOLD));
      const pulse = 0.5 + Math.sin(Date.now() * DANGER_PULSE_SPEED) * 0.5;
      const r = Math.floor(80 + dangerT * 80);
      vignetteColor = `rgba(${r},0,0,${0.4 + dangerT * 0.25 * pulse})`;
    }
    vgrad.addColorStop(0, 'rgba(0,0,0,0)');
    vgrad.addColorStop(1, vignetteColor);
    ctx.fillStyle = vgrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Scanline effect (subtle)
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let y = 0; y < CANVAS_H; y += 3) {
      ctx.fillRect(0, y, CANVAS_W, 1);
    }

    // Fight intro overlay
    if (this.introPhase !== 'none' && this.introPhase !== 'done') {
      this._drawIntro(ctx);
    }

    // KO desaturation — screen goes grey on player KO
    if (this.outroActive && this.player && !this.player.alive) {
      const desatT = clamp(this.outroTimer / 1500, 0, 0.45);
      ctx.globalAlpha = desatT;
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = 1;
    }

    // Phase 4: Stats screen on game over
    if (this.gameOver && this.gameOverTimer > 2500) {
      const fadeIn = clamp((this.gameOverTimer - 2500) / 800, 0, 1);
      ctx.globalAlpha = fadeIn * 0.75;
      ctx.fillStyle = '#0a0805';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = fadeIn;

      if (this.mode === '1v1' || this.mode === 'cell') {
        this._drawStats1v1(ctx);
      } else if (this.mode === 'custom') {
        this._drawStatsCustom(ctx);
      } else {
        this._drawStatsRiot(ctx);
      }
      ctx.globalAlpha = 1;
    }
  }

  _drawIntro(ctx) {
    const p = this.player;
    const e = this.fighters.find(f => f !== p);
    if (!p || !e) return;

    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;

    // Cinematic bars (top + bottom)
    const barH = 60;
    const slideIn = clamp(this.introTimer / 400, 0, 1);
    ctx.fillStyle = '#0a0805';
    ctx.fillRect(0, 0, CANVAS_W, barH * slideIn);
    ctx.fillRect(0, CANVAS_H - barH * slideIn, CANVAS_W, barH * slideIn);

    // Phase: staredown — just the cinematic bars and a dim overlay
    if (this.introPhase === 'staredown') {
      const fadeIn = clamp(this.introTimer / 600, 0, 0.3);
      ctx.globalAlpha = fadeIn;
      ctx.fillStyle = '#0a0805';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = 1;
    }

    // Phase: names — fighter cards slide in from sides with sprites
    if (this.introPhase === 'names' || this.introPhase === 'go') {
      const nameT = clamp((this.introTimer - 800) / 400, 0, 1);
      const easeOut = 1 - Math.pow(1 - nameT, 3);
      const fw = SM().FRAME_W, fh = SM().FRAME_H, sc = SM().SCALE;
      const spriteScale = sc * 1.2; // slightly bigger than in-game for dramatic effect

      // Player card (left side)
      const pSlideX = -300 + easeOut * 300;
      const pGC = GANG_COLORS[p.gangId];
      ctx.save();
      ctx.translate(pSlideX, 0);
      // Name block — wider to accommodate sprite
      ctx.fillStyle = 'rgba(10,8,5,0.88)';
      ctx.fillRect(20, cy - 45, 320, 70);
      ctx.fillStyle = pGC ? pGC.primary : '#c4943a';
      ctx.fillRect(20, cy - 45, 4, 70);
      // Player sprite — idle frame 0, facing right (toward opponent)
      const pSheet = assets[p.charDef.idle] || assets[p.charDef.walk];
      if (pSheet) {
        const sprW = fw * spriteScale, sprH = fh * spriteScale;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(pSheet, 0, 0, fw, fh,
          34, cy - sprH / 2, sprW, sprH);
      }
      // Text offset to right of sprite
      const pTextX = 34 + fw * spriteScale + 10;
      ctx.fillStyle = '#c4943a';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(p.name || 'PLAYER', pTextX, cy - 12);
      ctx.fillStyle = pGC ? pGC.light : '#8a7a5a';
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillText(`${pGC ? pGC.name : ''} · ${p.personality.toUpperCase()}`, pTextX, cy + 6);
      ctx.restore();

      // Enemy card (right side)
      const eSlideX = 300 - easeOut * 300;
      const eGC = GANG_COLORS[e.gangId];
      ctx.save();
      ctx.translate(eSlideX, 0);
      ctx.fillStyle = 'rgba(10,8,5,0.88)';
      ctx.fillRect(CANVAS_W - 340, cy - 45, 320, 70);
      ctx.fillStyle = eGC ? eGC.primary : '#cc4422';
      ctx.fillRect(CANVAS_W - 24, cy - 45, 4, 70);
      // Enemy sprite — idle frame 0, facing left (toward player) — flip horizontally
      const eSheet = assets[e.charDef.idle] || assets[e.charDef.walk];
      if (eSheet) {
        const sprW = fw * spriteScale, sprH = fh * spriteScale;
        ctx.imageSmoothingEnabled = false;
        ctx.save();
        ctx.translate(CANVAS_W - 34, cy);
        ctx.scale(-1, 1); // mirror to face left
        ctx.drawImage(eSheet, 0, 0, fw, fh,
          0, -sprH / 2, sprW, sprH);
        ctx.restore();
      }
      // Text offset to left of sprite
      const eTextX = CANVAS_W - 34 - fw * spriteScale - 10;
      ctx.fillStyle = '#c4943a';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(e.name || 'OPPONENT', eTextX, cy - 12);
      ctx.fillStyle = eGC ? eGC.light : '#8a7a5a';
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillText(`${eGC ? eGC.name : ''} · ${e.personality.toUpperCase()}`, eTextX, cy + 6);
      ctx.restore();

      // VS
      ctx.globalAlpha = nameT;
      ctx.fillStyle = '#5a4a3a';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('VS', cx, cy - 8);
      ctx.globalAlpha = 1;
    }

    // Phase: GO!
    if (this.introPhase === 'go') {
      const goT = clamp((this.introTimer - 1600) / 300, 0, 1);
      const goScale = 1 + (1 - goT) * 0.5;
      ctx.save();
      ctx.translate(cx, cy + 40);
      ctx.scale(goScale, goScale);
      ctx.globalAlpha = goT > 0.8 ? 1 - (goT - 0.8) * 5 : 1;
      ctx.fillStyle = '#c4943a';
      ctx.font = '28px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.mode === 'cell' ? 'CELL WAR' : 'FIGHT', 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  _drawStats1v1(ctx) {
    const p = this.fighters[0]; // player
    const e = this.fighters[1]; // enemy
    const playerWon = p && p.alive && p.state !== STATES.KO;

    const cx = CANVAS_W / 2;
    const panelW = 340;
    const panelH = 280;
    const panelX = cx - panelW / 2;
    const panelY = 90;

    // Panel background
    ctx.fillStyle = 'rgba(10, 8, 5, 0.85)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
    // Inner border
    ctx.strokeStyle = '#2a1a0a';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 4, panelY + 4, panelW - 8, panelH - 8);

    let y = panelY + 30;

    // Winner sprite — animated celebrate/idle loop in the panel
    const winner = playerWon ? p : e;
    const wSheet = assets[winner.charDef.celebrate] || assets[winner.charDef.idle] || assets[winner.charDef.walk];
    if (wSheet) {
      const fw = SM().FRAME_W, fh = SM().FRAME_H, sc = SM().SCALE;
      const sprScale = sc * 1.4;
      const sprW = fw * sprScale, sprH = fh * sprScale;
      // Animate the sprite
      const wFrameCount = winner.charDef.celebrateFrames || winner.charDef.idleFrames || winner.charDef.walkFrames || 4;
      const wFrame = Math.floor((this.gameOverTimer / 150) % wFrameCount);
      ctx.imageSmoothingEnabled = false;
      // Draw centered above the title
      ctx.drawImage(wSheet, wFrame * fw, 0, fw, fh,
        cx - sprW / 2, y - sprH + 5, sprW, sprH);
      y += 8;
    }

    // Result title
    ctx.fillStyle = playerWon ? '#c4943a' : '#aa3333';
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(playerWon ? 'VICTORY' : 'DEFEAT', cx, y);
    y += 35;

    // Divider line
    ctx.strokeStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.moveTo(panelX + 20, y);
    ctx.lineTo(panelX + panelW - 20, y);
    ctx.stroke();
    y += 18;

    // Column headers
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = playerWon ? '#c4943a' : '#aa6644';
    ctx.textAlign = 'right';
    ctx.fillText(p.name, cx - 30, y);
    ctx.fillStyle = !playerWon ? '#c4943a' : '#aa6644';
    ctx.textAlign = 'left';
    ctx.fillText(e.name, cx + 30, y);
    y += 22;

    // Stats rows
    const stats = [
      ['HITS LANDED', p.hitsLanded, e.hitsLanded],
      ['HITS TAKEN', p.hitsTaken, e.hitsTaken],
      ['DAMAGE DEALT', Math.round(p.damageDealt), Math.round(e.damageDealt)],
      ['KNOCKDOWNS', p.knockdownCount, e.knockdownCount],
      ['INJURY LEVEL', Math.round(p.injuries) + '%', Math.round(e.injuries) + '%'],
      ['MAX COMBO', p.comboCount || 0, e.comboCount || 0],
    ];

    ctx.font = '6px "Press Start 2P", monospace';
    for (const [label, pVal, eVal] of stats) {
      // Highlight the winner of each stat
      const pNum = parseInt(pVal) || 0;
      const eNum = parseInt(eVal) || 0;
      const isLowerBetter = label === 'HITS TAKEN' || label === 'INJURY LEVEL';
      const pWins = isLowerBetter ? pNum < eNum : pNum > eNum;
      const eWins = isLowerBetter ? eNum < pNum : eNum > pNum;

      ctx.fillStyle = '#5a4a3a';
      ctx.textAlign = 'center';
      ctx.fillText(label, cx, y);

      ctx.fillStyle = pWins ? '#c4943a' : '#6a5a4a';
      ctx.textAlign = 'right';
      ctx.fillText(String(pVal), cx - 40, y);
      ctx.fillStyle = eWins ? '#c4943a' : '#6a5a4a';
      ctx.textAlign = 'left';
      ctx.fillText(String(eVal), cx + 40, y);
      y += 18;
    }

    y += 12;
    ctx.fillStyle = '#5a4a3a';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('R: REMATCH    Q: MENU', cx, y);
  }

  _drawStatsCustom(ctx) {
    const cx = CANVAS_W / 2;
    let y = 100;

    ctx.fillStyle = '#c4943a';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FIGHT RESULTS', cx, y);
    y += 35;

    // Group fighters by gang
    const gangGroups = {};
    for (const f of this.fighters) {
      if (!gangGroups[f.gangId]) gangGroups[f.gangId] = [];
      gangGroups[f.gangId].push(f);
    }

    ctx.font = '6px "Press Start 2P", monospace';
    for (const gangId of Object.keys(gangGroups)) {
      const gc = GANG_COLORS[gangId];
      const members = gangGroups[gangId];
      const alive = members.filter(m => m.alive).length;
      const isPlayer = gangId === this.playerGang;

      ctx.fillStyle = gc.primary;
      ctx.textAlign = 'left';
      ctx.fillText(`${isPlayer ? '▶ ' : ''}${gc.name}`, cx - 180, y);
      ctx.fillStyle = alive > 0 ? '#6a8a4a' : '#aa4422';
      ctx.fillText(`${alive}/${members.length} standing`, cx - 40, y);

      const totalHits = members.reduce((s, m) => s + m.hitsLanded, 0);
      const totalDmg = Math.round(members.reduce((s, m) => s + m.damageDealt, 0));
      ctx.fillStyle = '#8a7a5a';
      ctx.fillText(`${totalHits} hits · ${totalDmg} dmg`, cx + 60, y);
      y += 16;
    }

    y += 15;

    // Player personal stats
    if (this.player) {
      const p = this.player;
      ctx.fillStyle = '#c4943a';
      ctx.textAlign = 'center';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText(`YOUR STATS — ${p.name}`, cx, y);
      y += 18;

      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillStyle = '#8a7a5a';
      ctx.fillText(`HITS: ${p.hitsLanded}  DMG: ${Math.round(p.damageDealt)}  KOs: ${p.knockdowns}  INJURY: ${Math.round(p.injuries)}%`, cx, y);
      y += 14;
      ctx.fillStyle = '#5a4a3a';
      ctx.fillText(`STYLE: ${p.personality.toUpperCase()}`, cx, y);
    }

    y += 20;
    ctx.fillStyle = '#5a4a3a';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('R: REMATCH    Q: MENU', cx, y);
  }

  _drawStatsRiot(ctx) {
    const cx = CANVAS_W / 2;
    let y = 90;

    ctx.fillStyle = '#c4943a';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RIOT REPORT', cx, y);
    y += 35;

    // Gang results table
    ctx.font = '6px "Press Start 2P", monospace';

    // Headers
    ctx.fillStyle = '#8a7a5a';
    const cols = [cx - 160, cx - 60, cx, cx + 60, cx + 120];
    ctx.textAlign = 'left';
    ctx.fillText('GANG', cols[0], y);
    ctx.fillText('STATUS', cols[1], y);
    ctx.fillText('KOs', cols[2], y);
    ctx.fillText('KILLS', cols[3], y);
    ctx.fillText('MORALE', cols[4], y);
    y += 16;

    // Draw separator
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(cols[0], y - 4, 340, 1);
    y += 4;

    for (const gang of this.gangs) {
      const gc = GANG_COLORS[gang.id];
      ctx.fillStyle = gc.primary;
      ctx.textAlign = 'left';
      ctx.fillText(gc.name, cols[0], y);

      ctx.fillStyle = gang.alive ? '#6a8a4a' : '#aa4422';
      const status = gang.alive ? `${gang.aliveCount}/${gang.members.length}` : 'WIPED';
      ctx.fillText(status, cols[1], y);

      ctx.fillStyle = '#c4943a';
      ctx.fillText(String(gang.koCount), cols[2], y);

      // Count KOs this gang inflicted
      const kills = gang.members.reduce((s, m) => s + m.knockdowns, 0);
      ctx.fillText(String(kills), cols[3], y);

      ctx.fillStyle = gang.morale > 50 ? '#6a8a4a' : '#aa6622';
      ctx.fillText(Math.round(gang.morale) + '%', cols[4], y);
      y += 16;
    }

    y += 15;

    // Player stats
    if (this.player) {
      const p = this.player;
      ctx.fillStyle = '#c4943a';
      ctx.textAlign = 'center';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText(`YOUR STATS — ${p.name}`, cx, y);
      y += 20;

      ctx.font = '6px "Press Start 2P", monospace';
      const pStats = [
        `HITS: ${p.hitsLanded}`,
        `DMG: ${Math.round(p.damageDealt)}`,
        `KOs: ${p.knockdowns}`,
        `INJURY: ${Math.round(p.injuries)}%`
      ];
      ctx.fillStyle = '#8a7a5a';
      ctx.fillText(pStats.join('   •   '), cx, y);
      y += 15;

      // Personality
      ctx.fillStyle = '#5a4a3a';
      ctx.fillText(`STYLE: ${p.personality.toUpperCase()}`, cx, y);
    }

    y += 20;
    ctx.fillStyle = '#5a4a3a';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('R: REMATCH    Q: MENU', cx, y);
  }
}
