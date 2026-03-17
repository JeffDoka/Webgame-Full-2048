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

  // ---- Colors (Original 2048 Palette) ----
  COLORS: {
    BOARD_BG:   '#bbada0',
    CELL_EMPTY: '#cdc1b4',
    TEXT_DARK:  '#776e65',
    TEXT_LIGHT: '#f9f6f2',
    BG:         '#faf8ef',
    SCORE_BG:   '#bbada0',
    TILES: {
      2:      { bg: '#eee4da', text: '#776e65' },
      4:      { bg: '#ede0c8', text: '#776e65' },
      8:      { bg: '#f2b179', text: '#f9f6f2' },
      16:     { bg: '#f59563', text: '#f9f6f2' },
      32:     { bg: '#f67c5f', text: '#f9f6f2' },
      64:     { bg: '#f65e3b', text: '#f9f6f2' },
      128:    { bg: '#edcf72', text: '#f9f6f2', glow: 'rgba(237,207,114,0.55)', glowRadius: 14 },
      256:    { bg: '#edcc61', text: '#f9f6f2', glow: 'rgba(237,204,97,0.60)',  glowRadius: 18 },
      512:    { bg: '#edc850', text: '#f9f6f2', glow: 'rgba(237,200,80,0.65)',  glowRadius: 22 },
      1024:   { bg: '#edc53f', text: '#f9f6f2', glow: 'rgba(237,197,63,0.70)',  glowRadius: 26 },
      2048:   { bg: '#edc22e', text: '#f9f6f2', glow: 'rgba(237,194,46,0.80)',  glowRadius: 32 },
      '4096+':{ bg: '#3c3a32', text: '#f9f6f2', glow: 'rgba(60,58,50,0.5)',     glowRadius: 20 },
    },
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
