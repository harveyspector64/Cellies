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
// ASSET LOADER (mode-aware — reads from spritemode.js SM())
// ============================================================
const assets = {};

function loadAssets() {
  // Clear existing assets
  for (const key of Object.keys(assets)) delete assets[key];

  const mode = SM();
  const promises = [];
  for (const [key, filename] of Object.entries(mode.assetList)) {
    promises.push(new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { assets[key] = img; resolve(); };
      img.onerror = () => { console.warn('Failed to load:', mode.assetPath + filename); assets[key] = null; resolve(); };
      img.src = mode.assetPath + filename;
    }));
  }
  return Promise.all(promises);
}

// ============================================================
// CHARACTER DEFINITIONS (mode-aware — reads from spritemode.js)
// ============================================================
function getCharDef(gang) {
  const defs = SM().charDefs[gang];
  if (!defs || defs.length === 0) return null;
  return defs[Math.floor(Math.random() * defs.length)];
}
