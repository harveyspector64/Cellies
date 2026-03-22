// YARD — Game Lifecycle & Initialization
// ============================================================
// GAME LIFECYCLE
// ============================================================
let lastTime = 0;
let running = false;

// Tournament state
let tournament = null;
let tournamentFightDone = false; // flag: the current fight ended, need to record result

function gameLoop(timestamp) {
  if (!running) return;
  const dt = Math.min(timestamp - lastTime, 50); // cap at 50ms
  lastTime = timestamp;

  if (gameState === 'playing' && game) {
    game.update(dt);

    // Tournament fight: override announcer text and handle return to bracket
    if (tournament && game.gameOver && !tournamentFightDone) {
      tournamentFightDone = true;
      const player = game.fighters.find(f => f.isPlayer);
      const playerWon = player && player.alive && player.state !== STATES.KO;
      if (playerWon) {
        game.announcer.show('ADVANCING', 'ENTER: Continue', 999999);
      } else {
        game.announcer.show('ELIMINATED', 'ENTER: See Results', 999999);
      }
    }

    // Global input — pause
    if (input.wasPressed('Escape') && !game.gameOver) {
      gameState = 'paused';
      pauseOverlay.style.display = 'flex';
    }
    // Restart (not in tournament — no do-overs)
    if (input.wasPressed('KeyR') && !tournament) {
      restartGame();
    }
    // Tournament: Enter or Q to leave fight when game over
    if (tournament && game.gameOver && game.gameOverTimer > 1500) {
      if (input.wasPressed('Enter') || input.wasPressed('Space') || input.wasPressed('KeyQ')) {
        _tournamentFightEnded();
      }
    }
    // Normal: Q to quit
    if (!tournament && input.wasPressed('KeyQ') && game.gameOver) {
      quitToMenu();
    }
  }

  // Pause menu keyboard controls
  if (gameState === 'paused') {
    if (input.wasPressed('Escape')) {
      resumeGame();
    }
    if (input.wasPressed('Enter') || input.wasPressed('KeyQ')) {
      if (tournament) {
        // In tournament, quitting a fight = forfeit
        pauseOverlay.style.display = 'none';
        gameState = 'playing';
        // Force player KO to trigger elimination
        if (game && game.player && game.player.alive) {
          game.player.health = 0;
          game.player.alive = false;
          game.player.setState(STATES.KO);
        }
      } else {
        quitToMenu();
      }
    }
  }

  // Tournament bracket screen
  if (gameState === 'tournament' && tournament) {
    _updateTournament(dt);
    // Guard: _updateTournament may have quit/nulled tournament mid-frame
    if (tournament) drawTournamentBracket(ctx, tournament);
  }

  if (gameState === 'playing' && game) {
    game.draw(ctx);
  }

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

function updateMenuHighlight() {
  const btns = document.querySelectorAll('#quickstart-section .menu-btn');
  btns.forEach((b, i) => {
    if (i === menuSelection) {
      b.style.borderColor = '#c4943a';
      b.style.color = '#ffd080';
      b.style.background = '#2a1a0a';
      b.style.transform = 'scale(1.02)';
    } else {
      b.style.borderColor = '#3a2a1a';
      b.style.color = '#c4943a';
      b.style.background = '#1a1208';
      b.style.transform = 'scale(1)';
    }
  });
}

function handleMenuKeys(e) {
  if (gameState !== 'menu') return;

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
  }
}

function startGame(mode) {
  SFX.init();
  SFX.resume();
  gameMode = mode;
  gameState = 'playing';
  menuScreen.style.display = 'none';
  hudEl.style.display = 'block';
  game = new Game(mode, selectedGang);
  SFX.startAmbience(mode);
}

function restartGame() {
  if (!gameMode) return;
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
  pauseOverlay.style.display = 'none';
}

function resumeGame() {
  gameState = 'playing';
  pauseOverlay.style.display = 'none';
}

function quitToMenu() {
  SFX.stopAmbience();
  gameState = 'menu';
  game = null;
  gameMode = null;
  tournament = null;
  menuScreen.style.display = 'flex';
  hudEl.style.display = 'none';
  pauseOverlay.style.display = 'none';
  updateMenuHighlight();
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
  gameMode = 'tournament';
  gameState = 'tournament';
  menuScreen.style.display = 'none';
  hudEl.style.display = 'none';
  game = null;
  tournament = new Tournament(selectedGang);
  tournamentFightDone = false;
  SFX.bell();
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
    opp.baseMoveSpeed = 1.2 + oppEntry.traits.speed * 0.8;
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

  // Record result in tournament bracket
  tournament.recordPlayerResult(playerWon, player, opp);

  // Clean up fight
  SFX.stopAmbience();
  game = null;
  hudEl.style.display = 'none';
  gameState = 'tournament';
  tournamentFightDone = false;

  // If player lost, show elimination on bracket then allow exit
  if (!playerWon) {
    // Let them see the bracket one more time, then advance to show who won the tournament
    // Simulate remaining matches in this round
    while (!tournament.allMatchesDone()) {
      const aiMatch = tournament.getNextAIMatch();
      if (aiMatch) {
        tournament.simulateMatch(aiMatch);
      } else {
        break;
      }
    }
    // Keep advancing until champion is decided
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
  updateMenuHighlight();

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
