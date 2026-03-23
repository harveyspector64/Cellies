// YARD — Game Lifecycle & Initialization
// ============================================================
// GAME LIFECYCLE
// ============================================================
let lastTime = 0;
let running = false;

// Tournament state
let tournament = null;
let tournamentFightDone = false; // flag: the current fight ended, need to record result

// ============================================================
// MENU BACKGROUND — Living prison exterior scene
// ============================================================
let menuBgImg = null;
let menuBgTime = 0;
// Cloud objects that drift across the sky
const menuClouds = [];
for (let i = 0; i < 6; i++) {
  menuClouds.push({
    x: Math.random() * 1000 - 50,
    y: 10 + Math.random() * 90,
    w: 40 + Math.random() * 70,
    h: 12 + Math.random() * 15,
    speed: 4 + Math.random() * 8,
    opacity: 0.12 + Math.random() * 0.18
  });
}

function _loadMenuBackground() {
  menuBgImg = new Image();
  menuBgImg.src = 'new_art_32/prison_exterior-Sheet.png';
}

function _drawMenuBackground(ctx, dt) {
  menuBgTime += dt;

  // Clear canvas
  ctx.fillStyle = '#0a0806';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (!menuBgImg || !menuBgImg.complete) return;

  ctx.imageSmoothingEnabled = false;

  // Scale image to cover entire canvas (cover, not contain)
  const imgW = menuBgImg.naturalWidth;   // 320
  const imgH = menuBgImg.naturalHeight;  // 184
  const scaleX = CANVAS_W / imgW;
  const scaleY = CANVAS_H / imgH;
  const sc = Math.max(scaleX, scaleY); // cover — fill all canvas
  const drawW = imgW * sc;
  const drawH = imgH * sc;
  const drawX = (CANVAS_W - drawW) / 2;
  const drawY = (CANVAS_H - drawH) / 2;
  ctx.drawImage(menuBgImg, drawX, drawY, drawW, drawH);

  // Animated clouds drifting across sky
  menuClouds.forEach(c => {
    c.x += c.speed * dt / 1000;
    if (c.x > CANVAS_W + 40) { c.x = -c.w - 10; c.y = 15 + Math.random() * 80; }
    ctx.fillStyle = `rgba(180, 190, 210, ${c.opacity})`;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x - c.w * 0.25, c.y + 2, c.w * 0.3, c.h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x + c.w * 0.25, c.y + 1, c.w * 0.35, c.h * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Searchlight cone sweeping from guard tower
  // Tower is at roughly 82% of image width, 30% height
  const towerX = drawX + drawW * 0.82;
  const towerY = drawY + drawH * 0.28;
  const sweepAngle = Math.sin(menuBgTime / 3000) * 0.6 + 0.3;
  const beamLen = 400;
  const beamWidth = 0.15;
  ctx.save();
  ctx.globalAlpha = 0.06 + Math.sin(menuBgTime / 1500) * 0.02;
  ctx.beginPath();
  ctx.moveTo(towerX, towerY);
  ctx.lineTo(
    towerX + Math.cos(sweepAngle + Math.PI / 2) * beamLen,
    towerY + Math.sin(sweepAngle + Math.PI / 2) * beamLen
  );
  ctx.lineTo(
    towerX + Math.cos(sweepAngle + Math.PI / 2 + beamWidth) * beamLen,
    towerY + Math.sin(sweepAngle + Math.PI / 2 + beamWidth) * beamLen
  );
  ctx.closePath();
  ctx.fillStyle = '#ffffcc';
  ctx.fill();
  ctx.restore();

  // Subtle ambient light flicker
  const flicker = Math.sin(menuBgTime / 2000) * 0.015 + Math.sin(menuBgTime / 700) * 0.008;
  ctx.fillStyle = `rgba(255, 200, 100, ${Math.max(0, flicker)})`;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Darkened overlay so menu text is readable
  ctx.fillStyle = 'rgba(10, 8, 6, 0.35)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Slight vignette around edges
  const vig = ctx.createRadialGradient(CANVAS_W/2, CANVAS_H/2, CANVAS_W*0.25, CANVAS_W/2, CANVAS_H/2, CANVAS_W*0.65);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

// ============================================================
// SCREEN TRANSITIONS — smooth fades between game states
// ============================================================
let transition = null; // { phase: 'out'|'in', timer: 0, duration: 400, callback: null, color: '#000' }

function _startTransition(callback, duration = 400, color = '#0a0806') {
  transition = { phase: 'out', timer: 0, duration, callback, color };
}

function _updateTransition(dt) {
  if (!transition) return;
  transition.timer += dt;
  if (transition.phase === 'out' && transition.timer >= transition.duration) {
    // Hit full black — execute the state change
    if (transition.callback) transition.callback();
    transition.phase = 'in';
    transition.timer = 0;
  } else if (transition.phase === 'in' && transition.timer >= transition.duration) {
    transition = null; // done
  }
}

function _drawTransition(ctx) {
  if (!transition) return;
  let alpha;
  if (transition.phase === 'out') {
    alpha = clamp(transition.timer / transition.duration, 0, 1);
  } else {
    alpha = 1 - clamp(transition.timer / transition.duration, 0, 1);
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = transition.color;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.globalAlpha = 1;
}

function gameLoop(timestamp) {
  if (!running) return;
  const dt = Math.min(timestamp - lastTime, 50); // cap at 50ms
  lastTime = timestamp;

  // Update transition overlay
  _updateTransition(dt);

  if (gameState === 'playing' && game) {
    game.update(dt);

    // Tournament fight: override announcer text and handle return to bracket
    if (tournament && game.gameOver && !tournamentFightDone) {
      tournamentFightDone = true;
      const player = game.fighters.find(f => f.isPlayer);
      const playerWon = player && player.alive && player.state !== STATES.KO;
      if (playerWon) {
        // Check if this was the final match
        const alive = tournament.bracket.filter(b => b.alive && !b.isPlayer);
        const remainingAfterThis = alive.filter(b => {
          const m = tournament.matchups.find(m2 => (m2.a === b || m2.b === b));
          return !m || m.winner !== b; // still alive after this round resolves
        });
        const isFinal = tournament.round >= 2;
        game.announcer.show(isFinal ? 'YARD CHAMPION!' : 'ADVANCING', 'ENTER: Continue', 999999);
      } else {
        // Player lost — no announcer text, we'll auto-fade to medical
      }
    }

    // Global input — ESC opens pause menu (works anytime during a match)
    if (input.wasPressed('Escape')) {
      gameState = 'paused';
      pauseOverlay.style.display = 'flex';
      _updatePauseButtons();
      input.justPressed['Escape'] = false; // consume — don't let pause handler see it this frame
    }
    // Game over controls (only when fight is settled)
    if (game.gameOver && game.gameOverTimer > 1500) {
      if (tournament) {
        const player = game.fighters.find(f => f.isPlayer);
        const playerWon = player && player.alive && player.state !== STATES.KO;
        if (playerWon) {
          // Winner presses a key to advance
          if (input.wasPressed('Enter') || input.wasPressed('Space') || input.wasPressed('KeyQ')) {
            _tournamentFightEnded();
          }
        } else {
          // Loser auto-transitions to medical after a brief moment on the KO
          if (game.gameOverTimer > 3000) {
            _tournamentFightEnded();
          }
        }
      } else {
        if (input.wasPressed('KeyR')) restartGame();
        if (input.wasPressed('KeyQ')) quitToMenu();
      }
    }
  }
  // Pause menu keyboard controls (else-if: only runs if NOT in playing state)
  else if (gameState === 'paused') {
    if (input.wasPressed('Escape')) {
      resumeGame();
    } else if (input.wasPressed('Enter') || input.wasPressed('KeyQ')) {
      if (tournament) {
        _forfeitTournament();
      } else {
        quitToMenu();
      }
    } else if (input.wasPressed('KeyR') && !tournament) {
      pauseOverlay.style.display = 'none';
      restartGame();
    }
  }

  // Tournament bracket screen
  if (gameState === 'tournament' && tournament) {
    _updateTournament(dt);
    // Guard: _updateTournament may have quit/nulled tournament mid-frame
    if (tournament) drawTournamentBracket(ctx, tournament);
  }

  // Medical bay scene (tournament loss)
  if (gameState === 'medical') {
    _updateMedicalBay(dt);
    _drawMedicalBay(ctx);
  }

  if (gameState === 'playing' && game) {
    game.draw(ctx);
  }

  // Living cell preview
  if (gameState === 'cellpreview') {
    _updateCellPreview(dt);
    _drawCellPreview(ctx);
  }

  // Menu background — render the living prison exterior behind the HTML menu
  if (gameState === 'menu') {
    _drawMenuBackground(ctx, dt);
  }

  // Draw transition overlay on top of everything
  _drawTransition(ctx);

  input.clearFrame();
  requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  const ratio = CANVAS_W / CANVAS_H;
  let w = window.innerWidth;
  let h = window.innerHeight;
  if (w / h > ratio) {
    w = h * ratio;
  } else {
    h = w / ratio;
  }
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  canvas.style.width = `${Math.floor(w)}px`;
  canvas.style.height = `${Math.floor(h)}px`;
  ctx.imageSmoothingEnabled = false;
}

// Menu keyboard navigation state
let menuSelection = 0; // 0=1v1, 1=cell, 2=riot, 3=tournament, 4=custom
const menuModes = ['1v1', 'cell', 'riot', 'tournament', 'custom'];

function selectGang(el) {
  document.querySelectorAll('.gang-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedGang = el.dataset.gang;
}

// Graphics mode toggle — 16-bit / 32-bit
function setSpriteMode(mode) {
  if (spriteMode === mode) return;
  spriteMode = mode;

  // Update toggle button visuals
  const btn16 = document.getElementById('mode-16');
  const btn32 = document.getElementById('mode-32');
  if (btn16 && btn32) {
    btn16.classList.toggle('selected', mode === '16');
    btn32.classList.toggle('selected', mode === '32');
  }

  // Reload assets for the new mode
  const btns = document.querySelectorAll('#quickstart-section .menu-btn');
  btns.forEach(b => b.disabled = true);

  // Show loading indicator
  ctx.fillStyle = '#0a0806';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#c4943a';
  ctx.textAlign = 'center';
  ctx.fillText('LOADING...', CANVAS_W / 2, CANVAS_H / 2);

  loadAssets().then(() => {
    btns.forEach(b => b.disabled = false);
    console.log(`Switched to ${mode === '32' ? '32-BIT' : '16-BIT'} mode — ${Object.keys(assets).length} assets loaded`);
  });
}

function updateMenuHighlight() {
  const btns = document.querySelectorAll('#quickstart-section .menu-btn');
  btns.forEach((b, i) => {
    if (i === menuSelection) {
      b.classList.add('selected');
    } else {
      b.classList.remove('selected');
    }
  });
}

// Start menu ambience on first interaction
let _menuAmbienceStarted = false;
function _ensureMenuAmbience() {
  if (!_menuAmbienceStarted && gameState === 'menu') {
    SFX.init();
    SFX.resume();
    SFX.startMenuAmbience();
    _menuAmbienceStarted = true;
  }
}

function handleMenuKeys(e) {
  if (gameState !== 'menu') return;
  _ensureMenuAmbience();

  const gangBtns = document.querySelectorAll('.gang-btn');
  const gangIds = ['surenos', 'woods', 'bgf', 'nortenos'];
  const currentGangIdx = gangIds.indexOf(selectedGang);

  if (e.code === 'ArrowUp' || e.code === 'KeyW') {
    menuSelection = (menuSelection - 1 + menuModes.length) % menuModes.length;
    updateMenuHighlight();
    e.preventDefault();
  } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    menuSelection = (menuSelection + 1) % menuModes.length;
    updateMenuHighlight();
    e.preventDefault();
  } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    const newIdx = (currentGangIdx - 1 + gangIds.length) % gangIds.length;
    selectGang(gangBtns[newIdx]);
    e.preventDefault();
  } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    const newIdx = (currentGangIdx + 1) % gangIds.length;
    selectGang(gangBtns[newIdx]);
    e.preventDefault();
  } else if (e.code === 'Enter' || e.code === 'Space') {
    const mode = menuModes[menuSelection];
    if (mode === 'tournament') {
      startTournament();
    } else if (mode === 'custom') {
      toggleCustom();
    } else {
      startGame(mode);
    }
    e.preventDefault();
  } else if (e.code === 'KeyC') {
    // C = Cell preview (test scene)
    startCellPreview();
    e.preventDefault();
  }
}

function startGame(mode) {
  SFX.init();
  SFX.resume();
  SFX.stopMenuAmbience();
  SFX.doorSlam();
  _startTransition(() => {
    gameMode = mode;
    gameState = 'playing';
    menuScreen.style.display = 'none';
    hudEl.style.display = 'block';
    game = new Game(mode, selectedGang);
    SFX.startAmbience(mode);
  }, 350);
}

function restartGame() {
  if (!gameMode) return;
  pauseOverlay.style.display = 'none';
  _startTransition(() => {
    SFX.stopAmbience();
    if (gameMode === 'custom' && game && game.customConfig) {
      const config = game.customConfig;
      game = new Game('custom', selectedGang, config);
      const total = config.crewSize + config.enemyTeams.reduce((s, t) => s + t.count, 0);
      SFX.startAmbience(total > 4 ? 'riot' : '1v1');
    } else {
      game = new Game(gameMode, selectedGang);
      SFX.startAmbience(gameMode);
    }
    gameState = 'playing';
  }, 300);
}

function resumeGame() {
  gameState = 'playing';
  pauseOverlay.style.display = 'none';
}

function _updatePauseButtons() {
  // Dynamically set pause overlay content based on context
  const isTourney = !!tournament;
  const isGameOver = game && game.gameOver;
  pauseOverlay.innerHTML = `
    <div class="pause-text">${isGameOver ? 'FIGHT OVER' : 'PAUSED'}</div>
    ${!isGameOver ? '<button class="menu-btn" onclick="resumeGame()">RESUME <span style="font-size:8px;color:#6a5a4a;">[ESC]</span></button>' : ''}
    ${!isTourney && !isGameOver ? '<button class="menu-btn" onclick="pauseOverlay.style.display=\'none\';restartGame()">RESTART <span style="font-size:8px;color:#6a5a4a;">[R]</span></button>' : ''}
    <button class="menu-btn" onclick="${isTourney ? '_forfeitTournament()' : 'quitToMenu()'}">
      ${isTourney ? 'FORFEIT' : 'QUIT TO MENU'} <span style="font-size:8px;color:#6a5a4a;">[ENTER]</span>
    </button>
  `;
}

function _forfeitTournament() {
  pauseOverlay.style.display = 'none';
  gameState = 'playing';
  if (game && game.player && game.player.alive) {
    game.player.health = 0;
    game.player.alive = false;
    game.player.setState(STATES.KO);
  }
}

function quitToMenu() {
  SFX.stopAmbience();
  pauseOverlay.style.display = 'none';
  SFX.doorSlam();
  _startTransition(() => {
    gameState = 'menu';
    game = null;
    gameMode = null;
    tournament = null;
    menuScreen.style.display = 'flex';
    hudEl.style.display = 'none';
    updateMenuHighlight();
    SFX.startMenuAmbience();
  }, 400);
}

// ============================================================
// CUSTOM FIGHT CONFIGURATOR
// ============================================================
let customArena = 'yard';
let customCrewSize = 1;
let customEnemyTeams = []; // [{gang: 'woods', count: 1}, ...]

function toggleCustom() {
  const panel = document.getElementById('custom-panel');
  const btn = document.getElementById('custom-toggle-btn');
  if (panel.style.display === 'none') {
    panel.style.display = 'flex';
    btn.textContent = 'CUSTOM  FIGHT  ▲';
    btn.style.borderColor = '#c4943a';
    btn.style.color = '#ffd080';
    // Init with one enemy team if empty
    if (customEnemyTeams.length === 0) {
      const otherGangs = Object.keys(GANG_COLORS).filter(g => g !== selectedGang);
      customEnemyTeams.push({ gang: otherGangs[0], count: 1 });
    }
    rebuildEnemyTeamsUI();
    updateCustomSummary();
  } else {
    panel.style.display = 'none';
    btn.textContent = 'CUSTOM  FIGHT  ▼';
    btn.style.borderColor = '#5a4a3a';
    btn.style.color = '#8a7a5a';
  }
}

function selectArena(el) {
  document.querySelectorAll('#arena-select .cfg-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  customArena = el.dataset.arena;
  updateCustomSummary();
}

function adjustCrew(delta) {
  customCrewSize = Math.max(1, Math.min(8, customCrewSize + delta));
  document.getElementById('crew-count').textContent = customCrewSize;
  updateCustomSummary();
}

function addEnemyTeam() {
  if (customEnemyTeams.length >= 3) return; // max 3 enemy gangs
  const usedGangs = [selectedGang, ...customEnemyTeams.map(t => t.gang)];
  const available = Object.keys(GANG_COLORS).filter(g => !usedGangs.includes(g));
  if (available.length === 0) return;
  customEnemyTeams.push({ gang: available[0], count: 1 });
  rebuildEnemyTeamsUI();
  updateCustomSummary();
  // Hide add button if all gangs used
  document.getElementById('add-team-btn').style.display =
    customEnemyTeams.length >= 3 || available.length <= 1 ? 'none' : 'block';
}

function removeEnemyTeam(idx) {
  customEnemyTeams.splice(idx, 1);
  rebuildEnemyTeamsUI();
  updateCustomSummary();
  document.getElementById('add-team-btn').style.display = 'block';
}

function cycleEnemyGang(idx) {
  const usedGangs = [selectedGang, ...customEnemyTeams.filter((_, i) => i !== idx).map(t => t.gang)];
  const available = Object.keys(GANG_COLORS).filter(g => !usedGangs.includes(g));
  if (available.length === 0) return;
  const current = available.indexOf(customEnemyTeams[idx].gang);
  customEnemyTeams[idx].gang = available[(current + 1) % available.length];
  rebuildEnemyTeamsUI();
  updateCustomSummary();
}

function adjustEnemyCount(idx, delta) {
  customEnemyTeams[idx].count = Math.max(1, Math.min(8, customEnemyTeams[idx].count + delta));
  rebuildEnemyTeamsUI();
  updateCustomSummary();
}

function rebuildEnemyTeamsUI() {
  const container = document.getElementById('enemy-teams');
  container.innerHTML = '';
  customEnemyTeams.forEach((team, i) => {
    const gc = GANG_COLORS[team.gang];
    const row = document.createElement('div');
    row.className = 'enemy-team-row';
    row.innerHTML = `
      <span class="gang-chip active" onclick="cycleEnemyGang(${i})" style="background:${gc.primary};color:#fff;font-family:'Press Start 2P',monospace;">${gc.name}</span>
      <button class="cfg-btn-sm" onclick="adjustEnemyCount(${i},-1)" style="width:14px;height:14px;font-size:6px;">-</button>
      <span style="font-size:6px;color:#c4943a;width:14px;text-align:center;">${team.count}</span>
      <button class="cfg-btn-sm" onclick="adjustEnemyCount(${i},1)" style="width:14px;height:14px;font-size:6px;">+</button>
      <span class="remove-btn" onclick="removeEnemyTeam(${i})">✕</span>
    `;
    container.appendChild(row);
  });
}

function updateCustomSummary() {
  const totalEnemy = customEnemyTeams.reduce((s, t) => s + t.count, 0);
  const totalFighters = customCrewSize + totalEnemy;
  const arenaLabel = customArena === 'cell' ? 'Cell' : 'Yard';
  const el = document.getElementById('custom-summary');
  el.textContent = `${customCrewSize} vs ${totalEnemy} · ${totalFighters} fighters · ${arenaLabel}`;
}

function startCustomGame() {
  if (customEnemyTeams.length === 0) return;
  SFX.init();
  SFX.resume();
  gameMode = 'custom';
  gameState = 'playing';
  menuScreen.style.display = 'none';
  hudEl.style.display = 'block';
  const config = {
    arena: customArena,
    playerGang: selectedGang,
    crewSize: customCrewSize,
    enemyTeams: customEnemyTeams.map(t => ({ ...t }))
  };
  game = new Game('custom', selectedGang, config);
  SFX.startAmbience(customCrewSize + customEnemyTeams.reduce((s, t) => s + t.count, 0) > 4 ? 'riot' : '1v1');
}

// ============================================================
// TOURNAMENT MODE
// ============================================================
function startTournament() {
  SFX.init();
  SFX.resume();
  SFX.stopMenuAmbience();
  SFX.doorSlam();
  _startTransition(() => {
    gameMode = 'tournament';
    gameState = 'tournament';
    menuScreen.style.display = 'none';
    hudEl.style.display = 'none';
    game = null;
    tournament = new Tournament(selectedGang);
    tournamentFightDone = false;
    SFX.bell();
  }, 350);
}

function _updateTournament(dt) {
  if (!tournament) return;

  if (tournament.phase === 'champion') {
    // Champion screen — R to play again, Q to menu
    if (input.wasPressed('KeyR')) {
      startTournament(); // fresh tournament
    }
    if (input.wasPressed('KeyQ')) {
      tournament = null;
      quitToMenu();
    }
    return;
  }

  // Bracket screen input
  if (input.wasPressed('Enter') || input.wasPressed('Space')) {
    if (tournament.allMatchesDone()) {
      // All matches in this round are done — advance to next round
      tournament.advanceRound();
      return;
    }

    // Check if player's match is next
    const playerMatch = tournament.getPlayerMatch();
    if (playerMatch && !playerMatch.fought) {
      // Start a real fight for the player
      _startTournamentFight(playerMatch);
      return;
    }

    // Otherwise simulate next AI match
    const aiMatch = tournament.getNextAIMatch();
    if (aiMatch) {
      tournament.simulateMatch(aiMatch);
      SFX.punchHit(0.5);
      // Brief pause for visual feedback — the bracket redraws with result
    }
  }

  if (input.wasPressed('KeyQ')) {
    tournament = null;
    quitToMenu();
  }
}

function _startTournamentFight(match) {
  // Determine opponent entry from bracket
  const oppEntry = match.a.isPlayer ? match.b : match.a;
  const playerEntry = match.a.isPlayer ? match.a : match.b;

  // Create a 1v1 Game — the game creates proper fighters with different gangIds
  gameState = 'playing';
  hudEl.style.display = 'block';

  game = new Game('1v1', selectedGang);

  // Override names and traits to match the tournament bracket
  // IMPORTANT: do NOT override gangId — _setup1v1 already guarantees different gangs
  // for the combat system. Overriding gangId to the player's gang breaks hit detection.
  const opp = game.fighters.find(f => !f.isPlayer);
  const player = game.fighters.find(f => f.isPlayer);

  if (opp) {
    opp.name = oppEntry.name;
    // Apply tournament traits and recalculate derived stats
    opp.traits = { ...oppEntry.traits };
    opp.maxHealth = MAX_HEALTH * (0.8 + oppEntry.traits.toughness * 0.4);
    opp.health = opp.maxHealth;
    opp.baseMoveSpeed = T('BASE_MOVE_SPEED_MIN', 1.2) + oppEntry.traits.speed * T('BASE_MOVE_SPEED_RANGE', 0.8);
    opp.damageMult = 0.7 + oppEntry.traits.power * 0.6;
  }

  if (player) {
    player.name = playerEntry.name;
    // Apply carried-over health/injuries from previous tournament fights
    player.health = player.maxHealth * tournament.playerHealth;
    player.injuries = tournament.playerInjuries;
  }

  tournamentFightDone = false;
  SFX.startAmbience('1v1');
}

function _tournamentFightEnded() {
  if (!tournament || !game) return;

  // Determine if player won
  const player = game.fighters.find(f => f.isPlayer);
  const opp = game.fighters.find(f => !f.isPlayer);
  const playerWon = player && player.alive && player.state !== STATES.KO;

  // Capture player info before cleaning up
  const playerName = player ? player.name : 'FIGHTER';
  const playerCharDef = player ? player.charDef : null;
  const currentRound = tournament.round;

  // Record result in tournament bracket
  tournament.recordPlayerResult(playerWon, player, opp);

  // Clean up fight
  SFX.stopAmbience();
  game = null;
  hudEl.style.display = 'none';
  tournamentFightDone = false;

  if (!playerWon) {
    // Simulate remaining tournament in background
    while (!tournament.allMatchesDone()) {
      const aiMatch = tournament.getNextAIMatch();
      if (aiMatch) {
        tournament.simulateMatch(aiMatch);
      } else {
        break;
      }
    }
    while (tournament.bracket.filter(b => b.alive).length > 1) {
      tournament.advanceRound();
      const matchups = tournament.matchups;
      for (const m of matchups) {
        if (!m.fought) {
          tournament.simulateMatch(m);
        }
      }
    }
    tournament.advanceRound(); // triggers 'champion' phase

    // Transition to medical bay instead of bracket
    _medicalPlayerCharDef = playerCharDef;
    const oppName = opp ? opp.name : '';
    _startMedicalBay(playerName, oppName, currentRound);
    console.log('[TOURNAMENT] gameState after _startMedicalBay:', gameState);
  } else {
    gameState = 'tournament';
    console.log('[TOURNAMENT] Player won — going to bracket');
  }
}

// ============================================================
// MEDICAL BAY SCENE — Tournament loss recovery
// ============================================================
let medicalBay = null;
let medicalState = null; // { fadeTimer, phase, nurseAnim, nurseFrame, playerName, playerGangLabel, round }

function _startMedicalBay(playerName, opponentName, roundNum) {
  try {
    medicalBay = new ProceduralMedical();
  } catch (e) {
    console.error('[MEDICAL] Failed to create ProceduralMedical:', e);
    gameState = 'tournament';
    return;
  }
  medicalState = {
    fadeTimer: 0,
    phase: 'fadein', // fadein → scene → fadeout
    nurseAnimTimer: 0,
    nurseFrame: 0,
    nursePhase: 'check', // check → idle (loops)
    nursePhaseTimer: 0,
    guardAnimTimer: 0,
    guardFrame: 0,
    playerName: playerName || 'FIGHTER',
    opponentName: opponentName || '',
    round: roundNum || 0,
    sceneTimer: 0,
    textAlpha: 0,
  };
  gameState = 'medical';
  console.log('[MEDICAL] Scene started, gameState =', gameState);
}

function _updateMedicalBay(dt) {
  if (!medicalState) return;
  const ms = medicalState;

  if (ms.phase === 'fadein') {
    ms.fadeTimer += dt;
    if (ms.fadeTimer >= 1200) {
      ms.phase = 'scene';
      ms.fadeTimer = 0;
    }
  } else if (ms.phase === 'scene') {
    ms.sceneTimer += dt;

    // Nurse animation
    ms.nurseAnimTimer += dt;
    ms.nursePhaseTimer += dt;
    const nurseSpeed = ms.nursePhase === 'check' ? 140 : 180;
    const nurseFrames = ms.nursePhase === 'check' ? 8 : 18;
    if (ms.nurseAnimTimer >= nurseSpeed) {
      ms.nurseAnimTimer -= nurseSpeed;
      ms.nurseFrame++;
      if (ms.nurseFrame >= nurseFrames) {
        ms.nurseFrame = 0;
        // After 2 check loops, switch to idle
        if (ms.nursePhase === 'check' && ms.nursePhaseTimer > 2200) {
          ms.nursePhase = 'idle';
          ms.nursePhaseTimer = 0;
          ms.nurseFrame = 0;
        }
      }
    }

    // Guard idle animation (13 frames, slow breathing)
    ms.guardAnimTimer += dt;
    if (ms.guardAnimTimer >= 200) {
      ms.guardAnimTimer -= 200;
      ms.guardFrame = (ms.guardFrame + 1) % 13;
    }

    // Fade in text after a beat
    if (ms.sceneTimer > 800) {
      ms.textAlpha = Math.min(1, ms.textAlpha + dt / 600);
    }

    // Input — proceed to bracket or quit to menu
    if (ms.sceneTimer > 1500) {
      if (input.wasPressed('KeyQ')) {
        ms.phase = 'fadeout';
        ms.fadeTimer = 0;
        ms._exitTo = 'menu';
      } else if (input.wasPressed('Enter') || input.wasPressed('Space')) {
        ms.phase = 'fadeout';
        ms.fadeTimer = 0;
        ms._exitTo = 'bracket';
      }
    }
  } else if (ms.phase === 'fadeout') {
    ms.fadeTimer += dt;
    if (ms.fadeTimer >= 600) {
      const exitTo = ms._exitTo || 'bracket';
      medicalBay = null;
      medicalState = null;
      _medicalPlayerCharDef = null;
      if (exitTo === 'menu') {
        tournament = null;
        quitToMenu();
      } else {
        gameState = 'tournament';
      }
    }
  }
}

function _drawMedicalBay(ctx) {
  if (!medicalBay || !medicalState) return;
  const ms = medicalState;

  // Black during fade-in
  if (ms.phase === 'fadein') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Fade in the scene
    const alpha = Math.min(1, ms.fadeTimer / 1200);
    ctx.globalAlpha = alpha;
    medicalBay.draw(ctx);
    ctx.globalAlpha = 1;
    // Keep black overlay fading out
    ctx.fillStyle = `rgba(0,0,0,${1 - alpha})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    return;
  }

  // Draw room — scaled up to fill canvas
  medicalBay.draw(ctx);

  // Calculate room→screen transform (same as medicalBay.draw)
  const rW = medicalBay.roomW;
  const rH = medicalBay.roomH;
  const scaleX = CANVAS_W / rW;
  const scaleY = CANVAS_H / rH;
  const roomScale = Math.max(scaleX, scaleY);
  const roomDx = (CANVAS_W - rW * roomScale) / 2;
  const roomDy = (CANVAS_H - rH * roomScale) / 2;

  ctx.save();
  ctx.translate(roomDx, roomDy);
  ctx.scale(roomScale, roomScale);

  // Bed coords in room space
  const bedX = medicalBay.bedX;
  const bedY = medicalBay.bedY;
  const bedW = medicalBay.bedW;
  const bedH = medicalBay.bedH;

  // Player sitting on edge of bed — use idle (south) or hit sprite
  const pDef = _medicalPlayerCharDef;
  if (pDef) {
    // Prefer idle (south-facing, looks like sitting), fall back to hit last frame
    const idleKey = pDef.idle || pDef.hit;
    const idleFrames = pDef.idleFrames || pDef.hitFrames || 1;
    const sheet = assets[idleKey];
    if (sheet) {
      ctx.save();
      // Sit on the front edge of the bed, slightly left of center
      const px = bedX + bedW * 0.35;
      const py = bedY + bedH + 2; // feet at bed edge
      ctx.translate(px, py);
      const fw = SM().FRAME_W;
      const fh = SM().FRAME_H;
      const sprScale = 2.0;
      const dw = fw * sprScale;
      const dh = fh * sprScale;
      // Animate idle slowly — subtle breathing
      const idleFrame = Math.floor((ms.sceneTimer / 220) % idleFrames);
      // Injured tint — reddish overlay
      ctx.drawImage(sheet, idleFrame * fw, 0, fw, fh, -dw / 2, -dh, dw, dh);
      // Injury overlay — bruised/hurt look
      ctx.globalAlpha = 0.15;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = '#cc6644';
      ctx.fillRect(-dw / 2, -dh, dw, dh);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // Draw nurse — beside the bed
  const nurseSheet = ms.nursePhase === 'check' ? assets['nurse_check'] : assets['nurse_idle'];
  if (nurseSheet) {
    const nfw = 32;
    const nfh = 32;
    const nScale = 2.2; // nurse display scale in room coords
    const ndw = nfw * nScale;
    const ndh = nfh * nScale;
    const nx = medicalBay.nurseX;
    const ny = medicalBay.nurseY;
    ctx.save();
    ctx.translate(nx, ny);
    ctx.scale(-1, 1); // face left toward patient
    const frame = Math.min(ms.nurseFrame, (ms.nursePhase === 'check' ? 8 : 18) - 1);
    ctx.drawImage(nurseSheet, frame * nfw, 0, nfw, nfh, -ndw / 2, -ndh / 2, ndw, ndh);
    ctx.restore();
  }

  // Draw guard by the doorway
  const guardSheet = assets['guard_idle'];
  if (guardSheet) {
    const gfw = 32;
    const gfh = 32;
    const gScale = 2.0;
    const gdw = gfw * gScale;
    const gdh = gfh * gScale;
    const gx = medicalBay.guardX;
    const gy = medicalBay.guardY;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(-1, 1); // face into room
    const gFrame = Math.min(ms.guardFrame, 12);
    ctx.drawImage(guardSheet, gFrame * gfw, 0, gfw, gfh, -gdw / 2, -gdh / 2, gdw, gdh);
    ctx.restore();
  }

  ctx.restore(); // end room transform

  // Text overlay
  if (ms.textAlpha > 0) {
    ctx.globalAlpha = ms.textAlpha;

    // Dark overlay at bottom for text readability
    const gradY = CANVAS_H * 0.55;
    const grad = ctx.createLinearGradient(0, gradY, 0, CANVAS_H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, gradY, CANVAS_W, CANVAS_H - gradY);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // "ELIMINATED" header
    ctx.font = '18px "Press Start 2P", monospace';
    ctx.fillStyle = '#cc3333';
    ctx.fillText('ELIMINATED', CANVAS_W / 2, CANVAS_H * 0.64);

    // Round info
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#8a7a6a';
    ctx.fillText(`Round ${ms.round + 1}`, CANVAS_W / 2, CANVAS_H * 0.72);

    // Who beat you
    if (ms.opponentName) {
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = '#907060';
      ctx.fillText(`Lost to ${ms.opponentName}`, CANVAS_W / 2, CANVAS_H * 0.78);
    }

    // Controls
    if (ms.sceneTimer > 2000) {
      const blink = Math.sin(Date.now() * 0.003) > 0;
      if (blink) {
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = '#6a5a4a';
        ctx.fillText('ENTER: Results  ·  Q: Menu', CANVAS_W / 2, CANVAS_H * 0.90);
      }
    }

    ctx.globalAlpha = 1;
  }

  // Fade-out overlay
  if (ms.phase === 'fadeout') {
    const alpha = Math.min(1, ms.fadeTimer / 600);
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Vignette — medical lighting
  const vigGrad = ctx.createRadialGradient(CANVAS_W * 0.4, CANVAS_H * 0.3, CANVAS_W * 0.15,
    CANVAS_W * 0.4, CANVAS_H * 0.3, CANVAS_W * 0.7);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

// Temp storage for the player's charDef in medical scene
let _medicalPlayerCharDef = null;

// ============================================================
// LIVING CELL PREVIEW — Test scene for interactive cell
// ============================================================
let livingCell = null;
let cellPreviewState = null;

function startCellPreview() {
  SFX.init();
  SFX.resume();
  SFX.stopMenuAmbience();
  SFX.doorSlam();
  _startTransition(() => {
    menuScreen.style.display = 'none';
    hudEl.style.display = 'none';
    gameState = 'cellpreview';

    livingCell = new LivingCell();

    // Get a character def for the player
    const charDefs = SM().charDefs[selectedGang] || SM().charDefs.surenos;
    const charDef = charDefs[0];

    cellPreviewState = {
      timer: 0,
      // Player position in art-pixel coords (Y = feet position, floor is ~38-46)
      playerX: 32,  // center of cell
      playerY: 42,  // on the floor
      playerFrame: 0,
      playerAnimTimer: 0,
      charDef: charDef,
      facingLeft: false,
      prevPlayerY: 42, // track previous position for directional collision
      prevPlayerX: 32,
      // Cellie position — near the bunk, back of cell
      cellieX: 22,
      cellieY: 42, // on the floor
      cellieFrame: 0,
      cellieAnimTimer: 0,
      cellieDef: charDefs[1] || charDefs[0],
    };
  }, 350);
}

// ---- CELL FIGHT SYSTEM ----
// Creates Fighter objects in-place within the living cell scene

function _getFighterSpriteInfo(f, fw, fh) {
  let sheetKey, frameCount;
  const cd = f.charDef;
  switch (f.state) {
    case STATES.IDLE:
      if ((f.isPlayer || f.useIdleAnim) && cd.idle && cd.idleFrames > 0) {
        sheetKey = cd.idle; frameCount = cd.idleFrames;
      } else { sheetKey = cd.walk; frameCount = cd.walkFrames; }
      break;
    case STATES.WALK: sheetKey = cd.walk; frameCount = cd.walkFrames; break;
    case STATES.JAB: sheetKey = cd.jab; frameCount = cd.jabFrames; break;
    case STATES.HOOK: sheetKey = cd.hook || cd.jab; frameCount = cd.hookFrames || cd.jabFrames; break;
    case STATES.SHOVE: sheetKey = cd.shove || cd.jab; frameCount = cd.shoveFrames || cd.jabFrames; break;
    case STATES.BLOCK: sheetKey = cd.block || cd.walk; frameCount = cd.blockFrames || cd.walkFrames; break;
    case STATES.HIT: sheetKey = cd.hit; frameCount = cd.hitFrames; break;
    case STATES.KNOCKDOWN: case STATES.KO:
      if (cd.die && cd.dieFrames > 0) { sheetKey = cd.die; frameCount = cd.dieFrames; }
      else { sheetKey = cd.hit; frameCount = cd.hitFrames; }
      break;
    case STATES.CELEBRATE:
      if (cd.celebrate && cd.celebrateFrames > 0) { sheetKey = cd.celebrate; frameCount = cd.celebrateFrames; }
      else { sheetKey = cd.walk; frameCount = cd.walkFrames; }
      break;
    case STATES.GETUP: sheetKey = cd.hit; frameCount = cd.hitFrames; break;
    default: sheetKey = cd.walk; frameCount = cd.walkFrames;
  }
  return { sheet: assets[sheetKey], frame: clamp(f.animFrame, 0, (frameCount || 1) - 1) };
}

function _startCellFight(cs, firstPunch) {
  const sc = livingCell.scale;

  // Create player fighter at current art-pixel position, converted to world-space
  const playerTraits = window.selectedTraits || { aggression: 0.5, toughness: 0.5, speed: 0.5, power: 0.5 };
  cs.player = new Fighter(cs.playerX * sc, cs.playerY * sc, cs.charDef, 'player', playerTraits);
  cs.player.isPlayer = true;
  cs.player.name = 'You';

  // Create enemy fighter
  const enemyTraits = { aggression: 0.5 + Math.random() * 0.3, toughness: 0.4 + Math.random() * 0.3,
                        speed: 0.4 + Math.random() * 0.3, power: 0.4 + Math.random() * 0.3 };
  cs.enemy = new Fighter(cs.cellieX * sc, cs.cellieY * sc, cs.cellieDef, 'cellie', enemyTraits);
  cs.enemy.name = randomName();
  cs.enemy.target = cs.player;
  cs.player.target = cs.enemy;

  // AI for the cellie
  const diff = 0.55 + Math.random() * 0.35;
  cs.ai = new AIController(cs.enemy, diff);

  // Combat support systems
  cs.fighters = [cs.player, cs.enemy];
  cs.particles = new ParticleSystem();
  cs.dmgNumbers = new DamageNumberSystem();
  cs.announcer = new Announcer();
  cs.cellCamera = new Camera();
  cs.cellCamera.worldW = livingCell.worldW;
  cs.cellCamera.worldH = livingCell.worldH;
  cs.cellCamera.x = livingCell.worldW / 2;
  cs.cellCamera.y = livingCell.worldH / 2;

  cs.fighting = true;
  cs.fightOver = false;

  // Throw the first punch
  SFX.punchHit();
  if (firstPunch === 'hook' && cs.player.charDef.hook) {
    cs.player.hook();
  } else {
    cs.player.jab();
  }

  cs.announcer.show('CELL WAR!', '', 2000);
}

function _updateCellFight(cs, dt) {
  const sc = livingCell.scale;

  // Floor bounds in world-space
  const floorL = livingCell.floorLeftX * sc;
  const floorR = livingCell.floorRightX * sc;
  const floorT = livingCell.floorBackY * sc;
  const floorB = livingCell.floorFrontY * sc;

  // --- Player input (mirrors Game._handlePlayerInput) ---
  const p = cs.player;
  if (p && p.alive) {
    // Knockdown — mash to get up
    if (p.state === STATES.KNOCKDOWN && p.isDown) {
      if (input.wasPressed('KeyJ') || input.wasPressed('KeyK') ||
          input.wasPressed('KeyW') || input.wasPressed('KeyA') ||
          input.wasPressed('KeyS') || input.wasPressed('KeyD')) {
        p.attemptGetUp();
      }
    } else if (p.state !== STATES.GETUP) {
      // Clinch
      if (p.inClinch) {
        if (input.wasPressed('KeyJ')) p.clinchGutShot();
        if (input.wasPressed('KeyK')) p.clinchShove();
        if (input.wasPressed('KeyL') || input.wasPressed('KeyA') || input.wasPressed('KeyD')) {
          if (p.stamina >= CLINCH_BREAK_STAMINA) { p.stamina -= CLINCH_BREAK_STAMINA; p.breakClinch(); }
        }
      } else {
        // Movement
        let mx = 0, my = 0;
        if (input.isDown('KeyW') || input.isDown('ArrowUp')) my = -1;
        if (input.isDown('KeyS') || input.isDown('ArrowDown')) my = 1;
        if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx = -1;
        if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx = 1;

        // Block
        if (input.isDown('KeyL')) { p.block(); }
        else if (p.state === STATES.BLOCK) { p.unblock(); }

        // Attacks
        if (input.wasPressed('KeyJ')) {
          if (p.canAttack) p.jab();
          else { p.inputBuffer = 'jab'; p.inputBufferTimer = INPUT_BUFFER_WINDOW; p.failedInputTimer = FAILED_INPUT_FLASH; }
        }
        if (input.wasPressed('KeyK')) {
          if (p.canAttack) p.hook();
          else { p.inputBuffer = 'hook'; p.inputBufferTimer = INPUT_BUFFER_WINDOW; p.failedInputTimer = FAILED_INPUT_FLASH; }
        }
        if (input.wasPressed('KeyH') || input.wasPressed('Space')) {
          if (p.canAttack) p.shove();
          else { p.inputBuffer = 'shove'; p.inputBufferTimer = INPUT_BUFFER_WINDOW; p.failedInputTimer = FAILED_INPUT_FLASH; }
        }

        // Movement application
        if (p.canMove && p.state !== STATES.BLOCK) {
          if (mx !== 0 || my !== 0) {
            const len = Math.hypot(mx, my);
            mx /= len; my /= len;
            let spdMult = p.stamina < LOW_STAMINA_THRESHOLD ? LOW_STAMINA_SPEED_MULT : 1;
            spdMult *= (1 - p.injuries * 0.002);
            spdMult *= p.recoveryMoveSpeed;
            p.vx = mx * p.moveSpeed * spdMult;
            p.vy = my * p.moveSpeed * spdMult;
            if (p.state !== STATES.WALK && p.recoveryCooldown <= 0) p.setState(STATES.WALK);
            if (mx !== 0) p.facing = mx > 0 ? 1 : -1;
          } else {
            if (p.state === STATES.WALK) p.setState(STATES.IDLE);
          }
        } else if (p.state === STATES.BLOCK && (mx !== 0 || my !== 0)) {
          const len = Math.hypot(mx, my);
          p.vx = (mx / len) * p.moveSpeed * 0.35;
          p.vy = (my / len) * p.moveSpeed * 0.35;
        }

        // Face opponent
        const opp = cs.enemy;
        if (opp && opp.alive) {
          p.target = opp;
          if (p.state !== STATES.JAB && p.state !== STATES.HOOK && p.state !== STATES.SHOVE) {
            p.faceTarget();
          }
        }
      }
    }
  }

  // AI update
  if (cs.enemy.alive) {
    cs.ai.update(dt, cs.player);
  }

  // Update all fighters
  for (const f of cs.fighters) {
    f.update(dt);
    // Clamp to cell floor bounds (world-space)
    f.x = clamp(f.x, floorL, floorR);
    f.y = clamp(f.y, floorT, floorB);

    // Toilet collision in world-space
    const toilet = livingCell.furniture.toilet;
    if (toilet) {
      const tL = (toilet.left + 8) * sc;
      const tR = livingCell.floorRightX * sc;
      const tT = (toilet.top + 24) * sc;
      const tB = (toilet.top + toilet.sprH) * sc;
      if (f.x > tL && f.x < tR && f.y > tT && f.y < tB) {
        // Push out nearest edge
        const dL = f.x - tL, dR = tR - f.x, dT = f.y - tT, dB = tB - f.y;
        const min = Math.min(dL, dR, dT, dB);
        if (min === dL) f.x = tL;
        else if (min === dR) f.x = tR;
        else if (min === dT) f.y = tT;
        else f.y = tB;
      }
    }
  }

  // Resolve collisions & combat
  resolveFighterCollisions(cs.fighters.filter(f => f.alive));
  processCombat(cs.fighters, cs.fighters, cs.particles, cs.cellCamera);

  // Sync art-pixel positions from fighters (for LivingCell drawing)
  cs.playerX = cs.player.x / sc;
  cs.playerY = cs.player.y / sc;
  cs.cellieX = cs.enemy.x / sc;
  cs.cellieY = cs.enemy.y / sc;
  cs.facingLeft = cs.player.facing < 0;

  // Update support systems
  cs.particles.update(dt);
  cs.dmgNumbers.update(dt);
  cs.announcer.update(dt);
  cs.cellCamera.update(dt);

  // Check for KO / fight over
  if (!cs.fightOver) {
    for (const f of cs.fighters) {
      if (!f.alive) {
        cs.fightOver = true;
        cs.fightOverTimer = 0;
        if (f === cs.enemy) {
          cs.announcer.show('KNOCKOUT', '', 3000);
        } else {
          cs.announcer.show('LIGHTS OUT', '', 3000);
        }
      }
    }
  }

  // After fight over, R to restart, Q to menu
  if (cs.fightOver) {
    cs.fightOverTimer = (cs.fightOverTimer || 0) + dt;
    if (cs.fightOverTimer > 1500) {
      if (input.wasPressed('KeyR')) {
        // Reset fight — put everyone back
        cs.fighting = false;
        cs.fightOver = false;
        cs.player = null;
        cs.enemy = null;
        cs.playerX = 32;
        cs.playerY = 46;
        cs.cellieX = 22;
        cs.cellieY = 44;
      }
    }
  }
}

function _updateCellPreview(dt) {
  if (!cellPreviewState) return;
  const cs = cellPreviewState;
  cs.timer += dt;

  // Animate idle (only in peaceful mode — fighters handle their own anim)
  if (!cs.fighting) {
    cs.playerAnimTimer += dt;
    if (cs.playerAnimTimer > 200) {
      cs.playerAnimTimer -= 200;
      const idleFrames = cs.charDef.idleFrames || cs.charDef.walkFrames || 4;
      cs.playerFrame = (cs.playerFrame + 1) % idleFrames;
    }
    cs.cellieAnimTimer += dt;
    if (cs.cellieAnimTimer > 220) {
      cs.cellieAnimTimer -= 220;
      const cIdleFrames = cs.cellieDef.idleFrames || cs.cellieDef.walkFrames || 4;
      cs.cellieFrame = (cs.cellieFrame + 1) % cIdleFrames;
    }
  }

  // --- EDITOR MODE (E to toggle, not during fight) ---
  if (!cs.fighting && input.wasPressed('KeyE')) {
    cs.editMode = !cs.editMode;
    if (cs.editMode) {
      cs.editKeys = Object.keys(livingCell.furniture);
      cs.editFurnitureIdx = 0;
      cs.editTarget = cs.editKeys[0]; // start on first furniture piece
    }
  }

  if (cs.editMode) {
    // TAB cycles through furniture pieces only (no characters in editor)
    if (input.wasPressed('Tab')) {
      cs.editFurnitureIdx++;
      if (cs.editFurnitureIdx >= cs.editKeys.length) cs.editFurnitureIdx = 0;
      cs.editTarget = cs.editKeys[cs.editFurnitureIdx];
    }

    // Arrow keys nudge selected item 1 art-pixel at a time
    const nudge = (dx, dy) => {
      if (cs.editTarget === 'player') {
        cs.playerX += dx; cs.playerY += dy;
      } else if (cs.editTarget === 'cellie') {
        cs.cellieX += dx; cs.cellieY += dy;
      } else {
        const item = livingCell.furniture[cs.editTarget];
        if (item) { item.left += dx; item.top += dy; }
      }
    };

    if (input.wasPressed('ArrowLeft'))  nudge(-1, 0);
    if (input.wasPressed('ArrowRight')) nudge(1, 0);
    if (input.wasPressed('ArrowUp'))    nudge(0, -1);
    if (input.wasPressed('ArrowDown'))  nudge(0, 1);

    // P to print all furniture positions to console
    if (input.wasPressed('KeyP')) {
      console.log('=== CELL LAYOUT ===');
      for (const key of cs.editKeys) {
        const item = livingCell.furniture[key];
        console.log(`${key}: left=${item.left}, top=${item.top} (bottom=${item.top + item.sprH})`);
      }
      console.log('===================');
    }
  } else if (!cs.fighting) {
    // Normal play mode — WASD moves player (not during fight — Fighter handles movement)
    const moveSpeed = 0.015;
    if (input.keys['KeyA'] || input.keys['ArrowLeft'])  { cs.playerX -= moveSpeed * dt; cs.facingLeft = true; }
    if (input.keys['KeyD'] || input.keys['ArrowRight']) { cs.playerX += moveSpeed * dt; cs.facingLeft = false; }
    if (input.keys['KeyW'] || input.keys['ArrowUp'])    cs.playerY -= moveSpeed * dt;
    if (input.keys['KeyS'] || input.keys['ArrowDown'])  cs.playerY += moveSpeed * dt;

    cs.playerX = clamp(cs.playerX, livingCell.floorLeftX, livingCell.floorRightX);
    cs.playerY = clamp(cs.playerY, livingCell.floorBackY, livingCell.floorFrontY);

    // Toilet collision — solid box, blocks from all sides.
    const toilet = livingCell.furniture.toilet;
    if (toilet) {
      // Collision rect in art pixels — snug to visible toilet
      const tL = toilet.left + 8;
      const tR = livingCell.floorRightX;  // right edge = wall
      const tT = toilet.top + 24;         // top of collision at counter/basin level
      const tB = toilet.top + toilet.sprH;

      // Is player inside the box now?
      if (cs.playerX > tL && cs.playerX < tR && cs.playerY > tT && cs.playerY < tB) {
        // Use previous position to decide which edge to push to
        const fromLeft = cs.prevPlayerX <= tL;
        const fromRight = cs.prevPlayerX >= tR;
        const fromTop = cs.prevPlayerY <= tT;
        const fromBottom = cs.prevPlayerY >= tB;

        if (fromLeft) cs.playerX = tL;
        else if (fromRight) cs.playerX = tR;
        else if (fromTop) cs.playerY = tT;
        else if (fromBottom) cs.playerY = tB;
        else {
          // Already inside somehow — push out nearest edge
          const dL = cs.playerX - tL;
          const dR = tR - cs.playerX;
          const dT = cs.playerY - tT;
          const dB = tB - cs.playerY;
          const min = Math.min(dL, dR, dT, dB);
          if (min === dL) cs.playerX = tL;
          else if (min === dR) cs.playerX = tR;
          else if (min === dT) cs.playerY = tT;
          else cs.playerY = tB;
        }
      }
    }
    cs.prevPlayerX = cs.playerX;
    cs.prevPlayerY = cs.playerY;

    // Punch cellie (J/K) — start fighting right here in the cell
    if (!cs.fighting && (input.wasPressed('KeyJ') || input.wasPressed('KeyK'))) {
      const dx = cs.playerX - cs.cellieX;
      const dy = cs.playerY - cs.cellieY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 20) {
        _startCellFight(cs, input.wasPressed('KeyK') ? 'hook' : 'jab');
      }
    }
  }

  // --- CELL FIGHT UPDATE (runs outside edit/move blocks) ---
  if (cs.fighting && cs.player && cs.enemy) {
    _updateCellFight(cs, dt);
  }

  // Q to quit back to menu
  if (input.wasPressed('KeyQ') || input.wasPressed('Escape')) {
    SFX.doorSlam();
    _startTransition(() => {
      gameState = 'menu';
      menuScreen.style.display = 'flex';
      livingCell = null;
      cellPreviewState = null;
      SFX.startMenuAmbience();
    }, 350);
  }
}

function _drawCellPreview(ctx) {
  if (!livingCell || !cellPreviewState) return;
  const cs = cellPreviewState;
  const fw = SM().FRAME_W, fh = SM().FRAME_H;

  // Build character list for Y-sorted drawing with furniture
  let characters = [];
  if (!cs.editMode) {
    if (cs.fighting && cs.player && cs.enemy) {
      // During fight — use Fighter state for sprite selection
      for (const f of cs.fighters) {
        const info = _getFighterSpriteInfo(f, fw, fh);
        characters.push({
          x: f.x / livingCell.scale,
          y: f.y / livingCell.scale,
          sheet: info.sheet, fw: fw, fh: fh,
          frame: info.frame, flip: f.facing < 0,
          fighter: f // pass fighter ref for special draw effects
        });
      }
    } else {
      // Peaceful mode — simple idle animations
      characters = [
        {
          x: cs.cellieX, y: cs.cellieY,
          sheet: assets[cs.cellieDef.idle] || assets[cs.cellieDef.walk],
          fw: fw, fh: fh, frame: cs.cellieFrame, flip: true
        },
        {
          x: cs.playerX, y: cs.playerY,
          sheet: assets[cs.charDef.idle] || assets[cs.charDef.walk],
          fw: fw, fh: fh, frame: cs.playerFrame, flip: cs.facingLeft
        },
      ];
    }
  }

  livingCell.draw(ctx, characters);

  // Draw fight HUD overlays
  if (cs.fighting && cs.player && cs.enemy) {
    livingCell.applyCamera(ctx);

    // Health bars above fighters (in world-space, under the cell camera transform)
    for (const f of cs.fighters) {
      const barW = 24;
      const barH = 2.5;
      const bx = f.x - barW / 2;
      const by = f.y - SM().FRAME_H * livingCell.scale * 0.9;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, by, barW, barH);
      const hpPct = clamp(f.health / f.maxHealth, 0, 1);
      ctx.fillStyle = hpPct > 0.5 ? '#4a4' : hpPct > 0.25 ? '#ca4' : '#c44';
      ctx.fillRect(bx, by, barW * hpPct, barH);
    }

    livingCell.restoreCamera(ctx);

    // Announcer (screen-space)
    cs.announcer.draw(ctx);

    // Fight over prompt
    if (cs.fightOver && (cs.fightOverTimer || 0) > 1500) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('R: Again  ·  Q: Menu', CANVAS_W / 2, CANVAS_H - 30);
    }
  }

  // --- DEBUG OVERLAY (D to toggle) ---
  if (input.wasPressed('Backquote')) cs.debugMode = !cs.debugMode; // ` key toggles debug
  if (cs.debugMode) {
    const sc = livingCell.scale;
    const zoom = livingCell.zoom;
    const offsetX = (CANVAS_W - livingCell.worldW * zoom) / 2;
    const offsetY = (CANVAS_H - livingCell.worldH * zoom) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(zoom, zoom);

    // Grid lines every 4 art pixels
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5 / zoom;
    for (let x = 0; x <= livingCell.artW; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x * sc, 0);
      ctx.lineTo(x * sc, livingCell.artH * sc);
      ctx.stroke();
    }
    for (let y = 0; y <= livingCell.artH; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y * sc);
      ctx.lineTo(livingCell.artW * sc, y * sc);
      ctx.stroke();
    }

    // Pixel labels every 8px
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `${Math.max(6, 8 / zoom)}px monospace`;
    ctx.textAlign = 'center';
    for (let x = 0; x <= livingCell.artW; x += 8) {
      ctx.fillText(x, x * sc, 6 / zoom);
    }
    ctx.textAlign = 'left';
    for (let y = 8; y <= livingCell.artH; y += 8) {
      ctx.fillText(y, 2 / zoom, y * sc + 3 / zoom);
    }

    // Floor bounds — green lines
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([4 / zoom, 2 / zoom]);
    // Back wall (top of floor)
    ctx.beginPath();
    ctx.moveTo(0, livingCell.floorBackY * sc);
    ctx.lineTo(livingCell.artW * sc, livingCell.floorBackY * sc);
    ctx.stroke();
    // Front (bottom of floor)
    ctx.beginPath();
    ctx.moveTo(0, livingCell.floorFrontY * sc);
    ctx.lineTo(livingCell.artW * sc, livingCell.floorFrontY * sc);
    ctx.stroke();
    // Left wall
    ctx.beginPath();
    ctx.moveTo(livingCell.floorLeftX * sc, 0);
    ctx.lineTo(livingCell.floorLeftX * sc, livingCell.artH * sc);
    ctx.stroke();
    // Right wall
    ctx.beginPath();
    ctx.moveTo(livingCell.floorRightX * sc, 0);
    ctx.lineTo(livingCell.floorRightX * sc, livingCell.artH * sc);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels on floor bounds
    ctx.fillStyle = '#0f0';
    ctx.font = `${Math.max(6, 8 / zoom)}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`backY=${livingCell.floorBackY}`, livingCell.artW * sc - 2 / zoom, livingCell.floorBackY * sc - 2 / zoom);
    ctx.fillText(`frontY=${livingCell.floorFrontY}`, livingCell.artW * sc - 2 / zoom, livingCell.floorFrontY * sc + 10 / zoom);

    // Toilet collision box — cyan rectangle
    const dbToilet = livingCell.furniture.toilet;
    if (dbToilet) {
      const tL = (dbToilet.left + 8) * sc;
      const tR = livingCell.floorRightX * sc;
      const tT = (dbToilet.top + 24) * sc;
      const tB = (dbToilet.top + dbToilet.sprH) * sc;
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([3 / zoom, 2 / zoom]);
      ctx.strokeRect(tL, tT, tR - tL, tB - tT);
      ctx.setLineDash([]);
      ctx.fillStyle = '#0ff';
      ctx.textAlign = 'left';
      ctx.fillText('TOILET COLLISION', tL + 2 / zoom, tT - 2 / zoom);
    }

    // Character foot positions — red dots + labels
    if (!cs.editMode) {
      // Player foot dot
      ctx.fillStyle = '#f00';
      ctx.beginPath();
      ctx.arc(cs.playerX * sc, cs.playerY * sc, 3 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f00';
      ctx.textAlign = 'left';
      ctx.fillText(`P(${Math.round(cs.playerX)},${Math.round(cs.playerY)})`, cs.playerX * sc + 4 / zoom, cs.playerY * sc + 2 / zoom);

      // Cellie foot dot
      ctx.fillStyle = '#f80';
      ctx.beginPath();
      ctx.arc(cs.cellieX * sc, cs.cellieY * sc, 3 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillText(`C(${Math.round(cs.cellieX)},${Math.round(cs.cellieY)})`, cs.cellieX * sc + 4 / zoom, cs.cellieY * sc + 2 / zoom);
    }

    ctx.restore();

    // Debug legend
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, CANVAS_H - 20, CANVAS_W, 20);
    ctx.fillStyle = '#0f0';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DEBUG: green=floor bounds  red/orange=feet  `: toggle off', CANVAS_W / 2, CANVAS_H - 6);
  }

  // --- EDITOR UI ---
  if (cs.editMode) {
    // Show selected item with highlight box
    const sc = livingCell.scale;
    const zoom = livingCell.zoom;
    const offsetX = (CANVAS_W - livingCell.worldW * zoom) / 2;
    const offsetY = (CANVAS_H - livingCell.worldH * zoom) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(zoom, zoom);

    // Draw highlight around selected furniture
    ctx.strokeStyle = '#ff0';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([3 / zoom, 3 / zoom]);
    const selItem = livingCell.furniture[cs.editTarget];
    if (selItem) {
      ctx.strokeRect(selItem.left * sc, selItem.top * sc, selItem.sprW * sc, selItem.sprH * sc);
    }
    ctx.setLineDash([]);
    ctx.restore();

    // Info panel
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, CANVAS_W, 50);
    ctx.fillStyle = '#ff0';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('EDITOR MODE', 10, 14);

    ctx.fillStyle = '#fff';
    const item = livingCell.furniture[cs.editTarget];
    const posText = item ? `${cs.editTarget.toUpperCase()}  left=${item.left} top=${item.top}  (bottom=${item.top + item.sprH})` : '';
    ctx.fillText(posText, 10, 30);

    ctx.fillStyle = '#8a8a6a';
    ctx.fillText('ARROWS: nudge  TAB: next item  P: print all  E: exit editor', 10, 44);
  } else {
    // Normal UI
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, CANVAS_H - 30, CANVAS_W, 30);
    ctx.fillStyle = '#8a7a5a';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    if (cs.fighting) {
      ctx.fillText('WASD: MOVE  ·  J: JAB  ·  K: HOOK  ·  L: BLOCK  ·  H: SHOVE', CANVAS_W / 2, CANVAS_H - 12);
    } else {
      ctx.fillText('WASD: MOVE  ·  J/K: PUNCH  ·  E: EDITOR  ·  Q: MENU', CANVAS_W / 2, CANVAS_H - 12);
    }
  }

  // Vignette (skip in editor mode for clarity)
  if (!cs.editMode) {
    const vig = ctx.createRadialGradient(CANVAS_W/2, CANVAS_H/2, CANVAS_W*0.2, CANVAS_W/2, CANVAS_H/2, CANVAS_W*0.6);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
}

// ============================================================
// INITIALIZATION
// ============================================================
async function init() {
  input.init();
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('keydown', handleMenuKeys);
  // Start menu ambience on first click too
  document.addEventListener('click', _ensureMenuAmbience, { once: false });
  updateMenuHighlight();

  // Load menu background (independent of sprite mode)
  _loadMenuBackground();

  // Show loading state
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#5a4a3a';
  ctx.font = '12px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LOADING...', CANVAS_W / 2, CANVAS_H / 2);

  await loadAssets();

  running = true;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

init();
