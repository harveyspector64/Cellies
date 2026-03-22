// YARD — UI, HUD & Announcer

// FLOATING DAMAGE NUMBERS — Phase 4
// ============================================================
class DamageNumberSystem {
  constructor() {
    this.numbers = [];
  }

  add(x, y, amount, isBlocked = false, isCrit = false, customText = null) {
    this.numbers.push({
      x, y,
      vy: -1.5 - Math.random() * 0.5,
      vx: randRange(-0.3, 0.3),
      text: customText || Math.round(amount).toString(),
      life: 800,
      maxLife: 800,
      isBlocked,
      isCrit,
      isCustom: !!customText,
      scale: isCrit ? 1.3 : (customText ? 1.1 : 1)
    });
  }

  update(dt) {
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.life -= dt;
      n.x += n.vx;
      n.y += n.vy;
      n.vy *= 0.97;
      if (n.life <= 0) {
        this.numbers.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const n of this.numbers) {
      const alpha = clamp(n.life / (n.maxLife * 0.5), 0, 1);
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';

      const sz = Math.floor(6 * n.scale);
      ctx.font = `${sz}px "Press Start 2P", monospace`;

      // Shadow
      ctx.fillStyle = '#000000';
      ctx.fillText(n.text, n.x + 1, n.y + 1);

      // Color based on type
      if (n.isCustom) {
        ctx.fillStyle = '#44ddff'; // cyan for slip/counter text
      } else if (n.isBlocked) {
        ctx.fillStyle = '#8888aa';
      } else if (n.isCrit) {
        ctx.fillStyle = '#ff4444';
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillText(n.text, n.x, n.y);
      ctx.globalAlpha = 1;
    }
  }
}

// HUD DRAWING
// ============================================================
function drawHUD(ctx, mode) {
  if (mode === '1v1' || mode === 'cell') {
    draw1v1HUD(ctx);
  } else if (mode === 'custom' && game && game.fighters.length === 2) {
    draw1v1HUD(ctx);
  } else if (mode === 'custom') {
    drawCustomHUD(ctx);
  } else {
    drawRiotHUD(ctx);
  }
}

function draw1v1HUD(ctx) {
  if (!game || !game.player || !game.fighters[1]) return;
  const p = game.player;
  const e = game.fighters.find(f => f !== p);
  if (!e) return;

  // Dark header bar
  ctx.fillStyle = 'rgba(10,8,5,0.85)';
  ctx.fillRect(0, 0, CANVAS_W, 58);
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(0, 58, CANVAS_W, 2);

  const barW = 320;
  const barH = 14;
  const barY = 18;

  // Player health (left, fills right to left)
  const pPct = p.health / p.maxHealth;
  const pBarX = CANVAS_W / 2 - barW - 30;
  // BG
  ctx.fillStyle = '#1a1111';
  ctx.fillRect(pBarX, barY, barW, barH);
  // Health
  const pColor = pPct > 0.5 ? '#44aa44' : pPct > 0.25 ? '#ccaa22' : '#cc2222';
  ctx.fillStyle = pColor;
  ctx.fillRect(pBarX + barW * (1 - pPct), barY, barW * pPct, barH);
  // Border
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 1;
  ctx.strokeRect(pBarX, barY, barW, barH);
  // Name
  ctx.fillStyle = '#c4943a';
  ctx.font = '9px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(p.name || 'PLAYER', pBarX, barY - 3);

  // Enemy health (right, fills left to right)
  const ePct = e.health / e.maxHealth;
  const eBarX = CANVAS_W / 2 + 30;
  ctx.fillStyle = '#1a1111';
  ctx.fillRect(eBarX, barY, barW, barH);
  const eColor = ePct > 0.5 ? '#44aa44' : ePct > 0.25 ? '#ccaa22' : '#cc2222';
  ctx.fillStyle = eColor;
  ctx.fillRect(eBarX, barY, barW * ePct, barH);
  ctx.strokeStyle = '#3a2a1a';
  ctx.strokeRect(eBarX, barY, barW, barH);
  ctx.fillStyle = '#c4943a';
  ctx.textAlign = 'right';
  ctx.fillText(e.name || 'OPPONENT', eBarX + barW, barY - 3);

  // VS
  ctx.fillStyle = '#5a4a3a';
  ctx.textAlign = 'center';
  ctx.font = '11px "Press Start 2P", monospace';
  ctx.fillText('VS', CANVAS_W / 2, barY + 12);

  // Gang colors under bars
  const pGC = GANG_COLORS[p.gangId];
  const eGC = GANG_COLORS[e.gangId];
  if (pGC) {
    ctx.fillStyle = pGC.primary;
    ctx.fillRect(pBarX, barY + barH + 2, barW, 2);
  }
  if (eGC) {
    ctx.fillStyle = eGC.primary;
    ctx.fillRect(eBarX, barY + barH + 2, barW, 2);
  }

  // Phase 2: Stamina bars (thin, below health)
  const stBarH = 5;
  const stBarY = barY + barH + 6;
  // Player stamina
  const pStPct = p.stamina / p.maxStamina;
  ctx.fillStyle = '#1a1111';
  ctx.fillRect(pBarX, stBarY, barW, stBarH);
  ctx.fillStyle = pStPct > 0.3 ? '#c4943a' : '#cc4422';
  ctx.fillRect(pBarX + barW * (1 - pStPct), stBarY, barW * pStPct, stBarH);
  ctx.strokeStyle = '#2a1a0a';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(pBarX, stBarY, barW, stBarH);
  // Enemy stamina
  const eStPct = e.stamina / e.maxStamina;
  ctx.fillStyle = '#1a1111';
  ctx.fillRect(eBarX, stBarY, barW, stBarH);
  ctx.fillStyle = eStPct > 0.3 ? '#c4943a' : '#cc4422';
  ctx.fillRect(eBarX, stBarY, barW * eStPct, stBarH);
  ctx.strokeStyle = '#2a1a0a';
  ctx.strokeRect(eBarX, stBarY, barW, stBarH);

  // Combo counter
  if (p.comboCount > 1) {
    ctx.fillStyle = '#ffd080';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.globalAlpha = clamp(p.comboTimer / 300, 0, 1);
    ctx.fillText(`${p.comboCount} HIT`, 20, 90);
    ctx.globalAlpha = 1;
  }

  // Batch 5: Heat indicator — small bar under stamina that fills orange→red
  if (p.heat > 0) {
    const heatBarH = 3;
    const heatBarY = stBarY + stBarH + 3;
    const heatPct = p.heat / HEAT_MAX;
    ctx.fillStyle = '#1a1111';
    ctx.fillRect(pBarX, heatBarY, barW, heatBarH);
    const pulse = p.heat > 70 ? (0.8 + Math.sin(Date.now() * 0.008) * 0.2) : 1;
    ctx.fillStyle = p.heat > 70 ? '#ff4400' : p.heat > 40 ? '#ff8800' : '#cc6600';
    ctx.globalAlpha = pulse;
    ctx.fillRect(pBarX + barW * (1 - heatPct), heatBarY, barW * heatPct, heatBarH);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#2a1a0a';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(pBarX, heatBarY, barW, heatBarH);
  }

  // Batch 5: Stamina pulse when low
  if (pStPct < 0.25 && pStPct > 0) {
    const stPulse = 0.3 + Math.sin(Date.now() * 0.01) * 0.3;
    ctx.globalAlpha = stPulse;
    ctx.fillStyle = '#ff2200';
    ctx.fillRect(pBarX + barW * (1 - pStPct), stBarY, barW * pStPct, stBarH);
    ctx.globalAlpha = 1;
  }

  // Batch 1: Clinch HUD
  if (p.inClinch) {
    ctx.fillStyle = 'rgba(10,8,5,0.8)';
    ctx.fillRect(CANVAS_W / 2 - 100, CANVAS_H - 50, 200, 30);
    ctx.fillStyle = '#ffaa44';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('J:GUT SHOT  K:SHOVE  L:BREAK', CANVAS_W / 2, CANVAS_H - 32);
  }

  // Batch 1: Knockdown count display
  if (p.knockdownCount > 0 || e.knockdownCount > 0) {
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cc4422';
    if (p.knockdownCount > 0) ctx.fillText(`KD: ${p.knockdownCount}/${MAX_KNOCKDOWNS}`, 20, 75);
    ctx.textAlign = 'right';
    if (e.knockdownCount > 0) ctx.fillText(`KD: ${e.knockdownCount}/${MAX_KNOCKDOWNS}`, CANVAS_W - 20, 75);
  }
}

function drawCustomHUD(ctx) {
  if (!game || !game.player) return;
  const p = game.player;

  // Top bar
  ctx.fillStyle = 'rgba(10,8,5,0.85)';
  ctx.fillRect(0, 0, CANVAS_W, 52);
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(0, 52, CANVAS_W, 2);

  // Player health bar (left side)
  const barW = 240;
  const barH = 12;
  const barY = 12;
  const pPct = p.health / p.maxHealth;
  const pBarX = 20;

  ctx.fillStyle = '#1a1111';
  ctx.fillRect(pBarX, barY, barW, barH);
  const pColor = pPct > 0.5 ? '#44aa44' : pPct > 0.25 ? '#ccaa22' : '#cc2222';
  ctx.fillStyle = pColor;
  ctx.fillRect(pBarX, barY, barW * pPct, barH);
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 1;
  ctx.strokeRect(pBarX, barY, barW, barH);

  // Player name
  ctx.fillStyle = '#c4943a';
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(p.name || 'YOU', pBarX, barY - 2);

  // Stamina
  const stBarH = 4;
  const stBarY = barY + barH + 3;
  const stPct = p.stamina / p.maxStamina;
  ctx.fillStyle = '#1a1111';
  ctx.fillRect(pBarX, stBarY, barW, stBarH);
  ctx.fillStyle = stPct > 0.3 ? '#c4943a' : '#cc4422';
  ctx.fillRect(pBarX, stBarY, barW * stPct, stBarH);

  // Team status — right side
  const allGangs = {};
  for (const f of game.fighters) {
    if (!allGangs[f.gangId]) allGangs[f.gangId] = { alive: 0, total: 0 };
    allGangs[f.gangId].total++;
    if (f.alive) allGangs[f.gangId].alive++;
  }

  let rx = CANVAS_W - 20;
  ctx.font = '6px "Press Start 2P", monospace';
  ctx.textAlign = 'right';

  for (const gangId of Object.keys(allGangs)) {
    const gc = GANG_COLORS[gangId];
    if (!gc) continue;
    const info = allGangs[gangId];
    const isPlayer = gangId === game.playerGang;

    ctx.fillStyle = isPlayer ? gc.light : (info.alive > 0 ? gc.primary : '#4a4a4a');
    ctx.fillText(`${gc.name}: ${info.alive}/${info.total}`, rx, 16);
    rx -= 0; // stack vertically instead
    // Actually let's stack them
  }

  // Redo: stack gang statuses vertically on right
  let gy = 10;
  ctx.textAlign = 'right';
  for (const gangId of Object.keys(allGangs)) {
    const gc = GANG_COLORS[gangId];
    if (!gc) continue;
    const info = allGangs[gangId];
    const isPlayer = gangId === game.playerGang;
    ctx.fillStyle = info.alive > 0 ? gc.primary : '#4a4a4a';
    const label = isPlayer ? `▶ ${gc.name}` : gc.name;
    ctx.fillText(`${label}: ${info.alive}/${info.total}`, CANVAS_W - 15, gy);
    gy += 12;
  }

  // Heat bar
  if (p.heat > 0) {
    const heatBarH = 3;
    const heatBarY = stBarY + stBarH + 2;
    const heatPct = p.heat / HEAT_MAX;
    ctx.fillStyle = '#1a1111';
    ctx.fillRect(pBarX, heatBarY, barW, heatBarH);
    ctx.fillStyle = p.heat > 70 ? '#ff4400' : p.heat > 40 ? '#ff8800' : '#cc6600';
    ctx.fillRect(pBarX, heatBarY, barW * heatPct, heatBarH);
  }

  // Combo counter
  if (p.comboCount > 1) {
    ctx.fillStyle = '#ffd080';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.globalAlpha = clamp(p.comboTimer / 300, 0, 1);
    ctx.fillText(`${p.comboCount} HIT`, 20, 70);
    ctx.globalAlpha = 1;
  }
}

function drawRiotHUD(ctx) {
  if (!game || !game.gangs) return;

  // Top bar
  ctx.fillStyle = 'rgba(10,8,5,0.85)';
  ctx.fillRect(0, 0, CANVAS_W, 42);

  // Phase 3: Riot phase indicator
  const phaseLabels = {
    'calm': 'YARD TIME', 'tension': 'TENSIONS RISING',
    'eruption': 'RIOT', 'chaos': 'CHAOS', 'aftermath': 'AFTERMATH'
  };
  const phaseColors = {
    'calm': '#6a6a5a', 'tension': '#aa8844', 'eruption': '#cc4422',
    'chaos': '#ff2222', 'aftermath': '#888888'
  };
  ctx.fillStyle = phaseColors[game.riotPhase] || '#6a6a5a';
  ctx.font = '6px "Press Start 2P", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(phaseLabels[game.riotPhase] || '', CANVAS_W - 10, 12);

  // Batch 2: Guard alarm countdown
  if (game.guardAlarmActive && !game.guardRecallActive) {
    const timeLeft = Math.max(0, game.guardAlarmDuration - game.guardAlarmTimer);
    const secs = Math.ceil(timeLeft / 1000);
    const isUrgent = timeLeft <= GUARD_WARNING_TIME;
    ctx.fillStyle = isUrgent ? '#ff4444' : '#aa8855';
    ctx.font = isUrgent ? '8px "Press Start 2P", monospace' : '6px "Press Start 2P", monospace';
    ctx.textAlign = 'right';
    const blink = isUrgent ? (Math.sin(Date.now() * 0.01) > 0 ? 1 : 0.3) : 1;
    ctx.globalAlpha = blink;
    ctx.fillText(`GUARDS: ${secs}s`, CANVAS_W - 10, 24);
    ctx.globalAlpha = 1;
  }
  if (game.guardRecallActive) {
    ctx.fillStyle = '#ff2222';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'right';
    const blink = Math.sin(Date.now() * 0.015) > 0 ? 1 : 0.4;
    ctx.globalAlpha = blink;
    ctx.fillText('YARD DOWN!', CANVAS_W - 10, 24);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(0, 42, CANVAS_W, 2);

  // Gang morale bars
  const barW = 160;
  const barH = 8;
  let bx = 20;
  const by = 10;

  for (const gang of game.gangs) {
    const gc = GANG_COLORS[gang.id];
    if (!gc) continue;

    // Gang name
    ctx.fillStyle = gc.light;
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${gc.name} (${gang.aliveCount}/${gang.members.length})`, bx, by);

    // Morale bar
    const moralePct = gang.morale / 100;
    ctx.fillStyle = '#1a1111';
    ctx.fillRect(bx, by + 4, barW, barH);
    ctx.fillStyle = gc.primary;
    ctx.fillRect(bx, by + 4, barW * moralePct, barH);
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by + 4, barW, barH);

    // State indicator
    const stateColor = gang.state === GANG_STATES.RETREATING ? '#cc4422' :
                        gang.state === GANG_STATES.RALLYING ? '#44aacc' :
                        gang.state === GANG_STATES.FIGHTING ? '#ccaa22' : '#6a5a4a';
    ctx.fillStyle = stateColor;
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.fillText(gang.state.toUpperCase(), bx, by + 20);

    // Phase 3: Broken member count
    const brokenCount = gang.members.filter(m => m.alive && m.broken).length;
    if (brokenCount > 0) {
      ctx.fillStyle = '#cc4422';
      ctx.fillText(`${brokenCount} SHOOK`, bx + 50, by + 20);
    }

    bx += barW + 40;
  }

  // Player health
  if (game.player) {
    const p = game.player;
    const pBarW = 200;
    const pBarH = 10;
    const px = CANVAS_W / 2 - pBarW / 2;
    const py = CANVAS_H - 30;
    const pPct = p.health / p.maxHealth;

    ctx.fillStyle = 'rgba(10,8,5,0.8)';
    ctx.fillRect(px - 10, py - 14, pBarW + 20, 36);

    ctx.fillStyle = '#c4943a';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(p.name || 'YOU', CANVAS_W / 2, py - 4);

    ctx.fillStyle = '#1a1111';
    ctx.fillRect(px, py, pBarW, pBarH);
    const hColor = pPct > 0.5 ? '#44aa44' : pPct > 0.25 ? '#ccaa22' : '#cc2222';
    ctx.fillStyle = hColor;
    ctx.fillRect(px, py, pBarW * pPct, pBarH);
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, pBarW, pBarH);

    // Phase 2: Stamina bar under health
    const stY = py + pBarH + 3;
    const stH = 4;
    const stPct = p.stamina / p.maxStamina;
    ctx.fillStyle = '#1a1111';
    ctx.fillRect(px, stY, pBarW, stH);
    ctx.fillStyle = stPct > 0.3 ? '#c4943a' : '#cc4422';
    ctx.fillRect(px, stY, pBarW * stPct, stH);
    ctx.strokeStyle = '#2a1a0a';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(px, stY, pBarW, stH);
  }
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================
class Announcer {
  constructor() {
    this.text = '';
    this.subtext = '';
    this.timer = 0;
    this.duration = 0;
    this.fadeIn = 200;
    this.hold = 1000;
    this.fadeOut = 400;
  }

  show(text, subtext = '', duration = 2000) {
    this.text = text;
    this.subtext = subtext;
    this.timer = 0;
    this.duration = duration;
  }

  update(dt) {
    if (this.duration <= 0) return;
    this.timer += dt;
    if (this.timer >= this.duration) this.duration = 0;
  }

  draw(ctx) {
    if (this.duration <= 0) return;
    let alpha = 1;
    if (this.timer < this.fadeIn) {
      alpha = this.timer / this.fadeIn;
    } else if (this.timer > this.duration - this.fadeOut) {
      alpha = (this.duration - this.timer) / this.fadeOut;
    }
    alpha = clamp(alpha, 0, 1);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Main text
    ctx.fillStyle = '#c4943a';
    ctx.font = '32px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text shadow
    ctx.fillStyle = '#1a0a00';
    ctx.fillText(this.text, CANVAS_W / 2 + 2, CANVAS_H / 2 + 2);
    ctx.fillStyle = '#c4943a';
    ctx.fillText(this.text, CANVAS_W / 2, CANVAS_H / 2);

    // Subtext
    if (this.subtext) {
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#8a7a5a';
      ctx.fillText(this.subtext, CANVAS_W / 2, CANVAS_H / 2 + 30);
    }

    ctx.restore();
  }
}
