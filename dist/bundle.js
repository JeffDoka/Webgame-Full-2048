/* 2048 — The Master Edition (bundled build) */
(function() {
'use strict';

// ═══════════════════════════════════════════
// CONFIG MODULE
// ═══════════════════════════════════════════
/* ============================================================
   config.js — The DNA. Every tuneable constant lives here.
   ============================================================ */

const CONFIG = {

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
      128:    { bg: '#edcf72', text: '#414833', glow: 'rgba(237,207,114,0.55)', glowRadius: 14 },
      256:    { bg: '#edcc61', text: '#414833', glow: 'rgba(237,204,97,0.60)',  glowRadius: 18 },
      512:    { bg: '#edc850', text: '#414833', glow: 'rgba(237,200,80,0.65)',  glowRadius: 22 },
      1024:   { bg: '#edc53f', text: '#414833', glow: 'rgba(237,197,63,0.70)',  glowRadius: 26 },
      2048:   { bg: '#edc22e', text: '#414833', glow: 'rgba(237,194,46,0.80)',  glowRadius: 32 },
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
    LASER:     2,   // remove one tile
    BOMB:      1,   // wipe 3x3 area
    REARRANGE: 1,   // Fisher-Yates shuffle all tiles
    DOUBLE:    1,   // double a single tile's value
    UNDO:      1,   // rewind one move
    FREEZE:    1,   // skip next tile spawn
    UPGRADE:   1,   // auto-double the highest tile
    SWAP:      1,   // swap any two tiles (two-step targeting)
  },

  // ---- Power-up drop cadence ----
  POWER_DROP_EVERY: 10,  // every N moves, grant a random powerup charge
  FREEZE_INDICATOR_COLOR: 'rgba(100,200,255,0.92)',

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
function getTileColors(value, baseTile = CONFIG.BASE_TILE) {
  const TIER_KEYS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, '4096+'];
  const tier = Math.max(0, Math.round(Math.log2(value / baseTile)));
  const key  = tier < TIER_KEYS.length ? TIER_KEYS[tier] : '4096+';
  return CONFIG.COLORS.TILES[key] || CONFIG.COLORS.TILES['4096+'];
}


// ═══════════════════════════════════════════
// STORAGE MODULE
// ═══════════════════════════════════════════
const storage = (function() {
/* ============================================================
   storage.js — The ONLY module allowed to touch localStorage.
   ============================================================ */

const KEY_BEST     = '2048_best';
const KEY_HISTORY  = '2048_history';
const KEY_SETTINGS = '2048_settings';
const KEY_DAILY    = (date) => `2048_dailyPlays_${date}`;

function today() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded, silent */ }
}

// ---- Best Score ----
function getBest() {
  return safeGet(KEY_BEST, 0);
}

function setBest(n) {
  safeSet(KEY_BEST, n);
}

// ---- History ----
// GameResult: { date, score, maxTile, totalMoves, durationMs, tags, powersUsed }
function getHistory() {
  return safeGet(KEY_HISTORY, []);
}

function addResult(result) {
  const history = getHistory();
  history.unshift(result); // newest first
  // Keep max 200 entries
  if (history.length > 200) history.length = 200;
  safeSet(KEY_HISTORY, history);
}

function clearHistory() {
  safeSet(KEY_HISTORY, []);
}

// ---- Settings ----
const DEFAULT_SETTINGS = {
  powersEnabled:    true,
  animEnabled:      true,
  gridSize:         4,
  baseTile:         3,  // starting tile value (2–5); win tile = baseTile × 1024
  laserCharges:     2,
  bombCharges:      1,
  rearrangeCharges: 1,
  discoveryPanel:   true, // show game discovery strip below the board
};

function getSettings() {
  const stored = safeGet(KEY_SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

function setSetting(key, value) {
  const settings = getSettings();
  settings[key] = value;
  safeSet(KEY_SETTINGS, settings);
}

function saveSettings(settings) {
  safeSet(KEY_SETTINGS, settings);
}

// ---- Daily Plays ----
function getDailyPlays() {
  return safeGet(KEY_DAILY(today()), 0);
}

function incrementDailyPlays() {
  const count = getDailyPlays() + 1;
  safeSet(KEY_DAILY(today()), count);
  return count;
}

// ---- Discovered Tiles (media catalog) ----
const KEY_DISCOVERED = '2048_discovered';

function getDiscoveredTiles() {
  return safeGet(KEY_DISCOVERED, []);
}

function setDiscoveredTiles(arr) {
  safeSet(KEY_DISCOVERED, arr);
}

// ---- Reset All ----
function resetAll() {
  try {
    // Remove all 2048_ keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('2048_')) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch { /* silent */ }
}

return { getBest, setBest, getHistory, addResult, clearHistory, getSettings, setSetting, saveSettings, getDailyPlays, incrementDailyPlays, getDiscoveredTiles, setDiscoveredTiles, resetAll };
})();

// ═══════════════════════════════════════════
// LOGIC MODULE
// ═══════════════════════════════════════════
const logic = (function() {
/* ============================================================
   logic.js — Mathematical heart. Pure functions only.
   No side-effects. No imports from mutable modules.
   ============================================================ */

// ---- Slide a single 1-D line towards index 0 (left) ----
// Returns: { result[], moves[], scoreIncrement }
// moves: [{from, to, value, isMergeResult, isMergeContributor}]
//   - isMergeResult: this tile's value doubles (stays at dest)
//   - isMergeContributor: this tile disappears into dest
//   - plain slide: just moves
function slideLine(line) {
  const n = line.length;
  const moves = [];
  let score = 0;

  // Collect non-zero tiles with source index
  const tiles = [];
  for (let i = 0; i < n; i++) {
    if (line[i] !== 0) tiles.push({ from: i, value: line[i] });
  }

  const result = new Array(n).fill(0);
  let dest = 0;
  let i = 0;

  while (i < tiles.length) {
    const curr = tiles[i];

    if (i + 1 < tiles.length && tiles[i + 1].value === curr.value) {
      // Merge: curr survives with doubled value, next disappears
      const next = tiles[i + 1];
      const newVal = curr.value * 2;
      score += newVal;
      result[dest] = newVal;

      moves.push({ from: curr.from, to: dest, value: curr.value, isMergeResult: true });
      moves.push({ from: next.from, to: dest, value: next.value, isMergeContributor: true });

      i += 2;
    } else {
      // Plain slide
      result[dest] = curr.value;
      moves.push({ from: curr.from, to: dest, value: curr.value });
      i += 1;
    }
    dest++;
  }

  return { result, moves, score };
}

// ---- Slide full grid in a direction ----
// Returns: { newGrid, moved, moves[], scoreIncrement }
// moves: [{fromRow, fromCol, toRow, toCol, value, isMergeResult, isMergeContributor}]
function slide(grid, direction) {
  const N = grid.length;
  // Work on a deep copy
  const newGrid = grid.map(r => [...r]);
  let totalScore = 0;
  let moved = false;
  const allMoves = [];

  // Helper: extract line, slide it, write back + map coordinates
  function processLine(lineGetter, lineSetter, coordMapper) {
    for (let r = 0; r < N; r++) {
      const line = lineGetter(r);
      const original = [...line];
      const { result, moves, score } = slideLine(line);

      lineSetter(r, result);
      totalScore += score;

      // Check change
      if (original.some((v, i) => v !== result[i])) moved = true;

      moves.forEach(m => {
        const [fromRow, fromCol] = coordMapper(r, m.from);
        const [toRow, toCol]     = coordMapper(r, m.to);
        allMoves.push({
          fromRow, fromCol, toRow, toCol,
          value: m.value,
          isMergeResult:      !!m.isMergeResult,
          isMergeContributor: !!m.isMergeContributor,
        });
      });
    }
  }

  switch (direction) {
    case 'left':
      processLine(
        r => [...newGrid[r]],
        (r, row) => { newGrid[r] = row; },
        (r, c)   => [r, c]
      );
      break;

    case 'right':
      processLine(
        r => [...newGrid[r]].reverse(),
        (r, row) => { newGrid[r] = [...row].reverse(); },
        (r, c)   => [r, N - 1 - c]
      );
      break;

    case 'up':
      processLine(
        r => newGrid.map(row => row[r]),
        (r, col) => { col.forEach((v, c) => { newGrid[c][r] = v; }); },
        (r, c)   => [c, r]
      );
      break;

    case 'down':
      processLine(
        r => newGrid.map(row => row[r]).reverse(),
        (r, col) => { [...col].reverse().forEach((v, c) => { newGrid[c][r] = v; }); },
        (r, c)   => [N - 1 - c, r]
      );
      break;
  }

  return { newGrid, moved, moves: allMoves, scoreIncrement: totalScore };
}

// ---- Spawn a random tile on an empty cell ----
// base: starting tile value (e.g. 3); spawns base or base*2 (weighted by prob4)
function spawnTile(grid, prob4 = 0.10, base = 2) {
  const empty = getEmptyCells(grid);
  if (empty.length === 0) return { newGrid: grid, spawned: null };

  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const value  = Math.random() < prob4 ? base * 2 : base;
  const newGrid = grid.map(row => [...row]);
  newGrid[r][c] = value;

  return { newGrid, spawned: { row: r, col: c, value } };
}

// ---- Utility ----
function getEmptyCells(grid) {
  const cells = [];
  grid.forEach((row, r) => row.forEach((v, c) => { if (v === 0) cells.push([r, c]); }));
  return cells;
}

function getMaxTile(grid) {
  return grid.reduce((max, row) => Math.max(max, ...row), 0);
}

function countTiles(grid) {
  return grid.reduce((n, row) => n + row.filter(v => v !== 0).length, 0);
}

function isGameOver(grid) {
  if (getEmptyCells(grid).length > 0) return false;
  const N = grid.length;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = grid[r][c];
      if (c + 1 < N && grid[r][c + 1] === v) return false;
      if (r + 1 < N && grid[r + 1][c] === v) return false;
    }
  }
  return true;
}

function hasWon(grid, winTile = 2048) {
  return grid.some(row => row.some(v => v >= winTile));
}

// Flatten non-zero values, shuffle, unflatten (Rearrange powerup)
function rearrangeGrid(grid) {
  const N = grid.length;
  const values = grid.flat().filter(v => v !== 0);
  // Fisher-Yates
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  const newGrid = grid.map(row => [...row]);
  let k = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (newGrid[r][c] !== 0) newGrid[r][c] = values[k++];
    }
  }
  return newGrid;
}

// Apply Laser: zero out one cell
function applyLaser(grid, row, col) {
  const newGrid = grid.map(r => [...r]);
  newGrid[row][col] = 0;
  return newGrid;
}

// Apply Double: double a single tile's value
function applyDouble(grid, row, col) {
  const newGrid = grid.map(r => [...r]);
  if (newGrid[row][col] !== 0) newGrid[row][col] *= 2;
  return newGrid;
}

// Apply Bomb: zero out 3×3 area centered on (row, col)
function applyBomb(grid, row, col) {
  const N = grid.length;
  const newGrid = grid.map(r => [...r]);
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
        newGrid[nr][nc] = 0;
      }
    }
  }
  return newGrid;
}

// Apply Upgrade: find the highest-value tile and double it
function applyUpgrade(grid) {
  let maxVal = 0, maxR = 0, maxC = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] > maxVal) { maxVal = grid[r][c]; maxR = r; maxC = c; }
    }
  }
  const newGrid = grid.map(row => [...row]);
  if (maxVal > 0) newGrid[maxR][maxC] *= 2;
  return { newGrid, row: maxR, col: maxC };
}

// Apply Swap: exchange the values of two cells
function applySwap(grid, r1, c1, r2, c2) {
  const newGrid = grid.map(row => [...row]);
  [newGrid[r1][c1], newGrid[r2][c2]] = [newGrid[r2][c2], newGrid[r1][c1]];
  return newGrid;
}

return { slideLine, slide, spawnTile, getEmptyCells, getMaxTile, countTiles, isGameOver, hasWon, rearrangeGrid, applyLaser, applyDouble, applyBomb, applyUpgrade, applySwap };
})();

// ═══════════════════════════════════════════
// TAGS MODULE
// ═══════════════════════════════════════════
/* ============================================================
   tags.js — Achievement Tag evaluation at Game Over.
   Pure function: takes game snapshot, returns array of tag objects.
   ============================================================ */

// (import removed)

// Tag definitions
const TAG_DEFS = [
  {
    id:    'purist',
    label: '🧘 Purist',
    desc:  'Completed without using any powerups',
    css:   'tag-purist',
    test:  ({ powersUsed, powersEnabled }) =>
      powersEnabled && powersUsed.size === 0,
  },
  {
    id:    'fossil',
    label: '🎯 Fossil',
    desc:  `A tile survived ${CONFIG.FOSSIL_TURNS}+ moves unmoved`,
    css:   'tag-fossil',
    test:  ({ maxTileAge }) => maxTileAge >= CONFIG.FOSSIL_TURNS,
  },
  {
    id:    'summit',
    label: '🏔 Summit',
    desc:  'Reached the win tile',
    css:   'tag-summit',
    test:  ({ maxTile, winTile }) => maxTile >= winTile,
  },
  {
    id:    'overclock',
    label: '🌋 Overclock',
    desc:  'Reached double the win tile or higher',
    css:   'tag-overclock',
    test:  ({ maxTile, winTile }) => maxTile >= winTile * 2,
  },
  {
    id:    'tortoise',
    label: '🐢 Tortoise',
    desc:  `Made ${CONFIG.TORTOISE_MOVES}+ moves`,
    css:   'tag-tortoise',
    test:  ({ totalMoves }) => totalMoves >= CONFIG.TORTOISE_MOVES,
  },
  {
    id:    'speedrun',
    label: '⚡ Speedrun',
    desc:  `Hit the win tile in ${CONFIG.SPEEDRUN_MOVES} moves or fewer`,
    css:   'tag-speedrun',
    test:  ({ maxTile, totalMoves, winTile }) =>
      maxTile >= winTile && totalMoves <= CONFIG.SPEEDRUN_MOVES,
  },
  {
    id:    'cleansweep',
    label: '🧹 Clean Sweep',
    desc:  'Board was reduced to 2 or fewer tiles in one turn',
    css:   'tag-cleansweep',
    test:  ({ minOccupiedCells }) => minOccupiedCells <= 2,
  },
  {
    id:    'surgeon',
    label: '🔬 Surgeon',
    desc:  'Used only the Laser powerup',
    css:   'tag-surgeon',
    test:  ({ powersUsed }) =>
      powersUsed.size > 0 &&
      [...powersUsed].every(p => p === 'LASER'),
  },
];

/**
 * Evaluate all tags for a completed game.
 *
 * @param {Object} snap
 * @param {number}  snap.maxTile
 * @param {number}  snap.totalMoves
 * @param {Set}     snap.powersUsed
 * @param {boolean} snap.powersEnabled
 * @param {number}  snap.minOccupiedCells
 * @param {number}  snap.maxTileAge
 * @param {number}  snap.winTile — runtime win tile (baseTile × 1024)
 * @returns {Array} Matching TAG_DEF objects
 */
function evaluateTags(snap) {
  const winTile = snap.winTile || CONFIG.WIN_TILE;
  return TAG_DEFS.filter(def => {
    try { return def.test({ ...snap, winTile }); } catch { return false; }
  });
}


// ═══════════════════════════════════════════
// STATE MODULE
// ═══════════════════════════════════════════
/* ============================================================
   state.js — Single source of truth for all mutable game state.
   Only main.js and renderer.js should mutate this.
   ============================================================ */

// (import removed)
// (import removed)

const state = {
  // ---- App navigation ----
  screen: 'MENU', // MENU | PLAYING | TARGETING | WON | GAME_OVER | HISTORY | SETTINGS

  // ---- Active game ----
  grid:         [],       // N×N array of numbers (0 = empty)
  score:        0,
  displayScore: 0,        // animated display value (chases `score`)
  best:         0,
  isNewBest:    false,

  // ---- Move tracking ----
  totalMoves:   0,
  turn:         0,        // increments each valid move
  gameStartTime: 0,

  // ---- Tile age tracking (for Fossil tag) ----
  // tileAges[r][c] = how many turns the tile at that cell has survived unmoved/unmerged
  tileAges: [],

  // ---- Win state ----
  winTile:         2048,  // computed at startNewGame: settings.baseTile × 1024
  won:             false,
  wonAcknowledged: false, // set true when user clicks Keep Going

  // ---- Powerup state ----
  powers:      {},        // { LASER: n, BOMB: n, REARRANGE: n }
  powersUsed:  new Set(), // Set of power names used this game
  activePower: null,      // null | 'LASER' | 'BOMB' | 'REARRANGE'
  powersEnabled: true,

  // ---- Tag tracking (gathered throughout the game) ----
  minOccupiedCells: 16,   // for Clean Sweep: lowest count in any single turn

  // ---- Undo history (stores snapshots for UNDO powerup) ----
  undoStack: [],  // [{grid, score, totalMoves, tileAges}] — max 3 deep
  freezeNextSpawn:   false, // FREEZE powerup: skip next tile spawn
  swapFirst:         null,  // {row,col} — first tile selected during SWAP targeting
  powerDropChoices:  null,  // [name, name, name] — pending picker, null when inactive

  // ---- Admin ----
  adminTapCount:  0,
  adminUnlocked:  false,

  // ---- Settings (live) ----
  settings: {},

  // ---- History ----
  history: [],

  // ---- Media Discovery (persistent across games) ----
  // Set of tile values the player has ever seen — drives the discovery panel
  discoveredTiles: new Set(),
};

// ---- Initialise from localStorage (call once at startup) ----
function initState() {
  state.best        = storage.getBest();
  state.settings    = storage.getSettings();
  state.history     = storage.getHistory();
  state.adminUnlocked = sessionStorage.getItem('2048_admin') === 'true';
  // Load persistent discoveries (survive across sessions)
  state.discoveredTiles = new Set(storage.getDiscoveredTiles());
}

// ---- Start a new game ----
function startNewGame() {
  const N        = state.settings.gridSize || CONFIG.GRID_SIZE;
  const baseTile = state.settings.baseTile  || CONFIG.BASE_TILE;
  state.winTile  = baseTile * 1024;

  state.grid      = Array.from({ length: N }, () => new Array(N).fill(0));
  state.tileAges  = Array.from({ length: N }, () => new Array(N).fill(0));
  state.score     = 0;
  state.displayScore = 0;
  state.isNewBest = false;

  state.totalMoves = 0;
  state.turn       = 0;
  state.gameStartTime = Date.now();

  state.won             = false;
  state.wonAcknowledged = false;

  state.powers = {
    LASER:     state.settings.laserCharges     ?? CONFIG.POWERS.LASER,
    BOMB:      state.settings.bombCharges      ?? CONFIG.POWERS.BOMB,
    REARRANGE: state.settings.rearrangeCharges ?? CONFIG.POWERS.REARRANGE,
    DOUBLE:    CONFIG.POWERS.DOUBLE,
    UNDO:      CONFIG.POWERS.UNDO,
    FREEZE:    CONFIG.POWERS.FREEZE,
    UPGRADE:   CONFIG.POWERS.UPGRADE,
    SWAP:      CONFIG.POWERS.SWAP,
  };
  state.powersUsed    = new Set();
  state.activePower   = null;
  state.powersEnabled = state.settings.powersEnabled ?? true;

  state.minOccupiedCells = N * N;
  state.undoStack        = [];
  state.freezeNextSpawn  = false;
  state.swapFirst        = null;
  state.powerDropChoices = null;

  state.screen = 'PLAYING';
}

// ---- Update tile ages after a move ----
// mergeDestinations: Set of "r,c" strings that received a merge result (reset age)
// movedFrom:        Set of "r,c" strings that were vacated (reset/clear)
function ageTiles(newGrid, mergeResultCells) {
  const N = newGrid.length;
  const mergeSet = new Set(mergeResultCells.map(([r, c]) => `${r},${c}`));

  const newAges = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (newGrid[r][c] === 0) {
        newAges[r][c] = 0;
      } else if (mergeSet.has(`${r},${c}`)) {
        newAges[r][c] = 0; // reset on merge
      } else {
        newAges[r][c] = (state.tileAges[r]?.[c] ?? 0) + 1;
      }
    }
  }
  state.tileAges = newAges;
}

// ---- Query max tile age (for Fossil tag) ----
function getMaxTileAge() {
  let max = 0;
  for (const row of state.tileAges) {
    for (const age of row) { if (age > max) max = age; }
  }
  return max;
}


// ═══════════════════════════════════════════
// RENDERER MODULE
// ═══════════════════════════════════════════
const renderer = (function() {
/* ============================================================
   renderer.js — The Artist. All Canvas drawing lives here.

   Animation pipeline per move:
     1. SLIDE   — tiles travel to new positions  (ANIM_SLIDE_MS)
     2. MERGE   — merged tiles pop with scale    (ANIM_MERGE_MS)
     3. SPAWN   — new tile scales in             (ANIM_SPAWN_MS)
     4. IDLE    — grid drawn statically
   ============================================================ */

// (import removed)
// (import removed)

// ---- Canvas / context ----
let canvas, ctx;
let logW = 0, logH = 0;   // logical (CSS) dimensions
let dpr   = 1;

// ---- Current layout (set each frame for use by helpers like drawTile) ----
let curLayout = null;

// ---- Animation state ----
let phase   = 'idle';      // 'idle' | 'slide' | 'merge' | 'spawn'
let phaseStart = 0;
let phaseDur   = 0;

// Slide data
let slideGrid  = null;     // pre-slide grid values (to draw from)
let slideMoves = [];       // [{fromRow,fromCol,toRow,toCol,value,isMergeResult,isMergeContributor}]
let mergeResultCells = []; // [{row,col}] — cells that need a pop after slide

// Spawn data
let spawnCell = null;      // {row,col,value}

// Callback invoked when last animation phase ends
let onAnimDone = null;

// ---- Hit-areas (for input module) ----
// Populated each render so input.js can do hit-testing
let hitAreas = {
  powerups:         [],   // [{name, x,y,w,h}]  — absolute canvas coords
  quitBtn:          null, // {x,y,w,h}
  cells:            [],   // [{row,col,x,y,w,h}] — used during TARGETING
  arrows:           [],   // [{dir, x,y,w,h}]    — directional bumper buttons
  barRect:          null, // {x,y,w,h}           — full powerup bar area for drag detection
  scrollTrack:      null, // {x,y,w,h,maxScroll} — scroll indicator track for click-to-jump
  powerDropChoices: [],   // [{name, x,y,w,h}]   — 3-choice picker buttons
};

// ---- Discovery panel reserved height (DOM element below canvas) ----
let discoveryPanelH = 0;
function setDiscoveryPanelH(h) { discoveryPanelH = h; }

// ---- Preloaded media images (tile backgrounds + discovery cards) ----
// Populated lazily: mediaImages[tileValue] = HTMLImageElement
const mediaImages = {};
function preloadMediaImage(value, src) {
  if (mediaImages[value]) return;
  const img = new Image();
  img.src = src;
  mediaImages[value] = img;
}

// ---- Powerup bar scroll state ----
let barScrollX   = 0;
const BTN_W      = 82;   // fixed button width (intentionally NOT scaled — keeps scroll manageable)
const BTN_GAP    = 8;
const BAR_PAD    = 10;   // inner left/right padding

function setBarScroll(x) {
  barScrollX = x; // clamped in drawPowerupBar each frame
}
function getBarScrollX() { return barScrollX; }

// ============================================================
// PUBLIC API
// ============================================================

function init(canvasEl) {
  canvas = canvasEl;
  ctx    = canvas.getContext('2d');
  resize();
}

function resize() {
  dpr  = window.devicePixelRatio || 1;
  // Always use viewport dimensions — canvas fills the full screen
  logW = window.innerWidth;
  logH = window.innerHeight;
  canvas.width  = logW * dpr;
  canvas.height = logH * dpr;
  canvas.style.width  = logW + 'px';
  canvas.style.height = logH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// Called by main.js each rAF tick
function render(timestamp) {
  ctx.clearRect(0, 0, logW, logH);

  const layout = getLayout();
  curLayout = layout;
  drawBackground(layout);
  drawHeader(layout);

  const t = phaseProg(timestamp);

  if (phase === 'idle') {
    drawGrid(layout, state.grid);
  } else if (phase === 'slide') {
    drawSlide(layout, t);
  } else if (phase === 'merge') {
    drawGrid(layout, state.grid, t);
  } else if (phase === 'spawn') {
    drawGrid(layout, state.grid, 0, t);
  }

  drawArrowBumpers(layout);

  if (state.settings.powersEnabled !== false) {
    drawPowerupBar(layout);
  }

  if (state.screen === 'TARGETING') {
    drawTargetingOverlay(layout);
  }

  if (state.freezeNextSpawn) drawFreezeIndicator(layout);
  drawPowerDropToast(layout, timestamp);

  if (state.powerDropChoices) drawPowerDropPicker(layout);

  // Advance phase
  if (phase !== 'idle' && t >= 1) {
    nextPhase(timestamp);
  }
}

function isAnimating() {
  return phase !== 'idle';
}

// Kick off a full slide animation sequence
function startSlideAnim(preGrid, moves, spawned, callback) {
  slideGrid        = preGrid;
  slideMoves       = moves;
  spawnCell        = spawned;
  onAnimDone       = callback;
  mergeResultCells = moves
    .filter(m => m.isMergeResult)
    .map(m => ({ row: m.toRow, col: m.toCol }));

  setPhase('slide', CONFIG.ANIM_SLIDE_MS);
}

// Instant rearrange (no slide anim, but show spawn-like flash)
function flashRearrange(callback) {
  onAnimDone = callback;
  setPhase('spawn', CONFIG.ANIM_SPAWN_MS);
  spawnCell = null; // flash whole board
}

// Flash a single cell (used for UPGRADE visual)
function flashCell(row, col, callback) {
  spawnCell  = { row, col };
  onAnimDone = callback;
  setPhase('spawn', CONFIG.ANIM_SPAWN_MS);
}

// ---- Powerup icon/label definitions (single source of truth) ----
const POWER_META = {
  LASER:     { icon: '⚡', label: 'LASER' },
  BOMB:      { icon: '💣', label: 'BOMB' },
  REARRANGE: { icon: '🔀', label: 'SHUFFLE' },
  DOUBLE:    { icon: '×2', label: 'DOUBLE' },
  UNDO:      { icon: '↩',  label: 'UNDO' },
  FREEZE:    { icon: '❄',  label: 'FREEZE' },
  UPGRADE:   { icon: '⬆',  label: 'UPGRADE' },
  SWAP:      { icon: '↔',  label: 'SWAP' },
};
const ALL_POWER_NAMES = Object.keys(POWER_META);

// ---- Power-drop toast notification ----
let powerDropToast = null; // { text, alpha, startTime }

function showPowerDrop(powerName) {
  const meta = POWER_META[powerName];
  powerDropToast = { text: `+1 ${meta ? meta.icon + ' ' + meta.label : powerName}`, alpha: 1, startTime: performance.now() };
}

function getLayout() {
  return computeLayout(logW, logH);
}

// ============================================================
// LAYOUT COMPUTATION
// ============================================================

// Base bumper dimensions (scaled by S at layout time)
const BMP_TB_BASE  = 22;   // top / bottom bumper height
const BMP_LR_BASE  = 22;   // left / right bumper width
const BMP_GAP_BASE = 5;    // gap between bumper and board edge

function computeLayout(w, h) {
  const N = state.grid.length || CONFIG.GRID_SIZE;

  // Reserve space for HTML discovery panel at bottom
  h = h - discoveryPanelH;

  // ---- UI scale factor: 1.0 on phones, up to 1.5 on desktop ----
  // Derived from the shorter viewport dimension for consistent proportions
  const shortest = Math.min(w, h);
  const S = shortest < 500 ? 1 : Math.min(shortest / 500, 1.5);

  // Scaled chrome dimensions
  const HEADER_H   = Math.round(56 * S);
  const POWERBAR_H = state.settings.powersEnabled !== false ? Math.round(78 * S) : 0;
  const MARGIN_V   = Math.round(8 * S);
  const MARGIN_H   = Math.round(8 * S);
  const bmpTB      = Math.round(BMP_TB_BASE * S);
  const bmpLR      = Math.round(BMP_LR_BASE * S);
  const bmpGap     = Math.round(BMP_GAP_BASE * S);

  // Vertical stack: header | margin | top-bumper+gap | BOARD | gap+bot-bumper | margin | powerbar
  const fixedV = HEADER_H + MARGIN_V + (bmpTB + bmpGap) * 2 + POWERBAR_H + MARGIN_V;
  const availH  = h - fixedV;

  // Horizontal: margin | left-bumper+gap | BOARD | gap+right-bumper | margin
  const fixedH = 2 * MARGIN_H + 2 * (bmpLR + bmpGap);
  const availW  = w - fixedH;

  // Board fills remaining space — no arbitrary pixel cap
  const boardSize = Math.min(availH, availW);

  // Board origin — centred horizontally
  const boardX = (w - boardSize) / 2;
  const topOfBoard = HEADER_H + MARGIN_V + bmpTB + bmpGap;
  // On phones, cap vertical centering to keep board tight; on desktop, centre freely
  const centerCap = shortest < 500 ? 16 : Infinity;
  const boardY = topOfBoard + Math.max(0, Math.min((availH - boardSize) / 2, centerCap));

  // Scaled tile geometry
  const gap      = Math.round(CONFIG.TILE_GAP * S);
  const padding  = Math.round(CONFIG.BOARD_PADDING * S);
  const cellSize = (boardSize - 2 * padding - (N - 1) * gap) / N;

  // Powerbar sits directly below board + bottom bumper + margin
  const powerBarY = boardY + boardSize + bmpGap + bmpTB + MARGIN_V;

  // Scaled radii
  const boardRadius = Math.round(CONFIG.BOARD_RADIUS * S);
  const tileRadius  = Math.round(CONFIG.TILE_RADIUS * S);

  return {
    w, h, boardX, boardY, boardSize, N, gap, padding, cellSize,
    HEADER_H, POWERBAR_H, powerBarY,
    S, bmpTB, bmpLR, bmpGap, boardRadius, tileRadius,
  };
}

// Cell top-left pixel
function cellTL(row, col, layout) {
  const { boardX, boardY, cellSize, gap, padding } = layout;
  return {
    x: boardX + padding + col * (cellSize + gap),
    y: boardY + padding + row * (cellSize + gap),
  };
}

// ============================================================
// DRAWING — Background
// ============================================================

function drawBackground(_layout) {
  ctx.fillStyle = CONFIG.COLORS.BG;
  ctx.fillRect(0, 0, logW, logH); // full canvas — including area behind the discovery panel
}

// ============================================================
// DRAWING — Header (Score + Quit button)
// ============================================================

function drawHeader(layout) {
  const { w, h, HEADER_H, S } = layout;
  const cy = HEADER_H / 2;

  // Quit button — left side; shrinks to X on portrait/mobile
  const isMobile = h > w;
  const qW = Math.round((isMobile ? 28 : 48) * S);
  const qH = Math.round((isMobile ? 28 : 30) * S);
  const qX = Math.round(10 * S), qY = cy - qH / 2;
  roundRect(ctx, qX, qY, qW, qH, Math.round(7 * S));
  ctx.fillStyle = CONFIG.COLORS.BOARD_BG;
  ctx.fill();
  ctx.fillStyle    = CONFIG.COLORS.TEXT_LIGHT;
  ctx.font         = `bold ${Math.round((isMobile ? 14 : 11) * S)}px ${CONFIG.FONT_FAMILY}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isMobile ? '✕' : 'QUIT', qX + qW / 2, qY + qH / 2);
  hitAreas.quitBtn = { x: qX, y: qY, w: qW, h: qH };

  // Score boxes — centred
  const boxW = Math.round(72 * S), boxH = Math.round(40 * S), gap = Math.round(8 * S);
  const totalW = boxW * 2 + gap;
  const bx = (w - totalW) / 2;
  const by = cy - boxH / 2;
  drawScoreBox(bx,          by, boxW, boxH, 'SCORE', Math.round(state.displayScore), S);
  drawScoreBox(bx + boxW + gap, by, boxW, boxH, 'BEST',  state.best, S);
}

function drawScoreBox(x, y, w, h, label, value, S) {
  roundRect(ctx, x, y, w, h, Math.round(6 * S));
  ctx.fillStyle = CONFIG.COLORS.BOARD_BG;
  ctx.fill();

  ctx.fillStyle    = 'rgba(249,246,242,0.70)';
  ctx.font         = `bold ${Math.round(10 * S)}px ${CONFIG.FONT_FAMILY}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + Math.round(11 * S));

  ctx.fillStyle = CONFIG.COLORS.TEXT_LIGHT;
  const baseFontSize = value >= 100000 ? 12 : value >= 10000 ? 14 : 17;
  ctx.font       = `bold ${Math.round(baseFontSize * S)}px ${CONFIG.FONT_FAMILY}`;
  ctx.fillText(String(value), x + w / 2, y + h - Math.round(12 * S));
}

// ============================================================
// DRAWING — Directional Arrow Bumpers
// ============================================================

function drawArrowBumpers(layout) {
  const { boardX, boardY, boardSize, bmpTB, bmpLR, bmpGap, S } = layout;
  const isTargeting = state.screen === 'TARGETING';

  // Top / bottom: full board width, thin height
  // Left / right: full board height, thin width
  const bumpers = [
    { dir: 'up',
      x: boardX,                          y: boardY - bmpGap - bmpTB,
      w: boardSize,                       h: bmpTB, arrow: '↑' },
    { dir: 'down',
      x: boardX,                          y: boardY + boardSize + bmpGap,
      w: boardSize,                       h: bmpTB, arrow: '↓' },
    { dir: 'left',
      x: boardX - bmpGap - bmpLR,        y: boardY,
      w: bmpLR,                           h: boardSize, arrow: '←' },
    { dir: 'right',
      x: boardX + boardSize + bmpGap,     y: boardY,
      w: bmpLR,                           h: boardSize, arrow: '→' },
  ];

  hitAreas.arrows = [];

  bumpers.forEach(b => {
    ctx.save();

    // Pill background
    roundRect(ctx, b.x, b.y, b.w, b.h, Math.round(8 * S));
    ctx.fillStyle = isTargeting ? 'rgba(187,173,160,0.15)' : 'rgba(187,173,160,0.38)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth   = 1;
    ctx.stroke();

    // Arrow glyph — sized to the thinner dimension
    ctx.globalAlpha  = isTargeting ? 0.25 : 0.75;
    ctx.fillStyle    = CONFIG.COLORS.TEXT_DARK;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    const thin = Math.min(b.w, b.h);
    ctx.font = `bold ${Math.round(thin * 0.58)}px ${CONFIG.FONT_FAMILY}`;
    ctx.fillText(b.arrow, b.x + b.w / 2, b.y + b.h / 2);

    ctx.restore();
    hitAreas.arrows.push({ dir: b.dir, x: b.x, y: b.y, w: b.w, h: b.h });
  });
}

// ============================================================
// DRAWING — Board + Tiles
// ============================================================

function drawBoard(layout) {
  const { boardX, boardY, boardSize, N, cellSize, gap, padding, boardRadius, tileRadius } = layout;

  // Board background
  roundRect(ctx, boardX, boardY, boardSize, boardSize, boardRadius);
  ctx.fillStyle = CONFIG.COLORS.BOARD_BG;
  ctx.fill();

  // Empty cells
  hitAreas.cells = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const { x, y } = cellTL(r, c, layout);
      roundRect(ctx, x, y, cellSize, cellSize, tileRadius);
      ctx.fillStyle = CONFIG.COLORS.CELL_EMPTY;
      ctx.fill();
      hitAreas.cells.push({ row: r, col: c, x, y, w: cellSize, h: cellSize });
    }
  }
}

// Draw the grid statically.
// mergeT   (0-1): tiles in mergeResultCells get a scale pop
// spawnT   (0-1): spawnCell scales in (or all tiles if spawnCell===null = rearrange flash)
function drawGrid(layout, grid, mergeT = 0, spawnT = 0) {
  drawBoard(layout);
  const { N, cellSize } = layout;

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = grid[r][c];
      if (v === 0) continue;

      const { x, y } = cellTL(r, c, layout);
      let scale = 1;

      // Merge pop
      if (mergeT > 0 && mergeResultCells.some(m => m.row === r && m.col === c)) {
        scale = 1 + 0.22 * Math.sin(mergeT * Math.PI);
      }

      // Spawn scale-in (single cell or whole board flash for rearrange)
      if (spawnT > 0) {
        const isSpawn = spawnCell
          ? (spawnCell.row === r && spawnCell.col === c)
          : true; // rearrange: all tiles
        if (isSpawn) {
          scale = easeOutBack(spawnT);
        }
      }

      drawTile(x, y, cellSize, v, scale);
    }
  }
}

// Draw tiles mid-slide
function drawSlide(layout, t) {
  drawBoard(layout);
  const { cellSize } = layout;

  // Which cells are covered by animation (to avoid double-draw)
  // We draw all tiles from slideMoves, lerped to destination
  const drawnFrom = new Set();

  slideMoves.forEach(m => {
    const key = `${m.fromRow},${m.fromCol}`;
    if (drawnFrom.has(key)) return;
    drawnFrom.add(key);

    const from = cellTL(m.fromRow, m.fromCol, layout);
    const to   = cellTL(m.toRow,   m.toCol,   layout);

    const et = easeOutQuart(t);
    const cx = lerp(from.x, to.x, et);
    const cy = lerp(from.y, to.y, et);

    // Merge contributors fade out near end
    const alpha = m.isMergeContributor ? Math.max(0, 1 - t * 2) : 1;

    drawTile(cx, cy, cellSize, m.value, 1, alpha);
  });

  // Also draw tiles that weren't part of any move (stationary)
  const { N } = layout;
  const movedFromSet = new Set(slideMoves.map(m => `${m.fromRow},${m.fromCol}`));
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!movedFromSet.has(`${r},${c}`) && slideGrid[r][c] !== 0) {
        const { x, y } = cellTL(r, c, layout);
        drawTile(x, y, cellSize, slideGrid[r][c]);
      }
    }
  }
}

// ============================================================
// DRAWING — Individual Tile
// ============================================================

function drawTile(x, y, size, value, scale = 1, alpha = 1) {
  const baseTile = state.settings.baseTile || CONFIG.BASE_TILE;
  const colors   = getTileColors(value, baseTile);
  const tileR    = curLayout ? curLayout.tileRadius : CONFIG.TILE_RADIUS;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (scale !== 1) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-size / 2, -size / 2);
    x = 0; y = 0;
  }

  // Glow for high-value tiles
  if (colors.glow) {
    ctx.shadowColor  = colors.glow;
    ctx.shadowBlur   = colors.glowRadius * scale;
  }

  // Tile background
  roundRect(ctx, x, y, size, size, tileR);
  ctx.fillStyle = colors.bg;
  ctx.fill();

  ctx.shadowBlur = 0;

  // Faded media art background (if image loaded)
  const img = mediaImages[value];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.18;
    ctx.beginPath();
    roundRect(ctx, x, y, size, size, tileR);
    ctx.clip();
    // Cover-fit: fill the tile square
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale2 = Math.max(size / iw, size / ih);
    const dw = iw * scale2, dh = ih * scale2;
    ctx.drawImage(img, x - (dw - size) / 2, y - (dh - size) / 2, dw, dh);
    ctx.restore();
  }

  // Text
  const digits = String(value).length;
  let fontSize = size * 0.42;
  if (digits === 3) fontSize = size * 0.34;
  if (digits === 4) fontSize = size * 0.27;
  if (digits >= 5)  fontSize = size * 0.22;

  ctx.fillStyle    = colors.text;
  ctx.font         = `bold ${Math.round(fontSize)}px ${CONFIG.FONT_FAMILY}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(value), x + size / 2, y + size / 2);

  ctx.restore();
}

// ============================================================
// DRAWING — Powerup Bar (Glassmorphism)
// ============================================================

function drawPowerupBar(layout) {
  const { boardX, boardSize, POWERBAR_H, powerBarY, S } = layout;
  const barW = boardSize;
  const barH = Math.min(Math.round(70 * S), POWERBAR_H - Math.round(8 * S));
  const barX = boardX;
  const barY = powerBarY + (POWERBAR_H - barH) / 2;

  // Expose bar rect for drag detection in input.js
  hitAreas.barRect = { x: barX, y: barY, w: barW, h: barH };

  // Build power list from the single POWER_META source
  const allPowers = ALL_POWER_NAMES.map(name => ({ name, ...POWER_META[name] }));

  // Sort: highest charge count on the left
  const sorted = [...allPowers].sort((a, b) => {
    const ca = state.powers[a.name] ?? 0;
    const cb = state.powers[b.name] ?? 0;
    return cb - ca;
  });

  const btnH      = barH - Math.round(14 * S);   // button height leaves room for scroll indicator
  const contentW  = sorted.length * BTN_W + (sorted.length - 1) * BTN_GAP + 2 * BAR_PAD;
  const maxScroll = Math.max(0, contentW - barW);

  // Clamp scroll
  barScrollX = Math.max(0, Math.min(barScrollX, maxScroll));

  // ---- Bar glass background ----
  ctx.save();
  roundRect(ctx, barX, barY, barW, barH, Math.round(14 * S));
  ctx.fillStyle = 'rgba(187,173,160,0.32)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth   = 1;
  ctx.stroke();

  // ---- Clip to bar interior so buttons don't bleed over edges ----
  roundRect(ctx, barX + 1, barY + 1, barW - 2, barH - 2, Math.round(13 * S));
  ctx.clip();

  hitAreas.powerups = [];

  sorted.forEach((p, i) => {
    const charges = state.powers[p.name] ?? 0;
    const active  = state.activePower === p.name;
    const empty   = charges <= 0;

    // Absolute X in canvas space (accounting for scroll)
    const bX = barX + BAR_PAD + i * (BTN_W + BTN_GAP) - barScrollX;
    const bY = barY + (barH - btnH) / 2 - Math.round(3 * S); // shift up slightly for scroll indicator

    // Skip if entirely outside bar
    if (bX + BTN_W < barX || bX > barX + barW) return;

    // Button background
    roundRect(ctx, bX, bY, BTN_W, btnH, Math.round(10 * S));
    ctx.fillStyle = active ? CONFIG.COLORS.TEXT_DARK
                  : empty  ? 'rgba(0,0,0,0.06)'
                           : 'rgba(255,255,255,0.52)';
    ctx.fill();

    ctx.globalAlpha = empty ? 0.32 : 1;

    // Icon — scale font with button height
    ctx.fillStyle    = active ? CONFIG.COLORS.TEXT_LIGHT : CONFIG.COLORS.TEXT_DARK;
    ctx.font         = `${Math.round(btnH * 0.36)}px ${CONFIG.FONT_FAMILY}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.icon, bX + BTN_W / 2, bY + btnH * 0.38);

    // Label — scale with S
    ctx.font      = `bold ${Math.round(8 * S)}px ${CONFIG.FONT_FAMILY}`;
    ctx.fillStyle = active ? CONFIG.COLORS.TEXT_LIGHT : CONFIG.COLORS.TEXT_DARK;
    ctx.fillText(p.label, bX + BTN_W / 2, bY + btnH * 0.70);

    ctx.globalAlpha = 1;

    // Charge badge
    if (charges > 0) {
      const bR  = Math.round(8 * S);
      const bCX = bX + BTN_W - bR + 1;
      const bCY = bY + bR - 1;
      ctx.beginPath();
      ctx.arc(bCX, bCY, bR, 0, Math.PI * 2);
      ctx.fillStyle = active ? CONFIG.COLORS.TEXT_LIGHT : CONFIG.COLORS.BOARD_BG;
      ctx.fill();
      ctx.fillStyle = active ? CONFIG.COLORS.TEXT_DARK : CONFIG.COLORS.TEXT_LIGHT;
      ctx.font      = `bold ${Math.round(10 * S)}px ${CONFIG.FONT_FAMILY}`;
      ctx.fillText(String(charges), bCX, bCY);
    }

    // Register hit area only if button centre is within bar bounds
    const cx = bX + BTN_W / 2;
    if (cx >= barX && cx <= barX + barW) {
      hitAreas.powerups.push({ name: p.name, x: bX, y: bY, w: BTN_W, h: btnH });
    }
  });

  ctx.restore(); // end clip

  // ---- Scroll indicator (only if scrollable) ----
  if (maxScroll > 0) {
    const indicatorY  = barY + barH - Math.round(5 * S);
    const trackW      = barW - Math.round(24 * S);
    const trackX      = barX + Math.round(12 * S);
    const thumbW      = Math.max(Math.round(28 * S), trackW * (barW / contentW));
    const thumbX      = trackX + (barScrollX / maxScroll) * (trackW - thumbW);
    const trackH      = Math.round(3 * S);

    // Register a generous hit area around the track for click-to-jump
    hitAreas.scrollTrack = { x: trackX, y: indicatorY - Math.round(8 * S), w: trackW, h: Math.round(16 * S), maxScroll, thumbW };

    // Track
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle   = CONFIG.COLORS.TEXT_DARK;
    ctx.beginPath();
    ctx.roundRect(trackX, indicatorY, trackW, trackH, trackH / 2);
    ctx.fill();

    // Thumb
    ctx.globalAlpha = 0.55;
    ctx.fillStyle   = CONFIG.COLORS.TEXT_DARK;
    ctx.beginPath();
    ctx.roundRect(thumbX, indicatorY, thumbW, trackH, trackH / 2);
    ctx.fill();
    ctx.restore();
  } else {
    hitAreas.scrollTrack = null;
  }
}

// ============================================================
// DRAWING — Targeting Overlay
// ============================================================

function drawTargetingOverlay(layout) {
  const { boardX, boardY, boardSize, N, cellSize, boardRadius, tileRadius, S } = layout;

  // Dim the board
  roundRect(ctx, boardX, boardY, boardSize, boardSize, boardRadius);
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.fill();

  // Pulse factor driven by time
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 220);

  // Highlight valid target cells
  const power = state.activePower;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const { x, y } = cellTL(r, c, layout);
      const isEmpty  = state.grid[r][c] === 0;

      // BOMB can target any cell; LASER/DOUBLE need non-empty; SWAP targets any cell
      const valid = (power === 'BOMB' || power === 'SWAP') || !isEmpty;
      if (!valid) continue;

      // For SWAP, highlight the already-selected first tile in gold
      const isSwapFirst = (power === 'SWAP' && state.swapFirst &&
                           state.swapFirst.row === r && state.swapFirst.col === c);

      ctx.save();
      roundRect(ctx, x, y, cellSize, cellSize, tileRadius);
      ctx.strokeStyle = isSwapFirst
        ? `rgba(237,194,46,${0.7 + 0.3 * pulse})`
        : `rgba(255,255,255,${0.5 + 0.5 * pulse})`;
      ctx.lineWidth = isSwapFirst ? Math.round(4 * S) : Math.round(3 * S);
      ctx.stroke();
      if (!isEmpty) {
        ctx.fillStyle = isSwapFirst
          ? `rgba(237,194,46,${0.15 + 0.1 * pulse})`
          : `rgba(255,255,255,${0.08 + 0.08 * pulse})`;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Hint text
  let hint = 'Tap a tile  ·  Swipe to cancel';
  if (power === 'SWAP') {
    hint = state.swapFirst ? 'Tap second tile  ·  Swipe to cancel' : 'Tap first tile  ·  Swipe to cancel';
  }
  ctx.fillStyle    = 'rgba(255,255,255,0.85)';
  ctx.font         = `bold ${Math.round(13 * S)}px ${CONFIG.FONT_FAMILY}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(hint, boardX + boardSize / 2, boardY - Math.round(14 * S));
}

// ============================================================
// DRAWING — Power-drop 3-Choice Picker
// ============================================================

function drawPowerDropPicker(layout) {
  const { w, h, S } = layout;

  // Full-screen dim
  ctx.fillStyle = 'rgba(0,0,0,0.58)';
  ctx.fillRect(0, 0, w, h);

  // Card — scale all dimensions
  const btnW = Math.round(82 * S), btnH = Math.round(92 * S), btnGap = Math.round(10 * S);
  const totalBtnW = 3 * btnW + 2 * btnGap;
  const cardPadX = Math.round(24 * S), cardPadTop = Math.round(44 * S), cardPadBot = Math.round(20 * S);
  const cardW = totalBtnW + cardPadX * 2;
  const cardH = cardPadTop + btnH + cardPadBot;
  const cardX = (w - cardW) / 2;
  const cardY = (h - cardH) / 2;

  roundRect(ctx, cardX, cardY, cardW, cardH, Math.round(20 * S));
  ctx.fillStyle = CONFIG.COLORS.BG;  // Almond — stays on-palette
  ctx.fill();
  ctx.strokeStyle = 'rgba(187,173,160,0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Title
  ctx.fillStyle    = CONFIG.COLORS.TEXT_DARK;
  ctx.font         = `bold ${Math.round(13 * S)}px ${CONFIG.FONT_FAMILY}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡ Power Drop — pick one!', w / 2, cardY + Math.round(22 * S));

  // Buttons
  const btnStartX = cardX + cardPadX;
  const btnY      = cardY + cardPadTop;

  hitAreas.powerDropChoices = [];

  (state.powerDropChoices || []).forEach((name, i) => {
    const meta = POWER_META[name] || { icon: '?', label: name };
    const bX   = btnStartX + i * (btnW + btnGap);

    // Button bg
    roundRect(ctx, bX, btnY, btnW, btnH, Math.round(12 * S));
    ctx.fillStyle = 'rgba(187,173,160,0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(187,173,160,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Icon
    ctx.font         = `${Math.round(btnH * 0.36)}px ${CONFIG.FONT_FAMILY}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = CONFIG.COLORS.TEXT_DARK;
    ctx.fillText(meta.icon, bX + btnW / 2, btnY + btnH * 0.38);

    // Label
    ctx.font      = `bold ${Math.round(9 * S)}px ${CONFIG.FONT_FAMILY}`;
    ctx.fillStyle = CONFIG.COLORS.TEXT_DARK;
    ctx.fillText(meta.label, bX + btnW / 2, btnY + btnH * 0.76);

    hitAreas.powerDropChoices.push({ name, x: bX, y: btnY, w: btnW, h: btnH });
  });
}

// ============================================================
// DRAWING — Freeze Active Indicator
// ============================================================

function drawFreezeIndicator(layout) {
  const { boardX, boardY, boardSize, S } = layout;
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
  ctx.save();
  ctx.globalAlpha = 0.7 + 0.3 * pulse;
  ctx.fillStyle   = CONFIG.FREEZE_INDICATOR_COLOR;
  ctx.font        = `bold ${Math.round(11 * S)}px ${CONFIG.FONT_FAMILY}`;
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('❄ SPAWN FROZEN', boardX + boardSize / 2, boardY - Math.round(14 * S));
  ctx.restore();
}

// ============================================================
// DRAWING — Power-drop Toast
// ============================================================

function drawPowerDropToast(layout, timestamp) {
  if (!powerDropToast) return;
  const elapsed = timestamp - powerDropToast.startTime;
  const DURATION = 1800;
  if (elapsed >= DURATION) { powerDropToast = null; return; }

  const progress = elapsed / DURATION;
  const alpha    = progress < 0.6 ? 1 : 1 - (progress - 0.6) / 0.4;
  const rise     = -30 * progress; // float upward

  const { boardX, boardSize, boardY, S } = layout;
  const cx = boardX + boardSize / 2;
  const cy = boardY + boardSize / 2 + rise;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Pill background
  const PAD_X = Math.round(16 * S);
  ctx.font = `bold ${Math.round(14 * S)}px ${CONFIG.FONT_FAMILY}`;
  const textW = ctx.measureText(powerDropToast.text).width;
  const pillW = textW + PAD_X * 2;
  const pillH = Math.round(30 * S);
  roundRect(ctx, cx - pillW / 2, cy - pillH / 2, pillW, pillH, Math.round(15 * S));
  ctx.fillStyle = CONFIG.COLORS.TEXT_DARK;
  ctx.fill();

  ctx.fillStyle    = CONFIG.COLORS.TEXT_LIGHT;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(powerDropToast.text, cx, cy);

  ctx.restore();
}

// ============================================================
// ANIMATION PHASE MANAGEMENT
// ============================================================

function setPhase(name, dur) {
  phase      = name;
  phaseStart = performance.now();
  phaseDur   = dur;
}

function phaseProg(timestamp) {
  if (phaseDur === 0) return 1;
  return Math.min(1, (timestamp - phaseStart) / phaseDur);
}

function nextPhase(timestamp) {
  if (phase === 'slide') {
    if (mergeResultCells.length > 0 && (state.settings.animEnabled !== false)) {
      setPhase('merge', CONFIG.ANIM_MERGE_MS);
    } else {
      goToSpawnOrDone(timestamp);
    }
  } else if (phase === 'merge') {
    goToSpawnOrDone(timestamp);
  } else if (phase === 'spawn') {
    phase = 'idle';
    if (onAnimDone) { const cb = onAnimDone; onAnimDone = null; cb(); }
  }
}

function goToSpawnOrDone() {
  if (spawnCell) {
    setPhase('spawn', CONFIG.ANIM_SPAWN_MS);
  } else {
    phase = 'idle';
    if (onAnimDone) { const cb = onAnimDone; onAnimDone = null; cb(); }
  }
}

// ============================================================
// HELPERS
// ============================================================

function roundRect(ctx, x, y, w, h, r) {
  const minR = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + minR, y);
  ctx.lineTo(x + w - minR, y);
  ctx.arcTo(x + w, y,     x + w, y + minR,     minR);
  ctx.lineTo(x + w, y + h - minR);
  ctx.arcTo(x + w, y + h, x + w - minR, y + h, minR);
  ctx.lineTo(x + minR, y + h);
  ctx.arcTo(x, y + h,   x, y + h - minR,       minR);
  ctx.lineTo(x, y + minR);
  ctx.arcTo(x, y,       x + minR, y,            minR);
  ctx.closePath();
}

// Easing functions
function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }

function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function lerp(a, b, t) { return a + (b - a) * t; }

return { init, resize, render, isAnimating, startSlideAnim, flashRearrange, flashCell, showPowerDrop, getLayout, setDiscoveryPanelH, preloadMediaImage, setBarScroll, getBarScrollX, hitAreas };
})();

// ═══════════════════════════════════════════
// INPUT MODULE
// ═══════════════════════════════════════════
const input = (function() {
  const { hitAreas, setBarScroll, getBarScrollX, getLayout } = renderer;
/* ============================================================
   input.js — Unified input handler.
   Handles keyboard arrows, pointer swipes, canvas taps,
   and horizontal drag-to-scroll on the powerup bar.
   ============================================================ */

// (import removed)

const SWIPE_THRESHOLD  = 30;   // px minimum for swipe recognition
const SWIPE_TIMEOUT_MS = 500;  // ignore slow drags
const TAP_THRESHOLD    = 8;    // px — anything smaller is a tap, even in bar
const BOARD_TOUCH_PAD  = 30;   // px padding around board for touch capture (covers bumpers)

let onSwipe = null;   // (direction: 'left'|'right'|'up'|'down') => void
let onTap   = null;   // (x, y) => void — canvas-space coordinates

// General pointer state
let pointerStart  = null;
let pointerStartT = 0;

// Bar-drag state (separate from board swipe)
let barDragging       = false;
let barDragStartX     = 0;
let barScrollAtStart  = 0;

function setup(canvas, swipeCb, tapCb) {
  onSwipe = swipeCb;
  onTap   = tapCb;

  // ---- Keyboard ----
  window.addEventListener('keydown', onKey, { passive: false });

  // ---- Pointer (mouse + touch via PointerEvents) ----
  canvas.addEventListener('pointerdown',   onPointerDown,   { passive: true });
  canvas.addEventListener('pointermove',   onPointerMove,   { passive: true });
  canvas.addEventListener('pointerup',     onPointerUp,     { passive: true });
  canvas.addEventListener('pointercancel', onPointerCancel, { passive: true });

  // Only prevent default (block scrolling) when touch starts on the board or powerup bar.
  // Touches elsewhere (score header, empty space) pass through for natural page scroll.
  canvas.addEventListener('touchstart', e => {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;

    const layout = getLayout();
    const { boardX, boardY, boardSize } = layout;
    const onBoard = x >= boardX - BOARD_TOUCH_PAD && x <= boardX + boardSize + BOARD_TOUCH_PAD &&
                    y >= boardY - BOARD_TOUCH_PAD && y <= boardY + boardSize + BOARD_TOUCH_PAD;
    const onBar = hitAreas.barRect && inRect(x, y, hitAreas.barRect);

    if (onBoard || onBar) {
      e.preventDefault();
    }
  }, { passive: false });
}

// ============================================================
// KEYBOARD
// ============================================================

const KEY_DIR = {
  ArrowLeft:  'left',  ArrowRight: 'right',
  ArrowUp:    'up',    ArrowDown:  'down',
  a: 'left',  A: 'left',
  d: 'right', D: 'right',
  w: 'up',    W: 'up',
  s: 'down',  S: 'down',
};

function onKey(e) {
  const dir = KEY_DIR[e.key];
  if (dir) { e.preventDefault(); onSwipe?.(dir); }
}

// ============================================================
// POINTER EVENTS
// ============================================================

function getCanvasXY(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function inRect(x, y, r) {
  return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function onPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const pt = getCanvasXY(e, e.currentTarget);

  // Check if pointer landed inside the powerup bar
  if (inRect(pt.x, pt.y, hitAreas.barRect)) {
    barDragging      = true;
    barDragStartX    = pt.x;
    barScrollAtStart = getBarScrollX();
    pointerStart     = null; // don't start a board gesture
    return;
  }

  pointerStart  = pt;
  pointerStartT = Date.now();
  barDragging   = false;
}

function onPointerMove(e) {
  if (!barDragging) return;
  const pt = getCanvasXY(e, e.currentTarget);
  const dx = pt.x - barDragStartX;
  setBarScroll(barScrollAtStart - dx);
}

function onPointerUp(e) {
  if (barDragging) {
    const pt = getCanvasXY(e, e.currentTarget);
    const dx = Math.abs(pt.x - barDragStartX);
    barDragging = false;

    // Small movement → treat as tap on the bar
    if (dx < TAP_THRESHOLD) {
      onTap?.(pt.x, pt.y);
    }
    return;
  }

  if (!pointerStart) return;
  const end  = getCanvasXY(e, e.currentTarget);
  const dx   = end.x - pointerStart.x;
  const dy   = end.y - pointerStart.y;
  const dist = Math.hypot(dx, dy);
  const dt   = Date.now() - pointerStartT;
  const start = { ...pointerStart };
  pointerStart = null;

  if (dt > SWIPE_TIMEOUT_MS) return;

  if (dist < SWIPE_THRESHOLD) {
    onTap?.(start.x, start.y);
  } else {
    const dir = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down'  : 'up');
    onSwipe?.(dir);
  }
}

function onPointerCancel() {
  pointerStart = null;
  barDragging  = false;
}

// ============================================================
// HIT-TESTING HELPERS (used by main.js)
// ============================================================

function hitTestPowerup(x, y) {
  for (const area of hitAreas.powerups) {
    if (x >= area.x && x <= area.x + area.w &&
        y >= area.y && y <= area.y + area.h) {
      return area.name;
    }
  }
  return null;
}

function hitTestCell(x, y) {
  for (const area of hitAreas.cells) {
    if (x >= area.x && x <= area.x + area.w &&
        y >= area.y && y <= area.y + area.h) {
      return { row: area.row, col: area.col };
    }
  }
  return null;
}

function hitTestQuit(x, y) {
  const q = hitAreas.quitBtn;
  if (!q) return false;
  return x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h;
}

function hitTestArrow(x, y) {
  for (const a of hitAreas.arrows) {
    if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) {
      return a.dir;
    }
  }
  return null;
}

return { setup, hitTestPowerup, hitTestCell, hitTestQuit, hitTestArrow };
})();

// ═══════════════════════════════════════════
// MAIN MODULE
// ═══════════════════════════════════════════
/* ============================================================
   main.js — Orchestrator.
   Connects modules, manages the game loop & screen state machine.
   ============================================================ */

// (import removed)
// (import removed)
// (import removed)
// (import removed)
// (import removed)
// (import removed)
// (import removed)

// ============================================================
// DISCOVERY SYSTEM
// ============================================================

const DISC_PANEL_H = 64; // 56px panel height + 8px bottom offset (see .discovery-panel CSS)

// Preload all catalog images on startup so tiles show art immediately
function preloadAllMedia() {
  Object.entries(CONFIG.MEDIA_CATALOG).forEach(([val, entry]) => {
    renderer.preloadMediaImage(Number(val), entry.img);
  });
}

// Cached set of tile values that have catalog entries (avoids recomputing on every move)
const CATALOG_VALUES = new Set(Object.keys(CONFIG.MEDIA_CATALOG).map(Number));

// Check grid for newly discovered catalog tiles — call after every grid change
function checkDiscoveries() {
  const newOnes = [];

  state.grid.forEach(row => row.forEach(v => {
    if (v > 0 && CATALOG_VALUES.has(v) && !state.discoveredTiles.has(v)) {
      state.discoveredTiles.add(v);
      newOnes.push(v);
    }
  }));

  if (newOnes.length === 0) return;

  // Persist
  storage.setDiscoveredTiles([...state.discoveredTiles]);

  // Build / update panel cards
  renderDiscoveryPanel(newOnes);

  // Show DOM toast for each new discovery
  newOnes.forEach((v, i) => {
    const entry = CONFIG.MEDIA_CATALOG[v];
    setTimeout(() => showDiscoveryToast(entry.title, v), i * 600);
  });
}

function renderDiscoveryPanel(highlightValues = []) {
  if (state.settings.discoveryPanel === false) return;
  const panel = document.getElementById('discovery-panel');
  const inner = document.getElementById('discovery-inner');
  if (!panel || !inner) return;

  // Rebuild all cards sorted by tile value ascending
  const discovered = [...state.discoveredTiles].sort((a, b) => a - b);
  if (discovered.length === 0) return;

  // Show panel if hidden
  if (!panel.classList.contains('visible')) {
    panel.classList.add('visible');
    renderer.setDiscoveryPanelH(DISC_PANEL_H);
    renderer.resize();
    syncDiscoveryPanelLayout();
  }

  inner.innerHTML = '';
  discovered.forEach(val => {
    const entry = CONFIG.MEDIA_CATALOG[val];
    if (!entry) return;

    const isNew = highlightValues.includes(val);
    const card  = document.createElement('a');
    card.className    = `disc-card${isNew ? ' is-new' : ''}`;
    card.href         = entry.url;
    card.target       = '_blank';
    card.rel          = 'noopener noreferrer';
    card.style.animationDelay = isNew ? '0ms' : 'none';
    card.style.animation = isNew ? '' : 'none';

    card.innerHTML = `
      <img class="disc-thumb" src="${entry.img}" alt="${entry.title}" loading="lazy" />
      <span class="disc-title">${entry.title}</span>
      <span class="disc-num">${val}</span>`;

    inner.appendChild(card);

    // Remove is-new after a moment so it doesn't persist across re-renders
    if (isNew) setTimeout(() => card.classList.remove('is-new'), 4000);
  });

  // Scroll to newest card
  if (highlightValues.length > 0) {
    setTimeout(() => {
      const lastNew = Math.max(...highlightValues);
      const idx = discovered.indexOf(lastNew);
      if (idx >= 0) {
        const cardEls = inner.querySelectorAll('.disc-card');
        cardEls[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 400);
  }
}

function showDiscoveryToast(title, val) {
  const gameScreen = document.getElementById('screen-game');
  if (!gameScreen) return;
  const toast = document.createElement('div');
  toast.className   = 'disc-toast';
  toast.textContent = `✦ ${val} unlocked: ${title}`;
  gameScreen.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Align the discovery panel left/width to match the game board
function syncDiscoveryPanelLayout() {
  const panel = document.getElementById('discovery-panel');
  if (!panel) return;
  const { boardX, boardSize } = renderer.getLayout();
  panel.style.left  = boardX + 'px';
  panel.style.width = boardSize + 'px';
  panel.style.right = 'auto';
}

// Restore panel on session start (if tiles already discovered)
function restoreDiscoveryPanel() {
  if (state.settings.discoveryPanel === false) return;
  const panel = document.getElementById('discovery-panel');
  if (!panel) return;
  const discovered = [...state.discoveredTiles].filter(v => CONFIG.MEDIA_CATALOG[v]);
  if (discovered.length > 0) {
    panel.classList.add('visible');
    renderer.setDiscoveryPanelH(DISC_PANEL_H);
    renderDiscoveryPanel();
    syncDiscoveryPanelLayout();
  }
}

// ============================================================
// BOOT
// ============================================================

const canvas = document.getElementById('game-canvas');

initState();
renderer.init(canvas);
input.setup(canvas, handleSwipe, handleTap);

// Preload all media images so tiles show art from move 1
preloadAllMedia();

// Resize handler
window.addEventListener('resize', () => {
  renderer.resize();
  syncDiscoveryPanelLayout();
});

// Start game loop
requestAnimationFrame(gameLoop);

// Populate UI from stored state
refreshMenuUI();
setupHTMLListeners();

// Restore discovery panel if tiles were found in a prior session
restoreDiscoveryPanel();

// ============================================================
// GAME LOOP
// ============================================================

let animFrameId = null;

function gameLoop(ts) {
  // Animate display score chasing real score
  if (state.displayScore < state.score) {
    const delta = (state.score - state.displayScore);
    state.displayScore = Math.min(state.score, state.displayScore + Math.max(1, delta * 0.15));
  }

  // Render canvas whenever on any game-adjacent screen
  const gameScreens = ['PLAYING', 'TARGETING', 'WON', 'GAME_OVER'];
  if (gameScreens.includes(state.screen)) {
    renderer.render(ts);
  }

  animFrameId = requestAnimationFrame(gameLoop);
}

// ============================================================
// SCREEN MANAGEMENT
// ============================================================

// Logical screen name → HTML element suffix
const SCREEN_EL = {
  menu:      'menu',
  playing:   'game',
  targeting: 'game',
  won:       'game',
  gameover:  'game',
  history:   'history',
  settings:  'settings',
};

function showScreen(id) {
  const key  = id.toLowerCase();
  const elId = SCREEN_EL[key] ?? key;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${elId}`)?.classList.add('active');
  state.screen = id.toUpperCase();
  // Re-measure canvas whenever game screen becomes visible
  if (elId === 'game') setTimeout(() => { renderer.resize(); syncDiscoveryPanelLayout(); }, 0);
}

function showOverlay(id) {
  document.getElementById(`overlay-${id}`)?.classList.add('active');
}

function hideOverlay(id) {
  document.getElementById(`overlay-${id}`)?.classList.remove('active');
}

// ============================================================
// HTML BUTTON WIRING
// ============================================================

function setupHTMLListeners() {
  // Menu
  document.getElementById('btn-play')?.addEventListener('click', () => beginGame());
  document.getElementById('btn-history')?.addEventListener('click', () => openHistory());
  document.getElementById('btn-settings')?.addEventListener('click', () => openSettings());

  // History
  document.getElementById('btn-history-back')?.addEventListener('click', () => {
    showScreen('menu');
    refreshMenuUI();
  });

  // Settings
  document.getElementById('btn-settings-back')?.addEventListener('click', () => {
    showScreen('menu');
    refreshMenuUI();
  });

  // Settings toggles
  document.getElementById('setting-powers')?.addEventListener('change', e => {
    storage.setSetting('powersEnabled', e.target.checked);
    state.settings.powersEnabled = e.target.checked;
  });

  document.getElementById('setting-anim')?.addEventListener('change', e => {
    storage.setSetting('animEnabled', e.target.checked);
    state.settings.animEnabled = e.target.checked;
  });

  document.getElementById('setting-discovery')?.addEventListener('change', e => {
    const show = e.target.checked;
    storage.setSetting('discoveryPanel', show);
    state.settings.discoveryPanel = show;
    const panel = document.getElementById('discovery-panel');
    if (!panel) return;
    if (!show) {
      panel.classList.remove('visible');
      renderer.setDiscoveryPanelH(0);
      renderer.resize();
      syncDiscoveryPanelLayout();
    } else {
      restoreDiscoveryPanel();
    }
  });

  document.getElementById('setting-base')?.addEventListener('input', e => {
    const v = parseInt(e.target.value);
    const goal = v * 1024;
    document.getElementById('setting-base-desc').textContent = `${v}  ·  goal: ${goal.toLocaleString()}`;
    storage.setSetting('baseTile', v);
    state.settings = storage.getSettings();
  });

  // Admin code footer (tap 5 times)
  document.getElementById('admin-footer')?.addEventListener('click', () => {
    if (state.adminUnlocked) return;
    state.adminTapCount++;
    if (state.adminTapCount >= 5) {
      state.adminTapCount = 0;
      openAdminModal();
    }
  });

  // Admin range sliders
  ['grid', 'laser', 'bomb', 'rearrange'].forEach(name => {
    document.getElementById(`setting-${name}`)?.addEventListener('input', e => {
      const v = parseInt(e.target.value);
      document.getElementById(`setting-${name}-desc`).textContent =
        name === 'grid' ? `${v} × ${v}` : String(v);
      const keyMap = { grid: 'gridSize', laser: 'laserCharges', bomb: 'bombCharges', rearrange: 'rearrangeCharges' };
      storage.setSetting(keyMap[name], v);
      state.settings = storage.getSettings();
    });
  });

  // Admin cheat buttons
  document.getElementById('btn-cheat-1024')?.addEventListener('click', cheatAdd1024);
  document.getElementById('btn-cheat-clear')?.addEventListener('click', cheatClearBoard);

  // Data reset
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (confirm('Reset all scores and history? This cannot be undone.')) {
      storage.resetAll();
      state.best    = 0;
      state.history = [];
      refreshMenuUI();
    }
  });

  // Win overlay
  document.getElementById('btn-keep-going')?.addEventListener('click', () => {
    state.wonAcknowledged = true;
    hideOverlay('win');
    cancelWinTimer();
    showScreen('playing');
  });

  document.getElementById('btn-win-new')?.addEventListener('click', () => {
    hideOverlay('win');
    cancelWinTimer();
    beginGame();
  });

  // Game Over overlay
  document.getElementById('btn-play-again')?.addEventListener('click', () => {
    hideOverlay('gameover');
    beginGame();
  });

  document.getElementById('btn-go-menu')?.addEventListener('click', () => {
    hideOverlay('gameover');
    state.screen = 'MENU'; // prevent game loop from rendering board
    showScreen('menu');
    refreshMenuUI();
  });

  // Admin numpad
  setupAdminNumpad();
}

// ============================================================
// MENU UI REFRESH
// ============================================================

function refreshMenuUI() {
  state.best = storage.getBest();
  const el = document.getElementById('menu-best');
  if (el) el.textContent = state.best.toLocaleString();

  const plays = storage.getDailyPlays();
  const daily = document.getElementById('menu-daily');
  if (daily) daily.textContent = plays === 0 ? '—' : `${plays} play${plays !== 1 ? 's' : ''}`;
}

// ============================================================
// GAME FLOW
// ============================================================

function beginGame() {
  startNewGame();
  const base = state.settings.baseTile || CONFIG.BASE_TILE;

  // Spawn 2 initial tiles instantly (no animation)
  let { newGrid } = logic.spawnTile(state.grid, CONFIG.SPAWN_4_PROBABILITY, base);
  state.grid = newGrid;
  let { newGrid: ng2 } = logic.spawnTile(state.grid, CONFIG.SPAWN_4_PROBABILITY, base);
  state.grid = ng2;

  // Spawned tiles may already be catalog values (e.g. tile 3)
  checkDiscoveries();

  showScreen('playing');
}

// ============================================================
// SWIPE / MOVE HANDLER (from input.js)
// ============================================================

function handleSwipe(direction) {
  // Cancel targeting on swipe
  if (state.screen === 'TARGETING') {
    state.activePower = null;
    state.swapFirst   = null;
    state.screen      = 'PLAYING';
    return;
  }

  if (state.screen !== 'PLAYING') return;
  if (renderer.isAnimating()) return;
  if (state.powerDropChoices) return; // picker open — block moves

  const { newGrid, moved, moves, scoreIncrement } = logic.slide(state.grid, direction);
  if (!moved) return;

  // Save undo snapshot BEFORE applying the move (max 3 deep)
  state.undoStack.push({
    grid:       state.grid.map(r => [...r]),
    score:      state.score,
    totalMoves: state.totalMoves,
    tileAges:   state.tileAges.map(r => [...r]),
  });
  if (state.undoStack.length > 3) state.undoStack.shift();

  // Compute which cells got merge results (for age reset)
  const mergeResults = moves
    .filter(m => m.isMergeResult)
    .map(m => [m.toRow, m.toCol]);

  // Pre-update state (grid stays at pre-slide for animation start)
  const preGrid = state.grid;

  // Update score
  state.score += scoreIncrement;
  if (state.score > state.best) {
    state.best    = state.score;
    state.isNewBest = true;
    storage.setBest(state.best);
  }

  state.totalMoves++;
  state.turn++;

  // Power drop every N moves — show 3-choice picker
  if (state.powersEnabled && state.totalMoves % CONFIG.POWER_DROP_EVERY === 0) {
    const allPowers = ['LASER', 'BOMB', 'REARRANGE', 'DOUBLE', 'UNDO', 'FREEZE', 'UPGRADE', 'SWAP'];
    // Fisher-Yates shuffle for unbiased selection
    const shuffled = [...allPowers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    state.powerDropChoices = shuffled.slice(0, 3);
  }

  // Update tile ages
  ageTiles(newGrid, mergeResults);

  // Check win BEFORE updating grid
  const justWon = !state.wonAcknowledged && !state.won && logic.hasWon(newGrid, state.winTile);

  // Spawn new tile (skip if FREEZE powerup consumed this move)
  const base = state.settings.baseTile || CONFIG.BASE_TILE;
  let gridWithSpawn, spawned;
  if (state.freezeNextSpawn) {
    state.freezeNextSpawn = false;
    gridWithSpawn = newGrid;
    spawned = null;
  } else {
    const spawnResult = logic.spawnTile(newGrid, CONFIG.SPAWN_4_PROBABILITY, base);
    gridWithSpawn = spawnResult.newGrid;
    spawned       = spawnResult.spawned;
  }

  // Track minimum occupied cells after spawn — requires > 2 tiles to have been on board
  // (guards against the opening 2-tile state triggering Clean Sweep immediately)
  if (state.totalMoves >= 2) {
    const occ = logic.countTiles(gridWithSpawn);
    if (occ < state.minOccupiedCells) state.minOccupiedCells = occ;
  }

  const doPostAnim = () => {
    // Grid is already updated; check end conditions
    if (logic.isGameOver(state.grid)) {
      setTimeout(handleGameOver, 100);
    } else if (justWon) {
      handleWin();
    }
  };

  // Update state grid AFTER snapshot for animation
  state.grid = gridWithSpawn;

  // Check for newly discovered catalog tiles
  checkDiscoveries();

  // Skip animations if disabled
  if (state.settings.animEnabled === false) {
    doPostAnim();
    return;
  }

  renderer.startSlideAnim(preGrid, moves, spawned, doPostAnim);
}

// ============================================================
// TAP HANDLER — canvas taps (powerups, quit, targeting)
// ============================================================

function handleTap(x, y) {
  // Power-drop picker — intercepts all taps until player picks
  if (state.powerDropChoices) {
    for (const btn of renderer.hitAreas.powerDropChoices) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        state.powers[btn.name] = (state.powers[btn.name] || 0) + 1;
        renderer.showPowerDrop(btn.name);
        state.powerDropChoices = null;
        return;
      }
    }
    return; // taps outside the 3 buttons do nothing — choice is required
  }

  // Quit button
  if (input.hitTestQuit(x, y) && (state.screen === 'PLAYING' || state.screen === 'TARGETING')) {
    quitToMenu();
    return;
  }

  if (state.screen === 'TARGETING') {
    const cell = input.hitTestCell(x, y);
    if (cell) {
      applyPowerupToCell(cell.row, cell.col);
    } else {
      // Tapped outside board — cancel
      state.activePower = null;
      state.swapFirst   = null;
      state.screen      = 'PLAYING';
    }
    return;
  }

  if (state.screen === 'PLAYING') {
    if (renderer.isAnimating()) return;

    // Arrow bumpers — fire a swipe in that direction
    const arrowDir = input.hitTestArrow(x, y);
    if (arrowDir) { handleSwipe(arrowDir); return; }

    // Scroll track click-to-jump
    const st = renderer.hitAreas.scrollTrack;
    if (st && x >= st.x && x <= st.x + st.w && y >= st.y && y <= st.y + st.h) {
      // Map click position along track to a scroll ratio, centering the thumb on the click
      const ratio = Math.max(0, Math.min(1, (x - st.x - st.thumbW / 2) / (st.w - st.thumbW)));
      renderer.setBarScroll(ratio * st.maxScroll);
      return;
    }

    const power = input.hitTestPowerup(x, y);
    if (power) handlePowerupTap(power);
  }
}

// ============================================================
// POWERUP LOGIC
// ============================================================

function handlePowerupTap(power) {
  if (!state.powersEnabled) return;
  if ((state.powers[power] ?? 0) <= 0) return;

  if (state.activePower === power) {
    // Deselect
    state.activePower = null;
    state.swapFirst   = null;
    return;
  }

  state.activePower = power;

  if (power === 'REARRANGE') {
    applyRearrange();
  } else if (power === 'UNDO') {
    applyUndo();
  } else if (power === 'FREEZE') {
    applyFreeze();
  } else if (power === 'UPGRADE') {
    applyUpgrade();
  } else {
    // LASER, BOMB, DOUBLE, SWAP — enter targeting mode
    state.screen = 'TARGETING';
  }
}

function applyPowerupToCell(row, col) {
  const power = state.activePower;
  if (!power) return;

  let newGrid;
  if (power === 'LASER') {
    if (state.grid[row][col] === 0) return; // can't laser empty
    newGrid = logic.applyLaser(state.grid, row, col);
  } else if (power === 'BOMB') {
    newGrid = logic.applyBomb(state.grid, row, col);
  } else if (power === 'DOUBLE') {
    if (state.grid[row][col] === 0) return; // can't double empty
    newGrid = logic.applyDouble(state.grid, row, col);
  } else if (power === 'SWAP') {
    if (state.swapFirst === null) {
      // First pick — store and stay in TARGETING
      state.swapFirst = { row, col };
      return;
    } else {
      // Second pick — apply swap (even if same cell, harmless)
      newGrid = logic.applySwap(state.grid, state.swapFirst.row, state.swapFirst.col, row, col);
      state.swapFirst = null;
    }
  }

  if (!newGrid) return; // safety guard

  state.powers[power]--;
  state.powersUsed.add(power);

  state.grid        = newGrid;
  state.activePower = null;
  state.screen      = 'PLAYING';

  // Check for newly discovered catalog tiles after powerup
  checkDiscoveries();

  // Check win after DOUBLE (could create 2048)
  if (!state.wonAcknowledged && !state.won && logic.hasWon(state.grid, state.winTile)) {
    handleWin();
    return;
  }

  // Check game over after powerup
  if (logic.isGameOver(state.grid)) {
    setTimeout(handleGameOver, 50);
  }
}

function applyRearrange() {
  state.grid = logic.rearrangeGrid(state.grid);
  state.powers.REARRANGE--;
  state.powersUsed.add('REARRANGE');
  state.activePower    = null;

  renderer.flashRearrange(() => {
    if (logic.isGameOver(state.grid)) setTimeout(handleGameOver, 50);
  });
}

function applyUndo() {
  if (state.undoStack.length === 0) {
    state.activePower = null;
    return;
  }
  const snap        = state.undoStack.pop();
  state.grid        = snap.grid;
  state.score       = snap.score;
  state.displayScore = snap.score;
  state.totalMoves  = snap.totalMoves;
  state.tileAges    = snap.tileAges;
  state.powers.UNDO--;
  state.powersUsed.add('UNDO');
  state.activePower   = null;
}

function applyFreeze() {
  state.freezeNextSpawn = true;
  state.powers.FREEZE--;
  state.powersUsed.add('FREEZE');
  state.activePower   = null;
}

function applyUpgrade() {
  const { newGrid, row, col } = logic.applyUpgrade(state.grid);
  state.grid = newGrid;
  state.powers.UPGRADE--;
  state.powersUsed.add('UPGRADE');
  state.activePower   = null;

  // Check win after UPGRADE (could create 2048)
  if (!state.wonAcknowledged && !state.won && logic.hasWon(state.grid, state.winTile)) {
    handleWin();
    return;
  }

  renderer.flashCell(row, col, () => {
    if (logic.isGameOver(state.grid)) setTimeout(handleGameOver, 50);
  });
}

// ============================================================
// WIN
// ============================================================

let winTimerRAF  = null;
let winTimerStart = 0;

function handleWin() {
  state.won = true;
  const winEl = document.getElementById('win-title');
  if (winEl) winEl.textContent = state.winTile + '!';
  showOverlay('win');
  winTimerStart = performance.now();
  startWinTimer();
}

function startWinTimer() {
  const fill = document.getElementById('win-timer-fill');
  if (!fill) return;

  // Animate the shrink using CSS transition + rAF
  function tick(ts) {
    const elapsed  = ts - winTimerStart;
    const progress = Math.max(0, 1 - elapsed / CONFIG.WIN_DISMISS_MS);
    fill.style.transform = `scaleX(${progress})`;
    fill.style.transition = 'none';

    if (progress <= 0) {
      // Auto Keep Going
      state.wonAcknowledged = true;
      hideOverlay('win');
      return;
    }
    winTimerRAF = requestAnimationFrame(tick);
  }
  winTimerRAF = requestAnimationFrame(tick);
}

function cancelWinTimer() {
  if (winTimerRAF) { cancelAnimationFrame(winTimerRAF); winTimerRAF = null; }
}

// ============================================================
// GAME OVER
// ============================================================

function handleGameOver() {
  const maxTile    = logic.getMaxTile(state.grid);
  const maxTileAge = getMaxTileAge();

  const tags = evaluateTags({
    maxTile,
    totalMoves:       state.totalMoves,
    powersUsed:       state.powersUsed,
    powersEnabled:    state.powersEnabled,
    minOccupiedCells: state.minOccupiedCells,
    maxTileAge,
    won:              state.won,
    winTile:          state.winTile,
  });

  // ---- Compute tag score bonuses ----
  let totalMultiplier = 1;
  let totalAdd        = 0;
  const bonusLines    = [];
  tags.forEach(tag => {
    const bonus = CONFIG.TAG_BONUSES[tag.id];
    if (!bonus) return;
    if (bonus.multiply) {
      totalMultiplier *= bonus.multiply;
      bonusLines.push(`${tag.label} ${bonus.label}`);
    }
    if (bonus.add) {
      totalAdd += bonus.add;
      bonusLines.push(`${tag.label} ${bonus.label}`);
    }
  });
  const baseScore  = state.score;
  const finalScore = Math.round(baseScore * totalMultiplier) + totalAdd;

  // Update best if finalScore beats stored best
  if (finalScore > storage.getBest()) {
    state.best    = finalScore;
    state.isNewBest = true;
    storage.setBest(finalScore);
  }

  // Save result
  const result = {
    date:       new Date().toISOString().split('T')[0],
    score:      finalScore,
    maxTile,
    totalMoves: state.totalMoves,
    durationMs: Date.now() - state.gameStartTime,
    tags:       tags.map(t => t.id),
    powersUsed: [...state.powersUsed],
  };
  storage.addResult(result);
  storage.incrementDailyPlays();
  state.history = storage.getHistory();
  state.best    = storage.getBest();

  // Show overlay
  document.getElementById('go-score').textContent = finalScore.toLocaleString();

  // Score breakdown (only when bonuses are active)
  const breakdownEl = document.getElementById('go-score-breakdown');
  if (breakdownEl) {
    if (bonusLines.length > 0) {
      breakdownEl.innerHTML = `<span class="go-base-score">Base: ${baseScore.toLocaleString()}</span>`
        + bonusLines.map(l => `<span class="go-bonus-line">${l}</span>`).join('');
      breakdownEl.style.display = '';
    } else {
      breakdownEl.style.display = 'none';
    }
  }

  const bestWrap = document.getElementById('go-best-wrap');
  if (bestWrap) bestWrap.style.display = state.isNewBest ? '' : 'none';

  const tagsEl = document.getElementById('go-tags');
  if (tagsEl) {
    tagsEl.innerHTML = '';
    tags.forEach((tag, i) => {
      const pill = document.createElement('span');
      pill.className = `tag-pill-lg ${tag.css}`;
      pill.textContent = tag.label;
      pill.dataset.tooltip = tag.desc;
      pill.style.animationDelay = `${i * CONFIG.ANIM_TAG_STAGGER}ms`;
      tagsEl.appendChild(pill);
    });

    // Tap to toggle tooltip — guarded to prevent listener stacking across game-overs
    if (!tagsEl._tooltipBound) {
      tagsEl._tooltipBound = true;
      tagsEl.addEventListener('click', e => {
        const pill = e.target.closest('.tag-pill-lg');
        if (!pill) return;
        const wasOpen = pill.classList.contains('tooltip-open');
        tagsEl.querySelectorAll('.tag-pill-lg.tooltip-open').forEach(p => p.classList.remove('tooltip-open'));
        if (!wasOpen) pill.classList.add('tooltip-open');
      }, { capture: true });
    }
  }

  showOverlay('gameover');
}

// ============================================================
// QUIT
// ============================================================

function quitToMenu() {
  cancelWinTimer();
  hideOverlay('win');
  state.activePower = null;

  // If a game is in progress (at least 1 move made), save it and show game over
  if (state.totalMoves > 0) {
    handleGameOver();
    return;
  }

  // No moves played — go straight to menu
  showScreen('menu');
  refreshMenuUI();
}

// ============================================================
// HISTORY SCREEN
// ============================================================

function openHistory() {
  state.history = storage.getHistory();
  renderHistoryList();
  showScreen('history');

  // Tag pill tooltips in history (delegate once)
  const listEl = document.getElementById('history-list');
  if (listEl && !listEl._tooltipBound) {
    listEl._tooltipBound = true;
    listEl.addEventListener('click', e => {
      const pill = e.target.closest('.tag-pill');
      if (!pill) return;
      const wasOpen = pill.classList.contains('tooltip-open');
      listEl.querySelectorAll('.tag-pill.tooltip-open').forEach(p => p.classList.remove('tooltip-open'));
      if (!wasOpen) pill.classList.add('tooltip-open');
    });
  }
}

function renderHistoryList() {
  const container = document.getElementById('history-list');
  if (!container) return;

  if (state.history.length === 0) {
    container.innerHTML = '<p class="empty-state">No games yet. Play your first game!</p>';
    return;
  }

  // Group by date
  const groups = {};
  state.history.forEach(r => {
    if (!groups[r.date]) groups[r.date] = [];
    groups[r.date].push(r);
  });

  let html = '';
  Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .forEach(date => {
      const entries = groups[date];
      const maxScore = Math.max(...entries.map(e => e.score));

      html += `<div class="history-date-group">`;
      html += `<div class="history-date-label">${formatDate(date)}</div>`;

      entries.forEach(e => {
        const isBest = e.score === maxScore;
        const tags   = (e.tags || []).map(id => {
          const def = TAG_DEFS.find(d => d.id === id);
          return def ? `<span class="tag-pill ${def.css}" data-tooltip="${def.desc}">${def.label}</span>` : '';
        }).join('');

        html += `
          <div class="history-entry${isBest ? ' daily-best' : ''}">
            <div class="he-left">
              <span class="he-score">${e.score.toLocaleString()}</span>
              <span class="he-meta">${e.totalMoves} moves · ${formatDuration(e.durationMs)}</span>
            </div>
            <div class="he-right">
              <span class="he-max-tile">Max: ${e.maxTile}</span>
              <div class="he-tags">${tags}${isBest ? '&nbsp;🏆' : ''}</div>
            </div>
          </div>`;
      });

      html += `</div>`;
    });

  container.innerHTML = html;
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' });
}

function formatDuration(ms) {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ============================================================
// SETTINGS SCREEN
// ============================================================

function openSettings() {
  const s = state.settings;

  const powersEl = document.getElementById('setting-powers');
  if (powersEl) powersEl.checked = s.powersEnabled !== false;

  const animEl = document.getElementById('setting-anim');
  if (animEl) animEl.checked = s.animEnabled !== false;

  const discEl = document.getElementById('setting-discovery');
  if (discEl) discEl.checked = s.discoveryPanel !== false;

  const baseEl = document.getElementById('setting-base');
  const base   = s.baseTile || CONFIG.BASE_TILE;
  if (baseEl) { baseEl.value = base; }
  const baseDesc = document.getElementById('setting-base-desc');
  if (baseDesc) baseDesc.textContent = `${base}  ·  goal: ${(base * 1024).toLocaleString()}`;

  // Show admin section if unlocked
  if (state.adminUnlocked) showAdminSection();

  showScreen('settings');
}

function showAdminSection() {
  const sec = document.getElementById('section-admin');
  if (sec) sec.style.display = '';

  const s = state.settings;

  // Sync slider values
  const gridEl = document.getElementById('setting-grid');
  if (gridEl) { gridEl.value = s.gridSize || 4; }
  document.getElementById('setting-grid-desc').textContent = `${s.gridSize || 4} × ${s.gridSize || 4}`;

  const laserEl = document.getElementById('setting-laser');
  if (laserEl) { laserEl.value = s.laserCharges ?? 2; }
  document.getElementById('setting-laser-desc').textContent = String(s.laserCharges ?? 2);

  const bombEl = document.getElementById('setting-bomb');
  if (bombEl) { bombEl.value = s.bombCharges ?? 1; }
  document.getElementById('setting-bomb-desc').textContent = String(s.bombCharges ?? 1);

  const reEl = document.getElementById('setting-rearrange');
  if (reEl) { reEl.value = s.rearrangeCharges ?? 1; }
  document.getElementById('setting-rearrange-desc').textContent = String(s.rearrangeCharges ?? 1);
}

// ============================================================
// ADMIN CODE / NUMPAD
// ============================================================

let adminInput = '';

function openAdminModal() {
  adminInput = '';
  updateAdminDots();
  showOverlay('admin');
}

function setupAdminNumpad() {
  document.querySelectorAll('.numpad-key[data-digit]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (adminInput.length >= 4) return;
      adminInput += btn.dataset.digit;
      updateAdminDots();
      if (adminInput.length === 4) checkAdminCode();
    });
  });

  document.getElementById('btn-admin-del')?.addEventListener('click', () => {
    adminInput = adminInput.slice(0, -1);
    updateAdminDots();
  });

  document.getElementById('btn-admin-cancel')?.addEventListener('click', () => {
    hideOverlay('admin');
    adminInput = '';
  });
}

function updateAdminDots() {
  document.querySelectorAll('#admin-dots .dot').forEach((dot, i) => {
    dot.classList.toggle('filled', i < adminInput.length);
    dot.classList.remove('error');
  });
}

function checkAdminCode() {
  if (adminInput === CONFIG.ADMIN_CODE) {
    state.adminUnlocked = true;
    sessionStorage.setItem('2048_admin', 'true');
    hideOverlay('admin');
    showAdminSection();
  } else {
    // Shake dots
    document.querySelectorAll('#admin-dots .dot').forEach(d => {
      d.classList.add('error');
    });
    setTimeout(() => {
      adminInput = '';
      updateAdminDots();
    }, 700);
  }
}

// ============================================================
// CHEAT BUTTONS (admin only)
// ============================================================

function cheatAdd1024() {
  if (state.screen !== 'PLAYING') return;
  const empty = logic.getEmptyCells(state.grid);
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  state.grid[r][c] = 1024;
}

function cheatClearBoard() {
  if (state.screen !== 'PLAYING') return;
  const N   = state.grid.length;
  state.grid = Array.from({ length: N }, () => new Array(N).fill(0));
  // Leave 1 tile so game doesn't immediately end
  state.grid[0][0] = 2;
}


})();
