# 3072 — Complete Mechanics Reference

This document describes every mechanic in the 3072 game with zero ambiguity. If you are an AI system implementing or modifying this game, follow this document exactly. When this document says "always" or "never", it means it.

---

## 1. THE BOARD

- The board is a square grid. Default size: **4x4**. Configurable: any size via admin settings.
- Each cell holds either **0** (empty) or a **positive integer** (a tile).
- The grid is stored as a 2D array of numbers: `grid[row][col]`.
- Row 0 is the **top** of the board. Column 0 is the **left**.

---

## 2. TILE VALUES

- The **base tile** value is **3** by default (configurable: 2–5).
- All tile values are multiples of the base tile, doubling each merge: 3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144...
- The **win tile** = base tile x 1024. With base tile 3, the win tile is **3072**.
- There is no maximum tile value. Players can keep going after reaching the win tile.

### Tile spawning
- After every move, **one new tile** spawns on a random empty cell.
- The new tile is the **base value** (3) with **90% probability**, or **double the base** (6) with **10% probability**.
- If there are no empty cells, no tile spawns (this shouldn't happen — the game would have already ended).

### Starting state
- A new game begins with **2 tiles** spawned on random empty cells. No other tiles exist.

---

## 3. HOW MOVEMENT WORKS

The player inputs a direction: **left**, **right**, **up**, or **down**. This is the entire interaction — there is no dragging of individual tiles or cell selection during normal play.

### Input methods
- **Keyboard**: Arrow keys or WASD.
- **Touch/mouse**: Swipe gesture on the canvas. Minimum 30px displacement within 500ms. The dominant axis (horizontal or vertical) determines direction.
- **Arrow bumpers**: Tappable arrow buttons rendered around the board edges.

### Slide mechanics (this is the core algorithm)

When the player swipes in a direction, **every tile on the board slides as far as possible in that direction**, then adjacent same-value tiles **merge**.

Processing happens **per line** (row for left/right, column for up/down). Each line is processed independently. Here's the exact algorithm for sliding a single line toward index 0 (leftward):

1. Collect all non-zero values from the line, preserving their order.
2. Walk through the collected values left to right:
   - If the current tile and the next tile have the **same value**, they **merge**: the current tile doubles, the next tile is consumed. The doubled value is added to the score. Move to the tile after the consumed one.
   - If they don't match, the current tile stays as-is. Move to the next tile.
3. Place the resulting tiles at the leftmost positions in the line. Fill the rest with 0.

**For other directions:**
- **Right**: Reverse the row, apply the algorithm, reverse back.
- **Up**: Extract the column as a line, apply the algorithm, write back.
- **Down**: Extract the column reversed, apply the algorithm, reverse, write back.

### Merge rules — critical details

- **Each tile can only merge once per move.** If you have `[3, 3, 3, 3]` and slide left, the result is `[6, 6, 0, 0]` — NOT `[12, 0, 0, 0]`. The first pair merges into 6, the second pair merges into 6. The two 6s do NOT merge again in the same move.
- **Merges happen left-to-right** (toward the slide direction). In `[3, 3, 6]` sliding left: the two 3s merge into 6, result is `[6, 6, 0]`. The two 6s do NOT merge.
- **A move is invalid if nothing changes.** If no tile moves or merges, the input is ignored — no new tile spawns, no move is counted.
- **There are no cascades or chain reactions.** Each move resolves in a single pass. After the slide, one tile spawns, and the player takes their next turn.

---

## 4. SCORING

- **Score increases only from merges.** When two tiles merge into a new value, that new value is added to the score.
- Example: Two 3s merge → +6 points. Two 48s merge → +96 points.
- If multiple merges happen in one move, all are summed.
- Example: `[3, 3, 3, 3]` slides left → two merges of 3+3 → +6 +6 = **+12 points**.
- The score is a running total across the entire game. It never resets mid-game.

### Score display
- The displayed score animates to chase the real score (15% of the gap per frame), so it counts up smoothly rather than jumping.

---

## 5. WIN CONDITION

- The player **wins** when any tile on the board reaches the **win tile** value (default: 3072).
- "Reaches" means the tile value is **greater than or equal to** the win tile.
- When the player wins:
  1. A win overlay appears showing the win tile value.
  2. A 5-second countdown timer runs. If it expires, the overlay auto-dismisses.
  3. The player can click **"Keep Going"** to dismiss the overlay and continue playing.
  4. The player can click **"New Game"** to start fresh.
- The win overlay appears **only once per game**. After acknowledgment (manual or auto), reaching higher tiles does not re-trigger it.
- The game **does not end** on win. The player can continue indefinitely.

---

## 6. GAME OVER CONDITION

The game is over when:
1. **Every cell is occupied** (no empty cells), AND
2. **No adjacent tiles (horizontal or vertical) share the same value** (no possible merges).

Both conditions must be true simultaneously. If the board is full but a merge is still possible, the game continues.

### What happens at game over
1. Achievement tags are evaluated (see Section 8).
2. Tag score bonuses are applied to the base score (see Section 9).
3. The final score is compared to the stored best; if higher, it becomes the new best.
4. The game result is saved to history: date, final score, max tile, total moves, duration, tags earned, power-ups used.
5. A game-over overlay appears showing: final score, score breakdown (if bonuses apply), best score badge (if new best), and earned tag pills.
6. The player can **"Play Again"** or **"Menu"**.

### Quitting mid-game
- If the player quits with at least 1 move played, the game is treated as a game over — tags are evaluated, score is saved, the game-over overlay shows.
- If the player quits with 0 moves, they return to the menu with nothing saved.

---

## 7. POWER-UPS

Power-ups are optional tools the player can activate during gameplay. They can be globally enabled or disabled via settings (default: enabled).

### Power-up charges
Each power-up has a limited number of uses per game. Once spent, it's gone.

### Power-up drops
Every **15 moves**, the player is offered a **pick-one-of-three** choice from the full pool of 8 power-ups (randomly shuffled). The player MUST pick one before making their next move — taps outside the 3 choices are ignored.

### The 8 power-ups

**1. Laser** (default: 1 charge)
- **Targeting**: Tap any occupied cell.
- **Effect**: Removes that single tile. The cell becomes empty.
- **Cannot target**: Empty cells (tap is ignored).

**2. Bomb** (default: 1 charge)
- **Targeting**: Tap any cell.
- **Effect**: Clears a **3x3 area** centered on the tapped cell. All tiles in that area are removed (set to 0). Area is clipped at board edges.

**3. Rearrange** (default: 0 charges)
- **Targeting**: None — activates immediately on tap.
- **Effect**: All non-zero tiles on the board are collected, shuffled (Fisher-Yates), and placed back into the same occupied positions. Empty cells stay empty. Tile values are redistributed randomly among occupied positions.

**4. Double** (default: 0 charges)
- **Targeting**: Tap any occupied cell.
- **Effect**: Doubles that tile's value in place (e.g., 48 becomes 96).
- **Cannot target**: Empty cells.
- **Important**: Can trigger a win if the doubled tile reaches the win value.

**5. Undo** (default: 0 charges)
- **Targeting**: None — activates immediately.
- **Effect**: Reverts the game to the state before the last move. Restores: grid, score, total moves, and tile ages.
- **Undo stack**: Up to 3 snapshots deep. Each move pushes a snapshot; the stack is capped at 3 (oldest dropped).
- **If the stack is empty**: Nothing happens, charge is NOT consumed.

**6. Freeze** (default: 0 charges)
- **Targeting**: None — activates immediately.
- **Effect**: The next move will **not spawn a new tile** after sliding. One-shot: affects only the very next move.

**7. Upgrade** (default: 0 charges)
- **Targeting**: None — activates immediately.
- **Effect**: Finds the **highest-value tile** on the board and doubles it. If multiple tiles share the highest value, the first one found (top-left scan order) is chosen.
- **Important**: Can trigger a win.

**8. Swap** (default: 0 charges)
- **Targeting**: Two-step. Tap the first tile, then tap the second tile.
- **Effect**: Exchanges the values of the two tapped cells. Works even if one or both cells are empty (swaps a tile with empty space).

### Power-up interaction rules
- **Targeting mode**: Laser, Bomb, Double, and Swap enter a "targeting" state where the next tap(s) on the board apply the effect. During targeting, swiping **cancels** the power-up (no charge consumed). Tapping outside the board also cancels.
- **Immediate power-ups**: Rearrange, Undo, Freeze, and Upgrade activate instantly — no targeting needed.
- **Re-tapping the same power-up** while in targeting mode **deselects** it (cancels, no charge consumed).
- **Power-ups do NOT count as moves.** They don't increment the move counter, don't trigger tile spawns (except Freeze which affects the NEXT move's spawn), and don't trigger power-up drops.
- **After a power-up**: The game checks for win and game-over conditions immediately.

---

## 8. ACHIEVEMENT TAGS

Tags are evaluated at game over. They are badges that recognize specific play patterns. A game can earn **multiple tags**.

| Tag | Condition | Description |
|---|---|---|
| **Purist** | Power-ups were enabled AND the player used zero power-ups | Completed without any power-up use |
| **Fossil** | Any tile survived 11+ consecutive moves without being moved or merged | A tile stayed in place for a long time |
| **Summit** | Max tile on board >= win tile (3072) | Reached the goal tile |
| **Overclock** | Max tile on board >= win tile x 2 (6144) | Doubled the goal |
| **Tortoise** | Total moves >= 300 | Long marathon game |
| **Speedrun** | Reached win tile AND total moves <= 100 | Won fast |
| **Clean Sweep** | At any point after move 2, the board had 2 or fewer tiles | Nearly cleared the board |
| **Surgeon** | Used at least one power-up, AND every power-up used was Laser (no other types) | Laser-only discipline |

### Tile age tracking (for Fossil)
- Every cell has an age counter.
- After each move, tiles that **didn't move and didn't merge** have their age incremented by 1.
- Tiles that **merged** (the result cell) have their age reset to 0.
- Empty cells always have age 0.
- The Fossil tag checks if any tile's age reached 11 or higher at game end.

---

## 9. TAG SCORE BONUSES

Tags modify the final score. There are two types of bonuses: **multipliers** (applied to base score) and **flat adds** (added after all multipliers).

| Tag | Bonus Type | Value |
|---|---|---|
| Purist | Multiply | x2 |
| Summit | Add | +1,000 |
| Overclock | Multiply | x1.5 |
| Speedrun | Multiply | x1.5 |
| Fossil | Add | +500 |
| Clean Sweep | Add | +800 |
| Surgeon | Multiply | x1.25 |
| Tortoise | Add | +300 |

### Calculation order
1. Start with the base score (the running score from merges during the game).
2. **Multiply**: All multiplier bonuses are **stacked multiplicatively**. If you earn Purist (x2) and Speedrun (x1.5), the total multiplier is 2 x 1.5 = 3.0.
3. **Round**: The multiplied score is rounded to the nearest integer.
4. **Add**: All flat bonuses are summed and added to the rounded result.
5. The result is the **final score**.

Example: Base 5000, Purist (x2) + Summit (+1000) = round(5000 x 2) + 1000 = 11,000.

---

## 10. MEDIA DISCOVERY SYSTEM

Certain tile values correspond to entries in a **media catalog** — each representing a game or media title. When a tile of that value appears on the board for the first time ever (across all games), it's "discovered."

### Catalog entries
| Tile Value | Title |
|---|---|
| 3 | TimeClimb |
| 6 | Crystal Chaos |
| 12 | Hexa Puzzle Saga |
| 24 | Tiny Restorations VR |
| 48 | The Builder |
| 96 | The Lost Library |
| 192 | Departures: Running Wild |
| 384 | The Conference |
| 768 | The Distributor |
| 1536 | Worldseekers |

### How it works
- Discoveries are **persistent** across sessions (stored in localStorage).
- When a new tile value is discovered, a **toast notification** appears: "✦ {value} unlocked: {title}".
- A **discovery panel** appears below the game board showing thumbnail cards for all discovered titles, scrollable horizontally, sorted by tile value ascending.
- Each card links to the title's URL.
- Newly discovered cards get a highlight animation that fades after 4 seconds.
- The discovery panel can be toggled off in settings.

---

## 11. SCREENS AND NAVIGATION

### Menu Screen
- Shows: best score, daily play count, Play button, History button, Settings button.
- Footer: tapping it 5 times opens the admin code entry.

### Game Screen (canvas-rendered)
- The game board, score display, quit button, power-up bar, arrow bumpers, and discovery panel are all rendered on a single HTML5 canvas (except the discovery panel which is DOM).
- Power-up bar: horizontally scrollable strip below the board. Shows available power-ups with charge counts. Drag to scroll, tap to activate.

### History Screen
- Game results grouped by date (newest first).
- Each entry shows: score, move count, duration, max tile, earned tags (as tappable pills with tooltip descriptions).
- Best game of each day is highlighted with a trophy.

### Settings Screen
- **Standard settings** (always visible):
  - Power-ups enabled (toggle, default: on)
  - Animations enabled (toggle, default: on)
  - Discovery panel visible (toggle, default: on)
  - Base tile value (slider: 2–5, default: 3) — shows computed goal
  - Reset all data (button, with confirmation)
- **Admin settings** (hidden until admin code entered):
  - Grid size (slider, default: 4)
  - Laser charges (slider, default: 2)
  - Bomb charges (slider, default: 1)
  - Rearrange charges (slider, default: 1)
  - Cheat: add a 1024 tile
  - Cheat: clear the board

### Overlays
- **Win overlay**: Shown on first win tile reached. "Keep Going" or "New Game" buttons. Auto-dismisses after 5 seconds.
- **Game Over overlay**: Score, breakdown, tags, "Play Again" or "Menu" buttons.
- **Admin numpad overlay**: 4-digit code entry with dot indicators. Wrong code shakes the dots.
- **Power drop picker**: 3-choice modal, must pick one. Blocks all other input until chosen.

### Navigation flow
```
Menu --> Game (Play)
Menu --> History
Menu --> Settings
Game --> Menu (Quit with 0 moves)
Game --> Game Over overlay (Quit with 1+ moves, or board fills)
Game Over overlay --> Game (Play Again)
Game Over overlay --> Menu
Win overlay --> Game (Keep Going / auto-dismiss)
Win overlay --> Game (New Game)
History --> Menu
Settings --> Menu
```

---

## 12. VISUAL DETAILS

### Tile colors (Channel 3 palette)
Tiles are colored by **tier** (how many times the base tile has been doubled):

| Tier | Value (base=3) | Color | Text |
|---|---|---|---|
| 0 | 3 | Almond (#EDE0D4) | Dark (#414833) |
| 1 | 6 | Lion (#A68A64) | Light (#EDE0D4) |
| 2 | 12 | Coffee (#7F5539) | Light |
| 3 | 24 | Reseda (#656D4A) | Light |
| 4 | 48 | Ebony (#414833) | Light |
| 5 | 64 | Deep Ebony (#2d3320) | Light |
| 6 | 128+ | Gold gradient (#edcf72→#edc22e) | Dark |
| 11+ | 6144+ | Coffee (#7F5539) | Light |

Gold-tier tiles (128–2048 equivalent) have a **glow effect** that intensifies with higher values (radius 14px → 32px).

### Tile media art
Tiles with catalog entries show a **faded version of the game art** as a background image behind the tile number.

### Animations
| Animation | Duration | Description |
|---|---|---|
| Slide | 100ms | Tiles translate from old position to new position |
| Spawn | 150ms | New tile scales from 0 to full size |
| Merge | 120ms | Merged tile pops (scale up then back) |
| Score count-up | 300ms | Score display chases real value |
| Tag stagger | 100ms each | Tags appear one at a time at game over |
| Win timer | 5000ms | Progress bar shrinks to zero |
| Rearrange flash | (renderer-controlled) | Board flash effect during shuffle |

### Board layout
- Board background: Ebony (#414833)
- Empty cells: Reseda (#656D4A)
- Tile gap: 10px
- Board padding: 12px
- Tile corner radius: 12px
- Board corner radius: 16px

---

## 13. ALL DEFAULT VALUES IN ONE PLACE

| Parameter | Default | Range/Notes |
|---|---|---|
| Grid size | 4x4 | Configurable via admin |
| Base tile | 3 | 2–5 via settings |
| Win tile | 3072 | base tile x 1024 |
| Spawn probability (double) | 10% | Fixed |
| Laser charges | 1 | 0+ via admin |
| Bomb charges | 1 | 0+ via admin |
| Rearrange charges | 0 | 0+ via admin |
| Double charges | 0 | Fixed in config |
| Undo charges | 0 | Fixed in config |
| Freeze charges | 0 | Fixed in config |
| Upgrade charges | 0 | Fixed in config |
| Swap charges | 0 | Fixed in config |
| Power drop every N moves | 15 | Fixed |
| Fossil threshold | 11 turns | Fixed |
| Tortoise threshold | 300 moves | Fixed |
| Speedrun threshold | 100 moves | Fixed |
| Slide animation | 100ms | Fixed |
| Spawn animation | 150ms | Fixed |
| Merge animation | 120ms | Fixed |
| Win dismiss timer | 5000ms | Fixed |
| Swipe threshold | 30px | Fixed |
| Swipe timeout | 500ms | Fixed |
| Undo stack depth | 3 | Fixed |

---

## 14. CRITICAL RULES — DO NOT VIOLATE

1. **Each tile merges at most once per move.** `[3,3,3,3]` sliding left = `[6,6,0,0]`, never `[12,0,0,0]`. This is the single most important rule in the game.
2. **Merges are directional.** Tiles merge toward the slide direction. In ambiguous cases (e.g., `[3,3,3]` left), the pair closest to the slide direction merges first: result is `[6,3,0]`.
3. **No cascades.** One pass per move. Period.
4. **A move that changes nothing is invalid.** No tile spawns, no score, no move counted.
5. **Score comes only from merges.** The merged tile's new value is the score increment. Nothing else adds to the base score.
6. **Power-ups are NOT moves.** They don't increment move count, don't spawn tiles (except Freeze affecting the next move), and don't trigger power-up drops.
7. **Tile spawning happens AFTER the slide, not before.** The slide resolves fully, then one random tile appears on an empty cell.
8. **The game ends only when the board is full AND no merges are possible.** A full board with any adjacent equal pair is NOT game over.
9. **Tag multipliers stack multiplicatively, not additively.** Purist (x2) + Overclock (x1.5) = x3.0, not x3.5.
10. **The win overlay appears exactly once.** After acknowledgment, the player can keep going indefinitely with no further interruption.
