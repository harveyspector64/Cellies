// YARD — Tournament System

const TOURNAMENT_SIZE = 8; // 8-fighter single elimination bracket

class Tournament {
  constructor(playerGang) {
    this.playerGang = playerGang;
    this.round = 0; // 0=quarter, 1=semi, 2=final
    this.roundNames = ['QUARTERFINALS', 'SEMIFINALS', 'THE FINAL'];
    this.bracket = [];      // array of { name, gang, traits, alive, seed }
    this.matchups = [];     // current round matchups [{a, b, winner}]
    this.allResults = [];   // history of all rounds
    this.currentMatch = -1; // index into matchups for current fight
    this.playerSeed = -1;
    this.phase = 'bracket'; // bracket → fighting → result → bracket → ... → champion
    this.resultTimer = 0;
    this.championCelebTimer = 0;
    this.playerInjuries = 0; // carry over injuries
    this.playerHealth = 1;   // health % carried over (0-1)

    this._generateBracket();
  }

  _generateBracket() {
    const gangs = Object.keys(GANG_COLORS);

    // Create 8 fighters — player is one of them
    for (let i = 0; i < TOURNAMENT_SIZE; i++) {
      const isPlayer = i === 0;
      const gang = isPlayer ? this.playerGang : gangs[Math.floor(Math.random() * gangs.length)];

      // Difficulty scaling — later seeds are tougher (player will face them later)
      const baseStat = 0.35 + (i / TOURNAMENT_SIZE) * 0.25;
      const traits = isPlayer ? {
        aggression: playerTraits.aggression,
        toughness: playerTraits.toughness,
        speed: playerTraits.speed,
        power: playerTraits.power
      } : {
        aggression: baseStat + Math.random() * 0.35,
        toughness: baseStat + Math.random() * 0.3,
        speed: baseStat + Math.random() * 0.3,
        power: baseStat + Math.random() * 0.3
      };

      this.bracket.push({
        name: isPlayer ? (randomName()) : randomName(),
        gang,
        traits,
        alive: true,
        seed: i,
        isPlayer,
        wins: 0,
        totalDamage: 0,
        knockdowns: 0,
        personality: null // will be derived when Fighter is created
      });
    }

    this.playerSeed = 0;

    // Shuffle bracket for random matchups (keep player in the mix)
    for (let i = this.bracket.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bracket[i], this.bracket[j]] = [this.bracket[j], this.bracket[i]];
    }
    // Find player's new position
    this.playerSeed = this.bracket.findIndex(b => b.isPlayer);

    this._generateMatchups();
  }

  _generateMatchups() {
    this.matchups = [];
    const alive = this.bracket.filter(b => b.alive);
    for (let i = 0; i < alive.length; i += 2) {
      if (i + 1 < alive.length) {
        this.matchups.push({
          a: alive[i],
          b: alive[i + 1],
          winner: null,
          fought: false
        });
      }
    }
    this.currentMatch = -1;
  }

  getPlayerMatch() {
    return this.matchups.find(m =>
      (m.a.isPlayer || m.b.isPlayer) && !m.fought
    );
  }

  getNextAIMatch() {
    return this.matchups.find(m =>
      !m.a.isPlayer && !m.b.isPlayer && !m.fought
    );
  }

  // Simulate an AI vs AI fight (instant result)
  simulateMatch(match) {
    const a = match.a;
    const b = match.b;

    // Simple stat comparison with randomness
    const aPower = (a.traits.aggression + a.traits.power + a.traits.speed + a.traits.toughness) / 4;
    const bPower = (b.traits.aggression + b.traits.power + b.traits.speed + b.traits.toughness) / 4;

    const aRoll = aPower + Math.random() * 0.4;
    const bRoll = bPower + Math.random() * 0.4;

    if (aRoll >= bRoll) {
      match.winner = a;
      b.alive = false;
      a.wins++;
      a.totalDamage += Math.round(40 + Math.random() * 60);
    } else {
      match.winner = b;
      a.alive = false;
      b.wins++;
      b.totalDamage += Math.round(40 + Math.random() * 60);
    }
    match.fought = true;
  }

  // Called after a player fight ends
  recordPlayerResult(playerWon, playerFighter, opponentFighter) {
    const match = this.getPlayerMatch() || this.matchups.find(m =>
      (m.a.isPlayer || m.b.isPlayer)
    );
    if (!match) return;

    const playerEntry = match.a.isPlayer ? match.a : match.b;
    const oppEntry = match.a.isPlayer ? match.b : match.a;

    if (playerWon) {
      match.winner = playerEntry;
      oppEntry.alive = false;
      playerEntry.wins++;
      playerEntry.totalDamage += Math.round(playerFighter.damageDealt);
      playerEntry.knockdowns += playerFighter.knockdowns;
      // Carry over health/injuries (partial recovery between fights)
      this.playerHealth = Math.min(1, (playerFighter.health / playerFighter.maxHealth) + 0.25);
      this.playerInjuries = Math.max(0, playerFighter.injuries - 10);
    } else {
      match.winner = oppEntry;
      playerEntry.alive = false;
      oppEntry.wins++;
    }
    match.fought = true;
  }

  advanceRound() {
    // Save results
    this.allResults.push([...this.matchups]);

    // Check for champion
    const alive = this.bracket.filter(b => b.alive);
    if (alive.length <= 1) {
      this.phase = 'champion';
      return;
    }

    this.round++;
    this._generateMatchups();
    this.phase = 'bracket';
  }

  isPlayerAlive() {
    return this.bracket.find(b => b.isPlayer)?.alive ?? false;
  }

  getChampion() {
    return this.bracket.find(b => b.alive);
  }

  allMatchesDone() {
    return this.matchups.every(m => m.fought);
  }
}

// ============================================================
// TOURNAMENT DRAWING (called from game loop when in tournament mode)
// ============================================================
function drawTournamentBracket(ctx, tournament) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Background — dark concrete
  ctx.fillStyle = '#0c0b09';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle concrete texture noise
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 80; i++) {
    const nx = (Math.sin(i * 127.1) * 0.5 + 0.5) * CANVAS_W;
    const ny = (Math.cos(i * 311.7) * 0.5 + 0.5) * CANVAS_H;
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#8a7a5a';
    ctx.fillRect(nx, ny, 2 + (i % 3), 1);
  }
  ctx.globalAlpha = 1;

  const cx = CANVAS_W / 2;

  if (tournament.phase === 'champion') {
    const champ = tournament.getChampion();
    const isPlayer = champ && champ.isPlayer;

    // Champion celebration
    tournament.championCelebTimer += 16;
    const pulse = 0.7 + Math.sin(tournament.championCelebTimer * 0.004) * 0.3;

    // Top line
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(cx - 200, 25, 400, 1);

    ctx.globalAlpha = pulse;
    ctx.fillStyle = isPlayer ? '#ffd080' : '#cc4422';
    ctx.font = '24px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(isPlayer ? 'YARD CHAMPION' : 'ELIMINATED', cx, 58);
    ctx.globalAlpha = 1;

    if (champ) {
      const gc = GANG_COLORS[champ.gang];
      ctx.fillStyle = gc ? gc.light : '#c4943a';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillText(champ.name, cx, 85);

      ctx.fillStyle = '#6a5a4a';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText(`${gc ? gc.name : ''} · ${champ.wins} wins · ${champ.totalDamage} total damage`, cx, 105);
    }

    // Divider
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(cx - 200, 115, 400, 1);

    // Draw final bracket state
    _drawBracketLines(ctx, tournament, 135);

    ctx.fillStyle = '#5a4a3a';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('R: RUN IT BACK    Q: MENU', cx, CANVAS_H - 25);

    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let y = 0; y < CANVAS_H; y += 3) {
      ctx.fillRect(0, y, CANVAS_W, 1);
    }
    return;
  }

  // Header — YARD TOURNAMENT
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(cx - 200, 8, 400, 1);

  ctx.fillStyle = '#6a5a4a';
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('YARD TOURNAMENT', cx, 22);

  // Round title — big and bold
  ctx.fillStyle = '#c4943a';
  ctx.font = '16px "Press Start 2P", monospace';
  ctx.fillText(tournament.roundNames[tournament.round] || `ROUND ${tournament.round + 1}`, cx, 45);

  // Divider
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(cx - 200, 52, 400, 1);

  // Player health carry-over indicator (if not first round)
  if (tournament.round > 0 && tournament.isPlayerAlive()) {
    const healthPct = Math.round(tournament.playerHealth * 100);
    ctx.fillStyle = healthPct > 60 ? '#5a8a4a' : healthPct > 30 ? '#8a7a3a' : '#8a3a2a';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillText(`YOUR CONDITION: ${healthPct}%`, cx, 65);
  }

  // Bracket display
  _drawBracketLines(ctx, tournament, 75);

  // Instructions — bigger, clearer
  const allDone = tournament.allMatchesDone();
  const playerMatch = tournament.getPlayerMatch();

  ctx.font = '8px "Press Start 2P", monospace';
  ctx.textAlign = 'center';

  if (playerMatch && !playerMatch.fought) {
    ctx.fillStyle = '#ffd080';
    ctx.fillText('ENTER: STEP UP    Q: WALK AWAY', cx, CANVAS_H - 25);
  } else if (!allDone) {
    const aiLeft = tournament.matchups.filter(m => !m.fought).length;
    ctx.fillStyle = '#8a7a5a';
    ctx.fillText(`ENTER: RESOLVE FIGHT${aiLeft > 1 ? 'S' : ''}    Q: MENU`, cx, CANVAS_H - 25);
  } else {
    ctx.fillStyle = '#ffd080';
    ctx.fillText('ENTER: NEXT ROUND    Q: MENU', cx, CANVAS_H - 25);
  }

  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  for (let y = 0; y < CANVAS_H; y += 3) {
    ctx.fillRect(0, y, CANVAS_W, 1);
  }
}

function _drawBracketLines(ctx, tournament, startY) {
  const cx = CANVAS_W / 2;
  const results = tournament.allResults;

  let y = startY;

  // Quarterfinals (round 0)
  const qfMatchups = results[0] || (tournament.round === 0 ? tournament.matchups : []);
  if (qfMatchups.length > 0) {
    ctx.fillStyle = '#4a3a2a';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('QUARTERFINALS', cx, y);
    y += 16;
    _drawMatchupRow(ctx, qfMatchups, y, tournament);
    y += qfMatchups.length * 28 + 12;
  }

  // Semifinals (round 1)
  const sfMatchups = results[1] || (tournament.round === 1 ? tournament.matchups : []);
  if (sfMatchups.length > 0 || tournament.round >= 1) {
    ctx.fillStyle = '#5a4a2a';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SEMIFINALS', cx, y);
    y += 16;
    if (sfMatchups.length > 0) {
      _drawMatchupRow(ctx, sfMatchups, y, tournament);
      y += sfMatchups.length * 28 + 12;
    }
  }

  // Final (round 2)
  const fMatchups = results[2] || (tournament.round === 2 ? tournament.matchups : []);
  if (fMatchups.length > 0 || tournament.round >= 2) {
    ctx.fillStyle = '#7a5a2a';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('THE FINAL', cx, y);
    y += 16;
    if (fMatchups.length > 0) {
      _drawMatchupRow(ctx, fMatchups, y, tournament);
    }
  }
}

function _drawMatchupRow(ctx, matchups, startY, tournament) {
  const cx = CANVAS_W / 2;
  let y = startY;

  for (const match of matchups) {
    const a = match.a;
    const b = match.b;
    const isPlayerMatch = a.isPlayer || b.isPlayer;

    // Background highlight for player's match
    if (isPlayerMatch && !match.fought) {
      ctx.fillStyle = 'rgba(196,148,58,0.1)';
      ctx.fillRect(cx - 260, y - 8, 520, 24);
      // Border lines
      ctx.fillStyle = 'rgba(196,148,58,0.15)';
      ctx.fillRect(cx - 260, y - 8, 520, 1);
      ctx.fillRect(cx - 260, y + 15, 520, 1);
    }

    // Won match highlight
    if (match.fought && isPlayerMatch) {
      const playerWon = (a.isPlayer && match.winner === a) || (b.isPlayer && match.winner === b);
      if (playerWon) {
        ctx.fillStyle = 'rgba(90,138,74,0.06)';
        ctx.fillRect(cx - 260, y - 8, 520, 24);
      }
    }

    // Fighter A
    const aGC = GANG_COLORS[a.gang];
    ctx.fillStyle = match.fought
      ? (match.winner === a ? '#c4943a' : '#3a3a3a')
      : (a.isPlayer ? '#e8c878' : (aGC ? aGC.primary : '#8a7a5a'));
    ctx.font = `${a.isPlayer ? '9' : '8'}px "Press Start 2P", monospace`;
    ctx.textAlign = 'right';
    const aPrefix = a.isPlayer ? '▶ ' : '';
    ctx.fillText(`${aPrefix}${a.name}`, cx - 25, y + 5);

    // VS / result
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    if (match.fought) {
      ctx.fillStyle = '#6a5a3a';
      ctx.fillText(match.winner === a ? '◀ W' : 'W ▶', cx, y + 5);
    } else {
      ctx.fillStyle = '#3a3a3a';
      ctx.fillText('VS', cx, y + 5);
    }

    // Fighter B
    const bGC = GANG_COLORS[b.gang];
    ctx.fillStyle = match.fought
      ? (match.winner === b ? '#c4943a' : '#3a3a3a')
      : (b.isPlayer ? '#e8c878' : (bGC ? bGC.primary : '#8a7a5a'));
    ctx.font = `${b.isPlayer ? '9' : '8'}px "Press Start 2P", monospace`;
    ctx.textAlign = 'left';
    const bPrefix = b.isPlayer ? '▶ ' : '';
    ctx.fillText(`${bPrefix}${b.name}`, cx + 25, y + 5);

    // Gang color dots — larger
    if (aGC) {
      ctx.fillStyle = match.fought && match.winner !== a ? '#2a2a2a' : aGC.primary;
      ctx.fillRect(cx - 240, y - 2, 8, 8);
    }
    if (bGC) {
      ctx.fillStyle = match.fought && match.winner !== b ? '#2a2a2a' : bGC.primary;
      ctx.fillRect(cx + 232, y - 2, 8, 8);
    }

    y += 26;
  }
}
