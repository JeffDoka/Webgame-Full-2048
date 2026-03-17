/* ============================================================
   config.js — The DNA. Every tuneable constant lives here.
   ============================================================ */

export const CONFIG = {

  // ---- Visuals ----
  GRID_SIZE:    4,
  TILE_GAP:     10,
  BOARD_PADDING: 12,
  TILE_RADIUS:  12,
  BOARD_RADIUS: 16,
  FONT_FAMILY: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',

  // ---- Colors (Channel 3 Palette: Coffee · Lion · Almond · Reseda · Ebony) ----
  COLORS: {
    BOARD_BG:   '#414833',  // Ebony
    CELL_EMPTY: '#656D4A',  // Reseda green
    TEXT_DARK:  '#414833',  // Ebony
    TEXT_LIGHT: '#EDE0D4',  // Almond
    BG:         '#EDE0D4',  // Almond
    SCORE_BG:   '#414833',  // Ebony
    TILES: {
      2:      { bg: '#EDE0D4', text: '#414833' },  // Almond    — tier 0
      4:      { bg: '#A68A64', text: '#EDE0D4' },  // Lion      — tier 1
      8:      { bg: '#7F5539', text: '#EDE0D4' },  // Coffee    — tier 2
      16:     { bg: '#656D4A', text: '#EDE0D4' },  // Reseda    — tier 3
      32:     { bg: '#414833', text: '#EDE0D4' },  // Ebony     — tier 4
      64:     { bg: '#2d3320', text: '#EDE0D4' },  // Deep ebony — tier 5
      128:    { bg: '#edcf72', text: '#EDE0D4', glow: 'rgba(237,207,114,0.55)', glowRadius: 14 },
      256:    { bg: '#edcc61', text: '#EDE0D4', glow: 'rgba(237,204,97,0.60)',  glowRadius: 18 },
      512:    { bg: '#edc850', text: '#EDE0D4', glow: 'rgba(237,200,80,0.65)',  glowRadius: 22 },
      1024:   { bg: '#edc53f', text: '#EDE0D4', glow: 'rgba(237,197,63,0.70)',  glowRadius: 26 },
      2048:   { bg: '#edc22e', text: '#EDE0D4', glow: 'rgba(237,194,46,0.80)',  glowRadius: 32 },
      '4096+':{ bg: '#7F5539', text: '#EDE0D4', glow: 'rgba(127,85,57,0.55)',   glowRadius: 20 },
    },
  },

  // ---- Media Catalog — maps tile values → game/media entries ----
  // Each entry: { title, img (path), desc, url }
  // Tiles show a faded version of the art; discoveries appear in the panel below the board.
  MEDIA_CATALOG: {
    3:    { title: 'TimeClimb',               img: 'assets/media/timeclimb.avif',              desc: 'Climb the clock — a fast-paced time-looping arcade game.',                   url: 'https://channel3.gg' },
    6:    { title: 'Crystal Chaos',           img: 'assets/media/crystal-chaos.png',           desc: 'Match crystals, shatter expectations. Satisfying combo puzzler.',            url: 'https://channel3.gg' },
    12:   { title: 'Hexa Puzzle Saga',        img: 'assets/media/hexa-puzzle-saga.png',        desc: 'Hexagonal puzzle battles that twist your mind one layer at a time.',         url: 'https://channel3.gg' },
    24:   { title: 'Tiny Restorations VR',    img: 'assets/media/tiny-restorations-vr.png',    desc: 'Restore miniature worlds by hand. A meditative VR experience.',              url: 'https://channel3.gg' },
    48:   { title: 'The Builder',             img: 'assets/media/the-builder.avif',            desc: 'Build, iterate, ship. A calm city-construction game with no failure state.', url: 'https://channel3.gg' },
    96:   { title: 'The Lost Library',        img: 'assets/media/the-lost-library.avif',       desc: 'An ancient library that rearranges itself. Exploration + mystery.',          url: 'https://channel3.gg' },
    192:  { title: 'Departures: Running Wild',img: 'assets/media/departures-running-wild.jpg', desc: 'A road-trip adventure with no destination and everything to see.',           url: 'https://channel3.gg' },
    384:  { title: 'The Conference',          img: 'assets/media/the-conference.jpg',          desc: 'Navigate the politics of a single endless meeting. A workplace satire.',     url: 'https://channel3.gg' },
    768:  { title: 'The Distributor',         img: 'assets/media/the-distributor.jpg',         desc: 'Supply chain strategy meets noir thriller. Every shipment has a story.',     url: 'https://channel3.gg' },
    1536: { title: 'Worldseekers',            img: 'assets/media/worldseekers.png',            desc: 'Open-world exploration RPG spanning infinite procedurally generated worlds.', url: 'https://channel3.gg' },
  },

  // ---- Mechanics ----
  BASE_TILE:          3,    // starting tile value (2–5); win tile = BASE_TILE × 1024
  WIN_TILE:           2048, // legacy fallback (overridden by state.winTile at runtime)
  SPAWN_4_PROBABILITY: 0.10,
  WIN_DISMISS_MS:     5000,

  // ---- Timings (ms) ----
  ANIM_SLIDE_MS:   100,
  ANIM_SPAWN_MS:   150,
  ANIM_MERGE_MS:   120,
  ANIM_TAG_STAGGER: 100,
  SCORE_ANIM_MS:   300,

  // ---- Powerup Charges ----
  POWERS: {
    LASER:     2,
    BOMB:      1,
    REARRANGE: 1,
    DOUBLE:    1,   // doubles a single tile's value
    UNDO:      1,   // rewinds one move
    FREEZE:  1,   // skip next tile spawn
    UPGRADE: 1,   // auto-double the highest tile on the board
    SWAP:    1,   // swap any two tiles (two-step targeting)
  },

  // ---- Power-up drop cadence ----
  POWER_DROP_EVERY: 10,  // every N moves, grant a random powerup charge
  FREEZE_INDICATOR_COLOR: 'rgba(100,180,255,0.85)',

  // ---- Tag Thresholds ----
  FOSSIL_TURNS:    11,
  TORTOISE_MOVES:  300,
  SPEEDRUN_MOVES:  100,

  // ---- Tag Score Bonuses ----
  // multiply: stacked multiplier applied to base score before flat adds
  // add: flat points added after all multipliers
  // label: shown in score breakdown on game-over screen
  TAG_BONUSES: {
    purist:     { multiply: 2,    label: '×2'    },  // no powerups → double final score
    summit:     { add: 1000,      label: '+1,000' }, // reached win tile
    overclock:  { multiply: 1.5,  label: '×1.5'  }, // went past win tile
    speedrun:   { multiply: 1.5,  label: '×1.5'  }, // hit win tile fast
    fossil:     { add: 500,       label: '+500'  },  // ancient tile survived
    cleansweep: { add: 800,       label: '+800'  },  // board nearly cleared
    surgeon:    { multiply: 1.25, label: '×1.25' }, // laser-only run
    tortoise:   { add: 300,       label: '+300'  },  // marathon game
  },

  // ---- Security ----
  ADMIN_CODE: '6673',
};

// Tile color lookup — maps by tier so any base tile uses the standard palette.
// tier = log2(value / baseTile): 3→tier 0 (color of "2"), 6→tier 1 ("4"), etc.
export function getTileColors(value, baseTile = 2) {
  const TIER_KEYS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, '4096+'];
  const tier = Math.max(0, Math.round(Math.log2(value / baseTile)));
  const key  = tier < TIER_KEYS.length ? TIER_KEYS[tier] : '4096+';
  return CONFIG.COLORS.TILES[key] || CONFIG.COLORS.TILES['4096+'];
}
