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
  WIN_TILE:           2048,
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
  },

  // ---- Tag Thresholds ----
  FOSSIL_TURNS:    11,
  TORTOISE_MOVES:  300,
  SPEEDRUN_MOVES:  100,

  // ---- Security ----
  ADMIN_CODE: '6673',
};

// Tile color lookup: handles 4096 and above
export function getTileColors(value) {
  if (CONFIG.COLORS.TILES[value]) return CONFIG.COLORS.TILES[value];
  return CONFIG.COLORS.TILES['4096+'];
}
