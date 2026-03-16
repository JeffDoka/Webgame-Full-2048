/* ============================================================
   tags.js — Achievement Tag evaluation at Game Over.
   Pure function: takes game snapshot, returns array of tag objects.
   ============================================================ */

import { CONFIG } from './config.js';

// Tag definitions
export const TAG_DEFS = [
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
    desc:  `Reached the ${CONFIG.WIN_TILE} tile`,
    css:   'tag-summit',
    test:  ({ maxTile }) => maxTile >= CONFIG.WIN_TILE,
  },
  {
    id:    'overclock',
    label: '🌋 Overclock',
    desc:  `Reached ${CONFIG.WIN_TILE * 2} or higher`,
    css:   'tag-overclock',
    test:  ({ maxTile }) => maxTile >= CONFIG.WIN_TILE * 2,
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
    desc:  `Hit 2048 in ${CONFIG.SPEEDRUN_MOVES} moves or fewer`,
    css:   'tag-speedrun',
    test:  ({ maxTile, totalMoves }) =>
      maxTile >= CONFIG.WIN_TILE && totalMoves <= CONFIG.SPEEDRUN_MOVES,
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
      powersUsed.has('LASER') &&
      !powersUsed.has('BOMB') &&
      !powersUsed.has('REARRANGE'),
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
 * @returns {Array} Matching TAG_DEF objects
 */
export function evaluateTags(snap) {
  return TAG_DEFS.filter(def => {
    try { return def.test(snap); } catch { return false; }
  });
}
