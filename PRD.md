# PRD: 2048 Web Game — "The Master Spec"

**Version:** 6.1
**Date:** 2026-03-17
**Author:** Jeff Boss
**Status:** Approved / Finalized

---

## 1. Executive Summary

A "Zero-Dependency" high-performance 2048 implementation for the modern web. This is not just a clone; it is a polished, arcade-style experience with a meta-game layer (Achievement Tags), a strategic layer (Powerups), and a competitive history layer (Daily High Scores). 

The design philosophy is **"Lean & Native"**: No frameworks, no build tools, no external assets. Everything is drawn to a single HTML5 Canvas or styled with native CSS using a system font stack.

---

## 2. Core Pillars

- **Performance First:** Consistent 60fps animations. Zero layout thrashing.
- **Portability:** A single folder that runs via `index.html` on any device.
- **Extensibility:** A data-driven `config.js` that controls the entire universe.
- **Vibe:** "Tactile" feedback. Tiles should "pop", "slide", and "glow" with the same premium feel as Crystal Chaos.

---

## 3. Game States & Navigation

The application operates as a single-page state machine.

### 3.1 State Definitions
| State | Key | UI Elements |
|---|---|---|
| **Main Menu** | `MENU` | Title, Best Score, Play/History/Settings buttons, Daily Play count. |
| **Active Game** | `PLAYING` | Board, Current Score, Powerup Bar, Quit Button. |
| **Targeting** | `TARGETING` | A sub-state of `PLAYING`. Board dims, valid cells pulse, cancel button appears. |
| **Win Overlay** | `WON` | "2048!" text, Progress bar (5s), "Keep Going" / "New Game" buttons. |
| **Game Over** | `GAME_OVER` | Final score, Tags earned (staggered), "Play Again" / "Menu". |
| **History** | `HISTORY` | Day-grouped scrollable list, Gold trophies for daily leads. |
| **Settings** | `SETTINGS` | Parameter sliders, Admin Code entry, Reset button. |

### 3.2 Transition Logic
- Transitions between major states (Menu → Playing) use a 200ms black/theme-color fade.
- Overlays (Win/Settings) use a 150ms backdrop-blur and opacity fade.

---

## 4. Technical Architecture (The "Pure" System)

### 4.1 Module Responsibilities
- `config.js`: Constant definitions (The "DNA").
- `storage.js`: CRUD for `localStorage`. Only module allowed to touch `window.localStorage`.
- `logic.js`: **Mathematical heart.** Pure functions that take `(grid, direction)` and return `{ newGrid, moves, merges, scoreIncrement }`.
- `state.js`: The "Source of Truth". Holds the current object state.
- `renderer.js`: The "Artist". Master router for Canvas `ctx` calls.
- `input.js`: Unified event listener (PointerEvents for touch/mouse, KeyEvents for arrows).

---

## 5. The "Perfect" Logic Spec

### 5.1 The Slide Algorithm (4-Stage)
To ensure 2048 feels correct, the `logic.js` must follow this sequence for a move:
1. **Compress:** Move all non-zero tiles in the direction, closing gaps.
2. **Merge:** Iterate in direction; if two adjacent match, double the first, zero the second.
3. **Compress Again:** Close any gaps created by merges.
4. **Compare:** If the grid changed, the move is valid → spawn a new tile.

### 5.2 Powerup Application Logic
- **Laser:** `grid[y][x] = 0`. No shift triggered. Requires non-empty cell.
- **Bomb:** `for (dy=-1..1) for (dx=-1..1) if (withinBoard) grid[y+dy][x+dx] = 0`. 3×3 area wipe.
- **Rearrange:** `flatten(grid) -> shuffle() -> unflatten(grid)`. Fisher-Yates.
- **Double:** `grid[y][x] *= 2`. Doubles a single tile's value. Requires non-empty cell. Enters targeting mode.
- **Undo:** Restores the last snapshot from the undo stack (up to 3 moves back). Instant — no targeting.
- **Freeze:** Sets `freezeNextSpawn = true`. The next tile spawn after a move is skipped. Instant. A "❄ SPAWN FROZEN" indicator pulses above the board until consumed.
- **Upgrade:** Finds the single highest-value tile on the board and doubles it automatically. Instant — no targeting. Triggers a scale-pop flash on the upgraded tile. Can trigger the Win overlay.
- **Swap:** Two-step targeting. Tap any first tile (highlighted in gold), then tap any second tile. Their values are exchanged. Both empty and occupied cells are valid targets.

### 5.3 Power Drop System
Every `CONFIG.POWER_DROP_EVERY` (10) valid moves, a random powerup charge is granted. A brief animated toast notification floats up from the centre of the board indicating the drop (e.g., "+1 ⚡ Laser"). The drop occurs regardless of whether powerups are currently being used.

---

## 6. Config System (Complete Manifest)

The `config.js` must contain exactly these keys:

```js
export const CONFIG = {
  // Visuals
  GRID_SIZE: 4,
  TILE_GAP: 10,
  BOARD_PADDING: 12,
  TILE_RADIUS: 12,
  BOARD_RADIUS: 16,
  FONT_FAMILY: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  
  // Colors (Original 2048 Palette)
  COLORS: {
    BOARD_BG: '#bbada0',
    CELL_EMPTY: '#cdc1b4',
    TEXT_DARK: '#776e65',
    TEXT_LIGHT: '#f9f6f2',
    TILES: {
      2:    { bg: '#eee4da', text: '#776e65' },
      4:    { bg: '#ede0c8', text: '#776e65' },
      8:    { bg: '#f2b179', text: '#f9f6f2' },
      16:   { bg: '#f59563', text: '#f9f6f2' },
      32:   { bg: '#f67c5f', text: '#f9f6f2' },
      64:   { bg: '#f65e3b', text: '#f9f6f2' },
      128:  { bg: '#edcf72', text: '#f9f6f2', shadow: '0 0 10px #edcf72' },
      256:  { bg: '#edcc61', text: '#f9f6f2', shadow: '0 0 15px #edcc61' },
      512:  { bg: '#edc850', text: '#f9f6f2', shadow: '0 0 20px #edc850' },
      1024: { bg: '#edc53f', text: '#f9f6f2', shadow: '0 0 25px #edc53f' },
      2048: { bg: '#edc22e', text: '#f9f6f2', shadow: '0 0 30px #edc22e' },
      '4096+': { bg: '#3c3a32', text: '#f9f6f2' }
    }
  },

  // Mechanics
  WIN_TILE: 2048,
  SPAWN_4_PROBABILITY: 0.10,
  WIN_DISMISS_MS: 5000,
  
  // Timings
  ANIM_SLIDE_MS: 100,
  ANIM_SPAWN_MS: 150,
  ANIM_MERGE_MS: 120,
  ANIM_TAG_STAGGER: 100,
  
  // Timings (additional)
  SCORE_ANIM_MS: 300,

  // Powerup Charges
  POWERS: {
    LASER:   2,   // remove one tile
    BOMB:    1,   // wipe 3×3 area
    REARRANGE: 1, // Fisher-Yates shuffle of all tiles
    DOUBLE:  1,   // double a selected tile
    UNDO:    1,   // rewind one move (up to 3 stored)
    FREEZE:  1,   // skip the next tile spawn
    UPGRADE: 1,   // auto-double the highest tile on the board
    SWAP:    1,   // exchange two tiles (two-step targeting)
  },

  // Power-drop cadence
  POWER_DROP_EVERY: 10,  // every N valid moves, grant a random powerup charge

  // Tag Thresholds
  FOSSIL_TURNS: 11,
  TORTOISE_MOVES: 300,
  SPEEDRUN_MOVES: 100,
  
  // Security
  ADMIN_CODE: '6673'
};
```

---

## 7. Achievement Tags (The Behavioral Meta)

Tags are evaluated in `tags.js` at the moment of Game Over.

| Tag | logic Trigger | CSS Style |
|---|---|---|
| **🧘 Purist** | `game.powersUsed.length === 0 && game.settings.powersEnabled` | Indigo Pill |
| **🎯 Fossil** | `turn1Tile.age >= CONFIG.FOSSIL_TURNS` | Amber Pill |
| **🏔️ Summit** | `maxTile >= CONFIG.WIN_TILE` | Gold + Glow |
| **🌋 Overclock** | `maxTile >= CONFIG.WIN_TILE * 2` | Red + Pulse |
| **🐢 Tortoise** | `totalMoves >= CONFIG.TORTOISE_MOVES` | Green Pill |
| **⚡ Speedrun** | `maxTile >= 2048 && totalMoves <= CONFIG.SPEEDRUN_MOVES` | Cyan Pill |
| **🧹 Clean Sweep** | `any(turn.tileCount <= 2)` | Sky Pill |
| **🔬 Surgeon** | `game.powersUsed === ['laser']` | Purple Pill |

---

## 8. User Interface (Crystal Chaos Fidelity)

### 8.1 Tile Rendering
- **Rounded:** `TILE_RADIUS` (12px).
- **Text:** Vertically and horizontally centered using `ctx.textAlign = 'center'` and `ctx.textBaseline = 'middle'`.
- **Scaling:** For numbers > 999, reduce font size by 20% per digit.

### 8.2 Portrait Layout
- In portrait orientation (h > w), vertical centering of the board is capped at 16px to prevent a dead band of empty space appearing above the board.
- The Quit button shrinks from the full `QUIT` label to a compact `✕` glyph when in portrait, preserving header space.

### 8.3 Game Discovery Strip
- A vertically-scrollable strip that appears below the board when the player first reaches a tile value that maps to an entry in `CONFIG.MEDIA_CATALOG`.
- Positioned and sized to match the board width exactly — never wider.
- Floats 8px above the screen bottom with rounded corners and a subtle drop shadow.
- Each row contains a square thumbnail and game title. Scroll to reveal all discoveries.
- Can be toggled on/off via Settings → Discovery Strip.
- Persists across sessions: discovered tiles are stored in `localStorage` (key `2048_discoveries`).

### 8.4 Powerup Bar
- Located below the board. Drawn on canvas.
- Glassmorphism effect: `rgba(255,255,255,0.1)` with a soft rounded-rect background.
- **Scrollable:** The bar is horizontally drag-scrollable to accommodate 5+ powerups. Scroll indicator (track + thumb) shown when content overflows.
- **Sort order:** Powerups with remaining charges appear first (sorted by charge count desc); depleted powerups are scrolled off the visible area to the right.
- **Targeting Visual:** When active, the board gets a `rgba(0,0,0,0.5)` overlay. Valid target cells pulse with a white stroke.
- **Power Drop Toast:** When a drop is awarded, a pill-shaped toast floats up from the board centre and fades out over ~1.8s.

### 8.5 Tag Tooltips
- Tag pills in the Game Over overlay and History screen are tappable.
- First tap reveals a dark tooltip above the pill describing what earned it (e.g., "No powerups used this game").
- Second tap (or tapping a different pill) dismisses the tooltip.
- CSS-driven: tooltip text sourced from `data-tooltip` attribute, toggled via `.tooltip-open` class.

### 8.6 Win Screen
- Full-screen overlay.
- Text: "2048" in large bold gold.
- **Timer Bar:** 4px high, pinned to bottom, shrinks from 100% to 0% over 5 seconds.

---

## 9. Score History & Storage

### 9.1 Storage Schema (`localStorage`)
- `2048_best`: `number`
- `2048_history`: `GameResult[]`
- `2048_settings`: `Object` (user overrides)
- `2048_dailyPlays_YYYY-MM-DD`: `number`

### 9.2 History View Pattern
- Group by date (descending).
- High score of the day gets the `CONFIG.COLORS.TILES[2048].bg` background and a 🏆 emoji.

---

## 10. Settings & Admin Menu

### 10.1 Settings Parameters

| Key | Type | Default | Description |
|---|---|---|---|
| `powersEnabled` | boolean | true | Enable/disable the powerup system |
| `animEnabled` | boolean | true | Enable/disable tile slide & merge animations |
| `baseTile` | number | 3 | Starting tile value (2–5); win tile = baseTile × 1024 |
| `discoveryPanel` | boolean | true | Show/hide the game discovery strip below the board |
| `gridSize` | number | 4 | Grid dimension N×N (admin only, 3–8) |
| `laserCharges` | number | 2 | Starting laser charges (admin only) |
| `bombCharges` | number | 1 | Starting bomb charges (admin only) |
| `rearrangeCharges` | number | 1 | Starting rearrange charges (admin only) |

### 10.2 The "6673" Unlock
- Settings menu displays a "Developer Mode" footer.
- Tapping footer 5 times opens a numpad/text input.
- Correct code `6673` sets `sessionStorage.admin_unlocked = true`.
- Unlocks: Grid Size (3x3 to 8x8), Spawn Probabilities, Cheat Buttons (Add 1024, Clear Board).

---

## 11. Performance & QA Checklist

- [ ] **Fluidity:** No frame drops when sliding 16 tiles simultaneously.
- [ ] **Offline:** Works with zero internet connection after first load.
- [ ] **Edge Case:** Powerup used on the very last possible move to prevent Game Over.
- [ ] **Edge Case:** Win triggered by a Powerup (e.g., Upgrade powerup).
- [ ] **Responsiveness:** Board scales to fit 100vw/100vh with a 20px safe-area margin.

---

## 12. Future Roadmap (v7.0+)
- **Skins:** "Retro", "Neon", "Crystal Chaos" (gem icons).
- **Sound:** Tactile clicks for slides, "ding" for merges.
- **Online Leaderboard:** Optional cloud sync of daily bests.
- **Combo Multiplier:** Consecutive merges in a single move grant a score bonus.

---

**[END OF PRD]**
