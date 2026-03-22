// YARD — Utilities, Assets & Character Definitions

// ============================================================
// GLOBALS
// ============================================================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const menuScreen = document.getElementById('menu-screen');
const hudEl = document.getElementById('hud');
const pauseOverlay = document.getElementById('pause-overlay');

let selectedGang = 'surenos';
let gameMode = null;
let gameState = 'menu'; // menu, playing, paused, ko, riotEnd
let game = null;
const MAX_TRAIT_POINTS = 28;
let playerTraits = { aggression: 0.7, toughness: 0.7, speed: 0.7, power: 0.7 };

function updateTraits() {
  const rows = document.querySelectorAll('.trait-row');
  let total = 0;
  const vals = {};
  rows.forEach(row => {
    const slider = row.querySelector('.trait-slider');
    const valEl = row.querySelector('.trait-val');
    const trait = row.dataset.trait;
    const v = parseInt(slider.value);
    valEl.textContent = v;
    vals[trait] = v;
    total += v;
  });

  // Enforce point cap — if over, reduce last changed
  const pointsEl = document.getElementById('trait-points');
  if (total > MAX_TRAIT_POINTS) {
    pointsEl.style.color = '#cc4422';
    // Clamp the overflow by reducing this slider
    const diff = total - MAX_TRAIT_POINTS;
    const lastRow = event.target.closest('.trait-row');
    const lastSlider = lastRow.querySelector('.trait-slider');
    lastSlider.value = parseInt(lastSlider.value) - diff;
    const lastVal = lastRow.querySelector('.trait-val');
    lastVal.textContent = lastSlider.value;
    vals[lastRow.dataset.trait] = parseInt(lastSlider.value);
    total = MAX_TRAIT_POINTS;
  }
  pointsEl.textContent = `POINTS: ${total} / ${MAX_TRAIT_POINTS}`;
  pointsEl.style.color = total === MAX_TRAIT_POINTS ? '#6a8a4a' : '#8a7a5a';

  // Store normalized traits (0-1)
  playerTraits = {
    aggression: vals.aggression / 10,
    toughness: vals.toughness / 10,
    speed: vals.speed / 10,
    power: vals.power / 10,
  };

  // Show archetype preview
  const archEl = document.getElementById('trait-archetype');
  const a = playerTraits.aggression, t = playerTraits.toughness;
  const s = playerTraits.speed, p = playerTraits.power;
  let style = 'BALANCED';
  if (a > 0.7 && p > 0.6) style = 'BRAWLER';
  else if (a < 0.4 && s > 0.6) style = 'COUNTERPUNCHER';
  else if (a > 0.6 && t > 0.7) style = 'BULLY';
  else if (t < 0.4 && a < 0.5) style = 'COWARD';
  else if (s > 0.7 && a > 0.5) style = 'SWARMER';
  else if (p > 0.7 && s < 0.5) style = 'SLUGGER';
  archEl.textContent = `STYLE: ${style}`;
}

// ============================================================
// UTILITY
// ============================================================
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function randRange(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(randRange(min, max + 1)); }
function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function angle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }

// ============================================================
// ASSET LOADER
// ============================================================
const assets = {};
const ASSET_LIST = {
  // Inmate01 (White/Woods)
  'i01_walk':    'inmate01_east_walk-Sheet.png',
  'i01_jab':     'inmate01_east_rightpunch2big-Sheet.png',
  'i01_hook':    'inmate01_east_lefthook_sheet.png',
  'i01_block':   'inmate01_east_block-Sheet.png',
  'i01_hit':     'inmate01_east_gethit1-Sheet-Sheet.png',
  'i01_bruised': 'inmate01_east_rightpunch2big_bruised1-Sheet.png',
  // Inmate02 (Black/BGF)
  'i02_walk':    'inmate02_black1_walkeast-Sheet.png',
  'i02_jab':     'inmate02black_east_punchright1-Sheet.png',
  'i02_hit':     'inmate02_east_gethit-Sheet.png',
  // Inmate03 (Nortenos)
  'i03_walk':    'inmate03_east_walk.png',
  'i03_jab':     'inmate03_punchstab-Sheet.png',
  'i03_hit':     'inmate03_gethit1-Sheet.png',
  'i03_block':   'inmate03_east_block-Sheet.png',
  // Inmate06 Latino (Surenos)
  'i06l_walk':   'inmate06_latino01_east_walk-Sheet.png',
  'i06l_jab':    'inmate06_latino01_east_punch-Sheet.png',
  'i06l_hit':    'inmate06_latino01_east_gethit-Sheet.png',
  // Inmate06 Black variant
  'i06b_walk':   'inmate06_black03_east_walk-Sheet.png',
  // Environment
  'yard':        'yard64.png',
};

function loadAssets() {
  const promises = [];
  for (const [key, path] of Object.entries(ASSET_LIST)) {
    promises.push(new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { assets[key] = img; resolve(); };
      img.onerror = () => { console.warn('Failed to load:', path); assets[key] = null; resolve(); };
      img.src = path;
    }));
  }
  return Promise.all(promises);
}

// ============================================================
// CHARACTER DEFINITIONS
// ============================================================
// Maps gang to sprite sets. Each sprite set defines which asset keys to use.
const CHAR_DEFS = {
  surenos: [
    { id: 'sureno_a', walk: 'i06l_walk', jab: 'i06l_jab', hook: 'i06l_jab', hit: 'i06l_hit', block: null,
      walkFrames: 4, jabFrames: 4, hookFrames: 4, hitFrames: 4, blockFrames: 0 },
  ],
  woods: [
    { id: 'wood_a', walk: 'i01_walk', jab: 'i01_jab', hook: 'i01_hook', hit: 'i01_hit', block: 'i01_block',
      walkFrames: 4, jabFrames: 5, hookFrames: 5, hitFrames: 4, blockFrames: 5 },
  ],
  bgf: [
    { id: 'bgf_a', walk: 'i02_walk', jab: 'i02_jab', hook: 'i02_jab', hit: 'i02_hit', block: null,
      walkFrames: 4, jabFrames: 4, hookFrames: 4, hitFrames: 4, blockFrames: 0 },
    { id: 'bgf_b', walk: 'i06b_walk', jab: 'i02_jab', hook: 'i02_jab', hit: 'i02_hit', block: null,
      walkFrames: 4, jabFrames: 4, hookFrames: 4, hitFrames: 4, blockFrames: 0 },
  ],
  nortenos: [
    { id: 'norte_a', walk: 'i03_walk', jab: 'i03_jab', hook: 'i03_jab', hit: 'i03_hit', block: 'i03_block',
      walkFrames: 4, jabFrames: 4, hookFrames: 4, hitFrames: 5, blockFrames: 6 },
  ],
};

function getCharDef(gang) {
  const defs = CHAR_DEFS[gang];
  return defs[Math.floor(Math.random() * defs.length)];
}
