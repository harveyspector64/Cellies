// YARD — Constants & Configuration

// ============================================================
// CONSTANTS
// ============================================================
const FRAME_W = 16;
const FRAME_H = 16;
const SCALE = 4;
const DISPLAY_SIZE = FRAME_W * SCALE; // 64px on screen
const CANVAS_W = 960;
const CANVAS_H = 540;

// Combat tuning
const JAB_DAMAGE = 12;
const HOOK_DAMAGE = 22;
const JAB_KNOCKBACK = 5;
const HOOK_KNOCKBACK = 10;
const BLOCK_DAMAGE_MULT = 0.2;
const BLOCK_KNOCKBACK_MULT = 0.1;
const MAX_HEALTH = 100;
const KO_DURATION = 3000;

// Hitstop (time-based, ms) — Phase 1A
const JAB_HITSTOP = 70;
const HOOK_HITSTOP = 200;
const KO_HITSTOP = 450;
const HITSTOP_ATTACKER_MULT = 0.45; // attacker barely freezes — keeps you in control

// Knockback curves — Phase 1B
const KNOCKBACK_DURATION_JAB = 180;
const KNOCKBACK_DURATION_HOOK = 320;
const KB_FRICTION_START = 0.985;   // low friction initially (body flies)
const KB_FRICTION_END = 0.88;     // heavy braking at end
const HOOK_VERTICAL_BOUNCE = -3.5; // upward pop on hooks
const BOUNCE_GRAVITY = 0.18;       // gravity for vertical bounce

// Recovery cooldowns — Phase 1C
const JAB_RECOVERY_MS = 100;
const HOOK_RECOVERY_MS = 250;
const INPUT_BUFFER_WINDOW = 150; // ms to hold buffered attack input

// Data-driven attack definitions
const MOVE_DEFS = {
  jab: {
    startup: 70, active: 45, recovery: 50,   // snappy — jab should feel instant
    damage: 12, staminaCost: 10, knockback: 5,
    guardDamage: 6, guardStun: 80, fearDamage: 4,
    pushback: 3, moveSpeedMult: 0.55,
    hitstop: 50, blockPushback: 4
  },
  hook: {
    startup: 135, active: 55, recovery: 250,  // same as original
    damage: 22, staminaCost: 22, knockback: 10,
    guardDamage: 18, guardStun: 180, fearDamage: 12,
    pushback: 8, moveSpeedMult: 0.35,
    hitstop: 200, blockPushback: 8
  },
  shove: {
    startup: 90, active: 40, recovery: 200,
    damage: 4, staminaCost: 14, knockback: 14,
    guardDamage: 22, guardStun: 250, fearDamage: 18,
    pushback: 18, moveSpeedMult: 0.45,
    hitstop: 100, blockPushback: 14
  }
};

// Stamina — Phase 2
const MAX_STAMINA = 100;
const STAMINA_REGEN_RATE = 18;      // per second idle/walking
const JAB_STAMINA_COST = 10;
const HOOK_STAMINA_COST = 22;
const BLOCK_STAMINA_DRAIN = 6;      // per second while blocking
const LOW_STAMINA_THRESHOLD = 20;
const LOW_STAMINA_SPEED_MULT = 0.65;
const LOW_STAMINA_DAMAGE_MULT = 0.6;

// Knockdown system — Batch 1 (reworked Batch 3)
const KNOCKDOWN_THRESHOLD = 0.25;   // health % that triggers knockdown chance
const KNOCKDOWN_HOOK_CHANCE = 0.35; // chance hook causes knockdown (scales with damage)
const KNOCKDOWN_DURATION = 1500;     // ms on the ground
const GETUP_WINDOW = 1200;          // ms player has to mash to get up
const GETUP_TAPS_NEEDED = 4;        // taps needed to get up (increases per knockdown)
const MAX_KNOCKDOWNS = 3;           // 3 knockdowns = TKO
const KNOCKDOWN_HEALTH_RECOVERY = 0.05; // recover 5% max health on get-up (fighting spirit)
// Knockdown rework — instant KO + wobble
const INSTANT_KO_BASE_CHANCE = 0.15;   // base chance of instant KO when health<=0
const INSTANT_KO_HOOK_BONUS = 0.25;    // extra chance for hooks
const INSTANT_KO_OVERKILL_SCALE = 0.4; // scales with overkill damage
const WOBBLE_DURATION = 1800;          // ms of post-knockdown wobble
const WOBBLE_SPEED_MULT = 0.45;        // speed during wobble

// Clinch system — Batch 1
const CLINCH_DISTANCE = 30;         // how close to enter clinch
const CLINCH_TIME_NEEDED = 400;     // ms of close proximity to trigger clinch
const CLINCH_GUT_SHOT_DAMAGE = 6;   // low damage gut shots
const CLINCH_GUT_SHOT_INJURY = 8;   // but builds injury fast
const CLINCH_SHOVE_FORCE = 12;      // knockback from shove
const CLINCH_SHOVE_STAMINA = 15;    // stamina cost to shove
const CLINCH_BREAK_STAMINA = 8;     // stamina cost to break away
const CLINCH_DURATION_MAX = 3000;   // auto-break after this long

// Blood trail — Batch 2
const BLOOD_TRAIL_INJURY_THRESHOLD = 30;  // injuries% before blood trails start
const BLOOD_TRAIL_INTERVAL = 350;         // ms between drips while moving
const BLOOD_TRAIL_HEAVY_INTERVAL = 150;   // ms when badly hurt (injuries > 60)

// Stagger system — Batch 2
const STAGGER_HIT_WINDOW = 1200;    // ms window for counting rapid hits
const STAGGER_HIT_THRESHOLD = 3;    // hits in window to trigger stagger
const STAGGER_DURATION = 600;       // ms of stagger (vulnerability + slow)
const STAGGER_SPEED_MULT = 0.3;     // movement speed while staggered

// Guard alarm — Batch 2 (riot mode only)
const GUARD_ALARM_MIN = 60000;      // min ms before guards intervene (60s)
const GUARD_ALARM_MAX = 90000;      // max ms (90s)
const GUARD_WARNING_TIME = 10000;   // 10s warning whistle before recall

// Batch 4: Fight Feel — Footwork (refined Batch 5)
const LUNGE_FORCE_JAB = 3.5;          // forward burst on jab startup
const LUNGE_FORCE_HOOK = 5;           // forward burst on hook startup
const LUNGE_MIN_DIST = 30;            // no lunge if closer than this
const LUNGE_MAX_DIST = 65;            // full lunge at this distance and beyond
const WHIFF_BACKSTEP = 2;             // backward drift when attack misses
const CORNER_PRESSURE_DIST = 60;      // px from wall edge to count as cornered
const CORNER_PRESSURE_FEAR_MULT = 1.5; // fear damage multiplier when cornered
const CORNER_PRESSURE_DMG_MULT = 1.12; // damage multiplier when cornered

// Batch 4: Fight Feel — Momentum (Heat)
const HEAT_GAIN_PER_HIT = 18;         // heat gained per landed hit
const HEAT_GAIN_HOOK = 30;            // heat from landing a hook
const HEAT_MAX = 100;
const HEAT_DECAY_RATE = 8;            // per second when not hitting
const HEAT_DECAY_DELAY = 1200;        // ms after last hit before decay starts
const HEAT_SPEED_BONUS = 0.12;        // +12% speed at max heat
const HEAT_DAMAGE_BONUS = 0.18;       // +18% damage at max heat
const HEAT_FEAR_BONUS = 0.3;          // +30% fear damage at max heat
const HEAT_RESET_ON_HIT = 0.6;       // lose 60% heat when you get hit

// Batch 4: Fight Feel — Slip/Duck
const SLIP_DURATION = 280;            // ms of the slip animation
const SLIP_COOLDOWN = 400;            // ms before you can slip again
const SLIP_COUNTER_WINDOW = 200;      // ms after slip where attacks do bonus damage
const SLIP_COUNTER_DAMAGE_MULT = 1.4; // 40% bonus damage on counter
const SLIP_SPEED_MULT = 0.2;          // movement speed while slipping

// Batch 5: Juice & Polish
const HIT_CONFIRM_DURATION = 120;     // ms of white outline flash on landing a hit
const COMBO_DISPLAY_DURATION = 1200;  // ms to show combo counter
const DANGER_HEALTH_THRESHOLD = 0.25; // health % to trigger danger state
const DANGER_PULSE_SPEED = 0.004;     // pulse frequency for danger vignette
const BLOOD_STAIN_CHANCE = 0.35;      // chance a blood particle leaves a permanent mark
const BLOOD_STAIN_MAX = 60;           // max persistent blood stains
const IMPACT_DUST_COUNT = 3;          // dust particles on knockback
const FAILED_INPUT_FLASH = 80;        // ms of red flash when attack input fails

// Animation frame durations (ms)
const ANIM_WALK_SPD = 140;
const ANIM_JAB_SPD = 35;             // fast jab — should snap out
const ANIM_HOOK_SPD = 65;
const ANIM_HIT_SPD = 70;
const ANIM_BLOCK_SPD = 60;
const ANIM_IDLE_SPD = 400;

// Hitbox - when in active frames, reach in front of character
const PUNCH_REACH = 38;
const PUNCH_WIDTH = 28;
const PUNCH_HEIGHT = 36;

// Gang colors
const GANG_COLORS = {
  surenos:  { primary: '#2a4a9a', light: '#4a7adf', dark: '#1a2a5a', name: 'Surenos' },
  woods:    { primary: '#7a7a6a', light: '#aaaaaa', dark: '#4a4a3a', name: 'Wood Pile' },
  bgf:      { primary: '#2a6a3a', light: '#4aaa5a', dark: '#1a3a1a', name: 'Riders' },
  nortenos: { primary: '#9a2a2a', light: '#da4a4a', dark: '#5a1a1a', name: 'Nortenos' }
};

// Yard dimensions
const YARD_1V1_W = 800;
const YARD_1V1_H = 500;
const YARD_RIOT_W = 1100;
const YARD_RIOT_H = 700;
const YARD_CELL_W = 280;
const YARD_CELL_H = 200;
