/* ============================================================
   state.js — Single source of truth for all mutable game state.
   Only main.js and renderer.js should mutate this.
   ============================================================ */

import { CONFIG } from './config.js';
import * as storage from './storage.js';

export const state = {
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
  won:             false,
  wonAcknowledged: false, // set true when user clicks Keep Going

  // ---- Powerup state ----
  powers:      {},        // { LASER: n, BOMB: n, REARRANGE: n }
  powersUsed:  new Set(), // Set of power names used this game
  activePower: null,      // null | 'LASER' | 'BOMB' | 'REARRANGE'
  powersEnabled: true,

  // ---- Tag tracking (gathered throughout the game) ----
  minOccupiedCells: 16,   // for Clean Sweep: lowest count in any single turn
  onlyLaserUsed:    true, // stays true until non-laser power used

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
};

// ---- Initialise from localStorage (call once at startup) ----
export function initState() {
  state.best        = storage.getBest();
  state.settings    = storage.getSettings();
  state.history     = storage.getHistory();
  state.adminUnlocked = sessionStorage.getItem('2048_admin') === 'true';
}

// ---- Start a new game ----
export function startNewGame() {
  const N = state.settings.gridSize || CONFIG.GRID_SIZE;

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
  };
  state.powersUsed    = new Set();
  state.activePower   = null;
  state.powersEnabled = state.settings.powersEnabled ?? true;

  state.minOccupiedCells = N * N;
  state.onlyLaserUsed    = true;
  state.undoStack        = [];
  state.freezeNextSpawn  = false;
  state.swapFirst        = null;
  state.powerDropChoices = null;

  state.screen = 'PLAYING';
}

// ---- Update tile ages after a move ----
// mergeDestinations: Set of "r,c" strings that received a merge result (reset age)
// movedFrom:        Set of "r,c" strings that were vacated (reset/clear)
export function ageTiles(newGrid, mergeResultCells) {
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
export function getMaxTileAge() {
  let max = 0;
  for (const row of state.tileAges) {
    for (const age of row) { if (age > max) max = age; }
  }
  return max;
}
