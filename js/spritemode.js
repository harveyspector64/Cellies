// YARD — Sprite Mode System (16px / 32px toggle)
// Loaded after constants.js, before utils.js

// ============================================================
// MODE CONFIGURATION
// ============================================================

let spriteMode = '32'; // '16' or '32' — toggled from menu (default: 32-bit)

// Active mode accessor — call SM() anywhere to get current config
function SM() { return SPRITE_MODES[spriteMode]; }

// Tuning accessor — T('CONSTANT_NAME', defaultValue)
// Returns per-mode override if it exists, otherwise the default (global constant)
function T(key, fallback) {
  const tuning = SPRITE_MODES[spriteMode].tuning;
  return tuning && tuning[key] !== undefined ? tuning[key] : fallback;
}

const SPRITE_MODES = {
  // --------------------------------------------------------
  // 16-BIT MODE (original) — 16x16 sprites at 4x scale = 64px
  // --------------------------------------------------------
  '16': {
    FRAME_W: 16,
    FRAME_H: 16,
    SCALE: 4,
    assetPath: '',
    assetList: {
      'i01_walk':    'inmate01_east_walk-Sheet.png',
      'i01_jab':     'inmate01_east_rightpunch2big-Sheet.png',
      'i01_hook':    'inmate01_east_lefthook_sheet.png',
      'i01_block':   'inmate01_east_block-Sheet.png',
      'i01_hit':     'inmate01_east_gethit1-Sheet-Sheet.png',
      'i01_bruised': 'inmate01_east_rightpunch2big_bruised1-Sheet.png',
      'i02_walk':    'inmate02_black1_walkeast-Sheet.png',
      'i02_jab':     'inmate02black_east_punchright1-Sheet.png',
      'i02_hit':     'inmate02_east_gethit-Sheet.png',
      'i03_walk':    'inmate03_east_walk.png',
      'i03_jab':     'inmate03_punchstab-Sheet.png',
      'i03_hit':     'inmate03_gethit1-Sheet.png',
      'i03_block':   'inmate03_east_block-Sheet.png',
      'i06l_walk':   'inmate06_latino01_east_walk-Sheet.png',
      'i06l_jab':    'inmate06_latino01_east_punch-Sheet.png',
      'i06l_hit':    'inmate06_latino01_east_gethit-Sheet.png',
      'i06b_walk':   'inmate06_black03_east_walk-Sheet.png',
      'yard':        'yard64.png',
      // Nurse & guard (lives in new_art_32 — use full path)
      'nurse_idle':  'new_art_32/nurse01_white01_idle1_south-Sheet.png',
      'nurse_check': 'new_art_32/nurse01_white01_CheckPatient-Sheet.png',
      'nurse_walk':  'new_art_32/nurse01_white01_Walk-Sheet.png',
      'guard_idle':  'new_art_32/guard01_white01_idle1_south-Sheet.png',
    },
    charDefs: {
      surenos: [
        { id: 'sureno_a', walk: 'i06l_walk', jab: 'i06l_jab', hook: 'i06l_jab', hit: 'i06l_hit', block: null,
          shove: null, die: null, celebrate: null, idle: null,
          walkFrames: 4, jabFrames: 4, hookFrames: 4, hitFrames: 4, blockFrames: 0,
          shoveFrames: 0, dieFrames: 0, celebrateFrames: 0, idleFrames: 0 },
      ],
      woods: [
        { id: 'wood_a', walk: 'i01_walk', jab: 'i01_jab', hook: 'i01_hook', hit: 'i01_hit', block: 'i01_block',
          shove: null, die: null, celebrate: null, idle: null,
          walkFrames: 4, jabFrames: 5, hookFrames: 5, hitFrames: 4, blockFrames: 5,
          shoveFrames: 0, dieFrames: 0, celebrateFrames: 0, idleFrames: 0 },
      ],
      bgf: [
        { id: 'bgf_a', walk: 'i02_walk', jab: 'i02_jab', hook: 'i02_jab', hit: 'i02_hit', block: null,
          shove: null, die: null, celebrate: null, idle: null,
          walkFrames: 4, jabFrames: 4, hookFrames: 4, hitFrames: 4, blockFrames: 0,
          shoveFrames: 0, dieFrames: 0, celebrateFrames: 0, idleFrames: 0 },
        { id: 'bgf_b', walk: 'i06b_walk', jab: 'i02_jab', hook: 'i02_jab', hit: 'i02_hit', block: null,
          shove: null, die: null, celebrate: null, idle: null,
          walkFrames: 4, jabFrames: 4, hookFrames: 4, hitFrames: 4, blockFrames: 0,
          shoveFrames: 0, dieFrames: 0, celebrateFrames: 0, idleFrames: 0 },
      ],
      nortenos: [
        { id: 'norte_a', walk: 'i03_walk', jab: 'i03_jab', hook: 'i03_jab', hit: 'i03_hit', block: 'i03_block',
          shove: null, die: null, celebrate: null, idle: null,
          walkFrames: 4, jabFrames: 4, hookFrames: 4, hitFrames: 5, blockFrames: 6,
          shoveFrames: 0, dieFrames: 0, celebrateFrames: 0, idleFrames: 0 },
      ],
    },
  },

  // --------------------------------------------------------
  // 32-BIT MODE — 32x32 sprites at 2x scale = 64px
  // --------------------------------------------------------
  '32': {
    FRAME_W: 32,
    FRAME_H: 32,
    SCALE: 2.5, // 32x2.5 = 80px — bigger presence, tighter fights
    assetPath: 'new_art_32/',
    assetList: {
      // --- Surenos A (inmate01_latino01) ---
      'sur32a_walk':      'inmate01_latino01_walking_east-Sheet.png',
      'sur32a_jab':       'inmate01_latino01_rightHook-Sheet.png', // fallback: no leftJab export
      'sur32a_hook':      'inmate01_latino01_rightHook-Sheet.png',
      'sur32a_hit':       'inmate01_latino01_GetHit-Sheet.png',
      'sur32a_block':     'inmate01_latino01_Block-Sheet.png',
      'sur32a_shove':     'inmate01_latino01_Shove-Sheet.png',
      'sur32a_die':       'inmate01_latino01_Dies-Sheet.png',
      'sur32a_celebrate': 'inmate01_latino01_celebrate-Sheet.png',
      // --- Surenos B (inmate01_latino02) ---
      'sur32b_walk':      'inmate01_latino02_walk-Sheet.png',
      'sur32b_jab':       'inmate01_latino02_leftJab-Sheet.png',
      'sur32b_hook':      'inmate01_latino02_rightHook-Sheet.png',
      'sur32b_hit':       'inmate01_latino02_leftJab-Sheet.png', // TEMP fallback: no getHit PNG
      'sur32b_block':     'inmate01_latino02_Block-Sheet.png',
      'sur32b_shove':     'inmate01_latino02_Shove-Sheet.png',
      'sur32b_die':       'inmate01_latino02_Die-Sheet.png',
      'sur32b_celebrate': 'inmate01_latino02_Celebrate-Sheet.png',
      'sur32b_idle':      'inmate01_latino02_idle1_south-Sheet.png',
      // --- Woods A (inmate02_white01) ---
      'wod32a_walk':      'inmate02_white01_walk-Sheet.png',
      'wod32a_jab':       'inmate02_white01_leftJab-Sheet.png',
      'wod32a_hook':      'inmate02_white01_rightHook-Sheet.png',
      'wod32a_hit':       'inmate02_white01_getHit-Sheet.png',
      'wod32a_shove':     'inmate02_white01_shove-Sheet.png',
      'wod32a_die':       'inmate02_white01_dies-Sheet.png',
      'wod32a_celebrate': 'inmate02_white01_celebrate-Sheet.png',
      'wod32a_idle':      'inmate02_white01_idle1_south-Sheet.png',
      // --- Woods B (inmate02_white02) ---
      'wod32b_walk':      'inmate02_white02_walk-Sheet.png',
      'wod32b_jab':       'inmate02_white02_leftJab-Sheet.png',
      'wod32b_hook':      'inmate02_white02_rightHook-Sheet.png',
      'wod32b_hit':       'inmate02_white02_GetHit-Sheet.png',
      'wod32b_block':     'inmate02_white02_Block-Sheet.png',
      'wod32b_die':       'inmate02_white02_Die-Sheet.png',
      'wod32b_celebrate': 'inmate02_white02_celebrate-Sheet.png',
      'wod32b_idle':      'inmate02_white02_idle1_south-Sheet.png',
      // --- BGF/Riders A (inmate03_black01) ---
      'bgf32a_walk':      'inmate03_black01_walk-Sheet.png',
      'bgf32a_jab':       'inmate03_black01_leftJab-Sheet.png',
      'bgf32a_hook':      'inmate03_black01_rightJab-Sheet.png',
      'bgf32a_hit':       'inmate03_black01_getHit-Sheet.png',
      'bgf32a_block':     'inmate03_black01_block-Sheet.png',
      'bgf32a_die':       'inmate03_black01_Dies-Sheet.png',
      'bgf32a_celebrate': 'inmate03_black01_celebrate-Sheet-Sheet.png',
      'bgf32a_idle':      'inmate03_black01_idle1_south-Sheet.png',
      // --- BGF/Riders B (inmate03_black02) ---
      'bgf32b_walk':      'inmate03_black02_walk-Sheet.png',
      'bgf32b_jab':       'inmate03_black02_leftJab-Sheet.png',
      'bgf32b_hook':      'inmate03_black02_rightHook-Sheet.png',
      'bgf32b_hit':       'inmate03_black02_getHit-Sheet.png',
      'bgf32b_block':     'inmate03_black02_Block-Sheet.png',
      'bgf32b_shove':     'inmate03_black02_Shove-Sheet.png',
      'bgf32b_die':       'inmate03_black02_Dies-Sheet.png',
      'bgf32b_celebrate': 'inmate03_black02_Celebrate-Sheet.png',
      'bgf32b_idle':      'inmate03_black02_idle1_south-Sheet.png',
      // --- Nortenos (inmate04_latino02 — single model for all) ---
      'nor32_walk':       'inmate04_latino02_walk-Sheet.png',
      'nor32_jab':        'inmate04_latino02_leftJab-Sheet.png',
      'nor32_hook':       'inmate04_latino02_rightJab-Sheet.png',
      'nor32_hit':        'inmate04_latino02_getHit-Sheet.png',
      'nor32_shove':      'inmate04_latino02_Shove-Sheet.png',
      'nor32_die':        'inmate04_latino02_Dies-Sheet.png',
      // Nortenos extras from inmate04_latino01 partial set
      'nor32_block':      'inmate04_latino01_Block-Sheet.png',
      'nor32_idle':       'inmate04_latino01_idle1_southNorteno-Sheet.png',
      'nor32_celebrate':  'inmate04_latino01_Celebrate_Norteno-Sheet.png',
      // Nurse & guard
      'nurse_idle':       'nurse01_white01_idle1_south-Sheet.png',
      'nurse_check':      'nurse01_white01_CheckPatient-Sheet.png',
      'nurse_walk':       'nurse01_white01_Walk-Sheet.png',
      'guard_idle':       'guard01_white01_idle1_south-Sheet.png',
      // Environment
      'yard':             '../yard64.png',
      // Locations — interactive cell art
      'loc_cell':         'locations_cell01-Sheet.png',
      'loc_bunk':         'locations_bunkbeds01-Sheet.png',
      'loc_toilet':       'locations_toiletsink01_sheet.png',
      'loc_bed':          'locations_bed01-Sheet.png',
    },
    charDefs: {
      surenos: [
        { id: 'sureno32_a',
          walk: 'sur32a_walk', jab: 'sur32a_jab', hook: 'sur32a_hook',
          hit: 'sur32a_hit', block: 'sur32a_block', shove: 'sur32a_shove',
          die: 'sur32a_die', celebrate: 'sur32a_celebrate', idle: null,
          walkFrames: 5, jabFrames: 9, hookFrames: 9, hitFrames: 5, blockFrames: 6,
          shoveFrames: 7, dieFrames: 10, celebrateFrames: 17, idleFrames: 0,
          // Per-character anim speed overrides (ms per frame)
          animSpeeds: { jab: 18, hook: 50, hit: 70, die: 80, celebrate: 100, shove: 50 }
        },
        { id: 'sureno32_b',
          walk: 'sur32b_walk', jab: 'sur32b_jab', hook: 'sur32b_hook',
          hit: 'sur32b_hit', block: 'sur32b_block', shove: 'sur32b_shove',
          die: 'sur32b_die', celebrate: 'sur32b_celebrate', idle: 'sur32b_idle',
          walkFrames: 6, jabFrames: 6, hookFrames: 6, hitFrames: 6, blockFrames: 5,
          shoveFrames: 9, dieFrames: 15, celebrateFrames: 17, idleFrames: 17,
          animSpeeds: { jab: 28, hook: 55, hit: 60, die: 65, celebrate: 100, shove: 45, idle: 180 }
        },
      ],
      woods: [
        { id: 'wood32_a',
          walk: 'wod32a_walk', jab: 'wod32a_jab', hook: 'wod32a_hook',
          hit: 'wod32a_hit', block: null, shove: 'wod32a_shove',
          die: 'wod32a_die', celebrate: 'wod32a_celebrate', idle: 'wod32a_idle',
          walkFrames: 5, jabFrames: 5, hookFrames: 6, hitFrames: 7, blockFrames: 0,
          shoveFrames: 8, dieFrames: 11, celebrateFrames: 17, idleFrames: 17,
          animSpeeds: { jab: 33, hook: 55, hit: 55, die: 75, celebrate: 100, shove: 50, idle: 180 }
        },
        { id: 'wood32_b',
          walk: 'wod32b_walk', jab: 'wod32b_jab', hook: 'wod32b_hook',
          hit: 'wod32b_hit', block: 'wod32b_block', shove: null,
          die: 'wod32b_die', celebrate: 'wod32b_celebrate', idle: 'wod32b_idle',
          walkFrames: 6, jabFrames: 5, hookFrames: 7, hitFrames: 7, blockFrames: 5,
          shoveFrames: 0, dieFrames: 14, celebrateFrames: 10, idleFrames: 17,
          animSpeeds: { jab: 33, hook: 48, hit: 55, die: 65, celebrate: 110, shove: 50, idle: 180 }
        },
      ],
      bgf: [
        { id: 'bgf32_a',
          walk: 'bgf32a_walk', jab: 'bgf32a_jab', hook: 'bgf32a_hook',
          hit: 'bgf32a_hit', block: 'bgf32a_block', shove: null,
          die: 'bgf32a_die', celebrate: 'bgf32a_celebrate', idle: 'bgf32a_idle',
          walkFrames: 4, jabFrames: 6, hookFrames: 6, hitFrames: 14, blockFrames: 7,
          shoveFrames: 0, dieFrames: 14, celebrateFrames: 17, idleFrames: 17,
          animSpeeds: { jab: 28, hook: 55, hit: 28, die: 65, celebrate: 100, idle: 180 }
        },
        { id: 'bgf32_b',
          walk: 'bgf32b_walk', jab: 'bgf32b_jab', hook: 'bgf32b_hook',
          hit: 'bgf32b_hit', block: 'bgf32b_block', shove: 'bgf32b_shove',
          die: 'bgf32b_die', celebrate: 'bgf32b_celebrate', idle: 'bgf32b_idle',
          walkFrames: 6, jabFrames: 7, hookFrames: 8, hitFrames: 16, blockFrames: 7,
          shoveFrames: 9, dieFrames: 18, celebrateFrames: 12, idleFrames: 17,
          animSpeeds: { jab: 24, hook: 42, hit: 24, die: 52, celebrate: 100, shove: 45, idle: 180 }
        },
      ],
      nortenos: [
        { id: 'norte32_a',
          walk: 'nor32_walk', jab: 'nor32_jab', hook: 'nor32_hook',
          hit: 'nor32_hit', block: 'nor32_block', shove: 'nor32_shove',
          die: 'nor32_die', celebrate: 'nor32_celebrate', idle: 'nor32_idle',
          walkFrames: 8, jabFrames: 7, hookFrames: 9, hitFrames: 10, blockFrames: 4,
          shoveFrames: 13, dieFrames: 15, celebrateFrames: 16, idleFrames: 17,
          animSpeeds: { jab: 24, hook: 37, hit: 40, die: 62, celebrate: 100, shove: 32, idle: 180 }
        },
      ],
    },
    // --------------------------------------------------------
    // 32-BIT TUNING — grittier, weightier, more deliberate
    // These override global constants via T('KEY', default)
    // --------------------------------------------------------
    tuning: {
      // Movement — slower, more grounded
      BASE_MOVE_SPEED_MIN: 0.9,      // was 1.2 — visible legs need time to cycle
      BASE_MOVE_SPEED_RANGE: 0.6,    // was 0.8 — narrower speed spread
      ANIM_WALK_SPD: 165,            // was 140ms — footstep cadence matches speed

      // Attack lunges — step into the punch, don't teleport
      LUNGE_FORCE_JAB: 2.2,          // was 3.5
      LUNGE_FORCE_HOOK: 3.2,         // was 5.0
      WHIFF_BACKSTEP: 1.4,           // was 2 — less dramatic miss drift

      // Recovery — deliberate rhythm, punches are commitments
      JAB_RECOVERY_MS: 130,          // was 100ms
      HOOK_RECOVERY_MS: 320,         // was 250ms

      // Hitstop — feel every connection
      JAB_HITSTOP: 90,               // was 70ms — see the fist land
      HOOK_HITSTOP: 260,             // was 200ms — brutal freeze
      KO_HITSTOP: 550,               // was 450ms — cinematic

      // Knockback — heavy impacts but bodies stay grounded
      JAB_KNOCKBACK: 3.5,            // was 5
      HOOK_KNOCKBACK: 7,             // was 10
      KB_FRICTION_START: 0.975,      // was 0.985 — more grounded from hit
      HOOK_VERTICAL_BOUNCE: -2.5,    // was -3.5 — less cartoony pop
      KNOCKBACK_DURATION_JAB: 150,   // was 180ms
      KNOCKBACK_DURATION_HOOK: 260,  // was 320ms

      // Camera — smoother, less frantic
      CAMERA_FOLLOW_SPEED: 0.055,    // was 0.08
      CAMERA_1V1_ZOOM_MIN: 1.1,     // was 0.8 — never zoom out too far with big sprites
      CAMERA_1V1_ZOOM_MAX: 2.2,     // was 1.8 — tighter max for bigger presence
      CAMERA_RIOT_ZOOM: 1.4,        // base zoom for riot/yard mode (was ~1.0)
      CAMERA_RIOT_SHAKE_FALLOFF: 120, // distance at which distant shakes start fading (was 200)
      CAMERA_RIOT_SHAKE_MIN: 0.05,  // minimum shake scale for far-away events (was 0.1)

      // AI pacing — more deliberate
      AI_COMBO_DELAY_BASE: 100,      // was ~80ms — breathes between punches
      AI_COMBO_DELAY_RANGE: 80,      // randomized range on top
      AI_APPROACH_SPEED_MULT: 0.85,  // closes distance 15% slower
      AI_SIZING_UP_ADD: 300,         // extra ms spent sizing up before engaging
      AI_PROBE_CHANCE_MULT: 0.75,    // less random probing, more deliberate

      // Fighter degradation — beaten fighters visibly deteriorate
      DEGRADATION_ENABLED: true,
      DEGRADATION_SPEED_LOSS: 0.35,    // max 35% speed loss at near-death (was 0.25)
      DEGRADATION_INJURY_DRAG: 0.25,   // injury-based speed penalty (was 0.15)
      DEGRADATION_KD_PENALTY: 0.10,    // 10% slower per knockdown taken (was 0.06)
      DEGRADATION_ATTACK_SLOW: 0.35,   // attacks up to 35% slower when hurt (was 0.2)
      DEGRADATION_STUMBLE_MULT: 2.5,   // stumble chance multiplier (default 1)
      DEGRADATION_SWAY: true,          // hurt fighters sway/lean when idle/walking

      // Hitbox/spacing — fighters stand closer, punches connect visibly
      PUNCH_REACH: 30,              // was 38 — fists don't teleport across a gap
      PUNCH_WIDTH: 30,              // was 28 — slightly wider hitbox
      PUNCH_HEIGHT: 38,             // was 36 — taller hitbox for bigger sprites
      HURTBOX_W: 32,                // was 28 — wider body to match sprite
      HURTBOX_H: 36,                // was 32 — taller body
      COLLISION_MIN_DIST: 32,       // was 36 — fighters stand closer together
      AI_ATTACK_RANGE: 48,          // was 55 — AI engages at tighter range
      LUNGE_MIN_DIST: 24,           // was 30 — lunge kicks in closer

      // Slip/duck — subtler for detailed sprites
      SLIP_SQUISH: 0.25,              // was 0.4 — less extreme vertical squish
      SLIP_WIDEN: 1.08,               // was 1.15 — less horizontal stretch

      // Knockdown variation — not a metronome
      KNOCKDOWN_VARIATION: true,
      KNOCKDOWN_DURATION_BASE: 2400,    // weightier — stay down longer (was 1800)
      KD_PER_KNOCKDOWN_ADD: 400,        // each prior KD adds 400ms on the ground
      KD_LOW_HEALTH_ADD: 600,           // up to 600ms more when near-death
      KD_INJURY_ADD: 300,               // injuries add up to 300ms
      KD_TOUGHNESS_REDUCE: 400,         // tough fighters recover faster
      KD_RANDOM_RANGE: 350,             // +/- 350ms random variance
      KD_MIN_DURATION: 800,             // minimum time on ground
      KD_MAX_DURATION: 4500,            // a devastated fighter stays down a long time
    },
  },
};
