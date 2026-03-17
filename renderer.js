/* ============================================================
   renderer.js — The Artist. All Canvas drawing lives here.

   Animation pipeline per move:
     1. SLIDE   — tiles travel to new positions  (ANIM_SLIDE_MS)
     2. MERGE   — merged tiles pop with scale    (ANIM_MERGE_MS)
     3. SPAWN   — new tile scales in             (ANIM_SPAWN_MS)
     4. IDLE    — grid drawn statically
   ============================================================ */

import { CONFIG, getTileColors } from './config.js';
import { state } from './state.js';

// ---- Canvas / context ----
let canvas, ctx;
let logW = 0, logH = 0;   // logical (CSS) dimensions
let dpr   = 1;

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
export let hitAreas = {
  powerups:         [],   // [{name, x,y,w,h}]  — absolute canvas coords
  quitBtn:          null, // {x,y,w,h}
  cells:            [],   // [{row,col,x,y,w,h}] — used during TARGETING
  arrows:           [],   // [{dir, x,y,w,h}]    — directional bumper buttons
  barRect:          null, // {x,y,w,h}           — full powerup bar area for drag detection
  scrollTrack:      null, // {x,y,w,h,maxScroll} — scroll indicator track for click-to-jump
  powerDropChoices: [],   // [{name, x,y,w,h}]   — 3-choice picker buttons
};

// ---- Powerup bar scroll state ----
let barScrollX   = 0;
const BTN_W      = 82;   // fixed button width regardless of board width
const BTN_GAP    = 8;
const BAR_PAD    = 10;   // inner left/right padding

export function setBarScroll(x) {
  barScrollX = x; // clamped in drawPowerupBar each frame
}
export function getBarScrollX() { return barScrollX; }

// ============================================================
// PUBLIC API
// ============================================================

export function init(canvasEl) {
  canvas = canvasEl;
  ctx    = canvas.getContext('2d');
  resize();
}

export function resize() {
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
export function render(timestamp) {
  ctx.clearRect(0, 0, logW, logH);

  const layout = getLayout();
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

export function isAnimating() {
  return phase !== 'idle';
}

// Kick off a full slide animation sequence
export function startSlideAnim(preGrid, moves, spawned, callback) {
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
export function flashRearrange(callback) {
  onAnimDone = callback;
  setPhase('spawn', CONFIG.ANIM_SPAWN_MS);
  spawnCell = null; // flash whole board
}

// Flash a single cell (used for UPGRADE visual)
export function flashCell(row, col, callback) {
  spawnCell  = { row, col };
  onAnimDone = callback;
  setPhase('spawn', CONFIG.ANIM_SPAWN_MS);
}

// ---- Power-drop toast notification ----
let powerDropToast = null; // { text, alpha, startTime }

export function showPowerDrop(powerName) {
  const labels = { LASER: '⚡ Laser', BOMB: '💣 Bomb', REARRANGE: '🔀 Shuffle', DOUBLE: '×2 Double', UNDO: '↩ Undo', FREEZE: '❄ Freeze', UPGRADE: '⬆ Upgrade', SWAP: '↔ Swap' };
  powerDropToast = { text: `+1 ${labels[powerName] || powerName}`, alpha: 1, startTime: performance.now() };
}

export function getLayout() {
  return computeLayout(logW, logH);
}

// ============================================================
// LAYOUT COMPUTATION
// ============================================================

// Bumper dimensions — thin strips
const BMP_TB  = 22;   // top / bottom bumper height
const BMP_LR  = 22;   // left / right bumper width
const BMP_GAP = 5;    // gap between bumper and board edge

function computeLayout(w, h) {
  const N = state.grid.length || CONFIG.GRID_SIZE;

  // Fixed chrome heights
  const HEADER_H   = 56;
  const POWERBAR_H = state.settings.powersEnabled !== false ? 78 : 0;
  const MARGIN_V   = 8;   // top + bottom outer margins
  const MARGIN_H   = 8;   // left + right outer margins

  // Vertical stack: header | gap | top-bumper | gap | BOARD | gap | bot-bumper | gap | powerbar
  const fixedV = HEADER_H + MARGIN_V + (BMP_TB + BMP_GAP) * 2 + POWERBAR_H + MARGIN_V;
  const availH  = h - fixedV;

  // Horizontal: margin | left-bumper | gap | BOARD | gap | right-bumper | margin
  const fixedH = 2 * MARGIN_H + 2 * (BMP_LR + BMP_GAP);
  const availW  = w - fixedH;

  const boardSize = Math.min(availH, availW, 480);

  // Board origin — centred horizontally, stacked vertically from header
  const boardX = (w - boardSize) / 2;
  const topOfBoard = HEADER_H + MARGIN_V + BMP_TB + BMP_GAP;
  const boardY = topOfBoard + Math.max(0, (availH - boardSize) / 2);

  const gap      = CONFIG.TILE_GAP;
  const padding  = CONFIG.BOARD_PADDING;
  const cellSize = (boardSize - 2 * padding - (N - 1) * gap) / N;

  return { w, h, boardX, boardY, boardSize, N, gap, padding, cellSize, HEADER_H, POWERBAR_H };
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

function drawBackground({ w, h }) {
  ctx.fillStyle = CONFIG.COLORS.BG;
  ctx.fillRect(0, 0, w, h);
}

// ============================================================
// DRAWING — Header (Score + Quit button)
// ============================================================

function drawHeader({ w, HEADER_H }) {
  const H  = HEADER_H;
  const cy = H / 2;

  // Quit button — left side
  const qW = 48, qH = 30, qX = 10, qY = cy - qH / 2;
  roundRect(ctx, qX, qY, qW, qH, 7);
  ctx.fillStyle = CONFIG.COLORS.BOARD_BG;
  ctx.fill();
  ctx.fillStyle    = CONFIG.COLORS.TEXT_LIGHT;
  ctx.font         = `bold 11px ${CONFIG.FONT_FAMILY}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('QUIT', qX + qW / 2, qY + qH / 2);
  hitAreas.quitBtn = { x: qX, y: qY, w: qW, h: qH };

  // Score boxes — centred
  const boxW = 58, boxH = 40, gap = 8;
  const totalW = boxW * 2 + gap;
  const bx = (w - totalW) / 2;
  const by = cy - boxH / 2;
  drawScoreBox(bx,          by, boxW, boxH, 'SCORE', Math.round(state.displayScore));
  drawScoreBox(bx + boxW + gap, by, boxW, boxH, 'BEST',  state.best);
}

function drawScoreBox(x, y, w, h, label, value) {
  roundRect(ctx, x, y, w, h, 6);
  ctx.fillStyle = CONFIG.COLORS.BOARD_BG;
  ctx.fill();

  ctx.fillStyle    = 'rgba(249,246,242,0.60)';
  ctx.font         = `bold 8px ${CONFIG.FONT_FAMILY}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + 11);

  ctx.fillStyle = CONFIG.COLORS.TEXT_LIGHT;
  const fontSize = value >= 100000 ? 12 : value >= 10000 ? 14 : 17;
  ctx.font       = `bold ${fontSize}px ${CONFIG.FONT_FAMILY}`;
  ctx.fillText(String(value), x + w / 2, y + h - 12);
}

// ============================================================
// DRAWING — Directional Arrow Bumpers
// ============================================================

function drawArrowBumpers(layout) {
  const { boardX, boardY, boardSize } = layout;
  const isTargeting = state.screen === 'TARGETING';

  // Top / bottom: full board width, thin height
  // Left / right: full board height, thin width
  const bumpers = [
    { dir: 'up',
      x: boardX,                          y: boardY - BMP_GAP - BMP_TB,
      w: boardSize,                       h: BMP_TB, arrow: '↑' },
    { dir: 'down',
      x: boardX,                          y: boardY + boardSize + BMP_GAP,
      w: boardSize,                       h: BMP_TB, arrow: '↓' },
    { dir: 'left',
      x: boardX - BMP_GAP - BMP_LR,      y: boardY,
      w: BMP_LR,                          h: boardSize, arrow: '←' },
    { dir: 'right',
      x: boardX + boardSize + BMP_GAP,   y: boardY,
      w: BMP_LR,                          h: boardSize, arrow: '→' },
  ];

  hitAreas.arrows = [];

  bumpers.forEach(b => {
    ctx.save();

    // Pill background
    roundRect(ctx, b.x, b.y, b.w, b.h, 8);
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
  const { boardX, boardY, boardSize, N, cellSize, gap, padding } = layout;

  // Board background
  roundRect(ctx, boardX, boardY, boardSize, boardSize, CONFIG.BOARD_RADIUS);
  ctx.fillStyle = CONFIG.COLORS.BOARD_BG;
  ctx.fill();

  // Empty cells
  hitAreas.cells = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const { x, y } = cellTL(r, c, layout);
      roundRect(ctx, x, y, cellSize, cellSize, CONFIG.TILE_RADIUS);
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
  const baseTile = state.settings.baseTile || 2;
  const colors   = getTileColors(value, baseTile);

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
  roundRect(ctx, x, y, size, size, CONFIG.TILE_RADIUS);
  ctx.fillStyle = colors.bg;
  ctx.fill();

  ctx.shadowBlur = 0;

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
  const { boardX, boardSize, h, POWERBAR_H } = layout;
  const barW = boardSize;
  const barH = Math.min(70, POWERBAR_H - 8);
  const barX = boardX;
  const barY = h - POWERBAR_H - 8 + (POWERBAR_H - barH) / 2;

  // Expose bar rect for drag detection in input.js
  hitAreas.barRect = { x: barX, y: barY, w: barW, h: barH };

  // ---- Powerup definitions (extensible) ----
  const ALL_POWERS = [
    { name: 'LASER',   icon: '⚡', label: 'LASER'   },
    { name: 'BOMB',    icon: '💣', label: 'BOMB'    },
    { name: 'REARRANGE',icon:'🔀', label: 'SHUFFLE' },
    { name: 'DOUBLE',  icon: '×2', label: 'DOUBLE'  },
    { name: 'UNDO',    icon: '↩',  label: 'UNDO'    },
    { name: 'FREEZE',  icon: '❄',  label: 'FREEZE'  },
    { name: 'UPGRADE', icon: '⬆',  label: 'UPGRADE' },
    { name: 'SWAP',    icon: '↔',  label: 'SWAP'    },
  ];

  // Sort: highest charge count on the left
  const sorted = [...ALL_POWERS].sort((a, b) => {
    const ca = state.powers[a.name] ?? 0;
    const cb = state.powers[b.name] ?? 0;
    return cb - ca;
  });

  const btnH      = barH - 14;           // button height leaves room for scroll indicator
  const contentW  = sorted.length * BTN_W + (sorted.length - 1) * BTN_GAP + 2 * BAR_PAD;
  const maxScroll = Math.max(0, contentW - barW);

  // Clamp scroll
  barScrollX = Math.max(0, Math.min(barScrollX, maxScroll));

  // ---- Bar glass background ----
  ctx.save();
  roundRect(ctx, barX, barY, barW, barH, 14);
  ctx.fillStyle = 'rgba(187,173,160,0.32)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth   = 1;
  ctx.stroke();

  // ---- Clip to bar interior so buttons don't bleed over edges ----
  roundRect(ctx, barX + 1, barY + 1, barW - 2, barH - 2, 13);
  ctx.clip();

  hitAreas.powerups = [];

  sorted.forEach((p, i) => {
    const charges = state.powers[p.name] ?? 0;
    const active  = state.activePower === p.name;
    const empty   = charges <= 0;

    // Absolute X in canvas space (accounting for scroll)
    const bX = barX + BAR_PAD + i * (BTN_W + BTN_GAP) - barScrollX;
    const bY = barY + (barH - btnH) / 2 - 3; // shift up slightly for scroll indicator

    // Skip if entirely outside bar
    if (bX + BTN_W < barX || bX > barX + barW) return;

    // Button background
    roundRect(ctx, bX, bY, BTN_W, btnH, 10);
    ctx.fillStyle = active ? CONFIG.COLORS.TEXT_DARK
                  : empty  ? 'rgba(0,0,0,0.06)'
                           : 'rgba(255,255,255,0.52)';
    ctx.fill();

    ctx.globalAlpha = empty ? 0.32 : 1;

    // Icon
    ctx.fillStyle    = active ? CONFIG.COLORS.TEXT_LIGHT : CONFIG.COLORS.TEXT_DARK;
    ctx.font         = `${Math.round(btnH * 0.36)}px ${CONFIG.FONT_FAMILY}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.icon, bX + BTN_W / 2, bY + btnH * 0.38);

    // Label
    ctx.font      = `bold 8px ${CONFIG.FONT_FAMILY}`;
    ctx.fillStyle = active ? CONFIG.COLORS.TEXT_LIGHT : CONFIG.COLORS.TEXT_DARK;
    ctx.fillText(p.label, bX + BTN_W / 2, bY + btnH * 0.70);

    ctx.globalAlpha = 1;

    // Charge badge
    if (charges > 0) {
      const bR  = 8;
      const bCX = bX + BTN_W - bR + 1;
      const bCY = bY + bR - 1;
      ctx.beginPath();
      ctx.arc(bCX, bCY, bR, 0, Math.PI * 2);
      ctx.fillStyle = active ? CONFIG.COLORS.TEXT_LIGHT : CONFIG.COLORS.BOARD_BG;
      ctx.fill();
      ctx.fillStyle = active ? CONFIG.COLORS.TEXT_DARK : CONFIG.COLORS.TEXT_LIGHT;
      ctx.font      = `bold 10px ${CONFIG.FONT_FAMILY}`;
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
    const indicatorY  = barY + barH - 5;
    const trackW      = barW - 24;
    const trackX      = barX + 12;
    const thumbW      = Math.max(28, trackW * (barW / contentW));
    const thumbX      = trackX + (barScrollX / maxScroll) * (trackW - thumbW);

    // Register a generous hit area around the track for click-to-jump
    hitAreas.scrollTrack = { x: trackX, y: indicatorY - 8, w: trackW, h: 16, maxScroll, thumbW };

    // Track
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle   = CONFIG.COLORS.TEXT_DARK;
    ctx.beginPath();
    ctx.roundRect(trackX, indicatorY, trackW, 3, 1.5);
    ctx.fill();

    // Thumb
    ctx.globalAlpha = 0.55;
    ctx.fillStyle   = CONFIG.COLORS.TEXT_DARK;
    ctx.beginPath();
    ctx.roundRect(thumbX, indicatorY, thumbW, 3, 1.5);
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
  const { boardX, boardY, boardSize, N, cellSize } = layout;

  // Dim the board
  roundRect(ctx, boardX, boardY, boardSize, boardSize, CONFIG.BOARD_RADIUS);
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
      roundRect(ctx, x, y, cellSize, cellSize, CONFIG.TILE_RADIUS);
      ctx.strokeStyle = isSwapFirst
        ? `rgba(237,194,46,${0.7 + 0.3 * pulse})`
        : `rgba(255,255,255,${0.5 + 0.5 * pulse})`;
      ctx.lineWidth = isSwapFirst ? 4 : 3;
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
  ctx.font         = `bold 13px ${CONFIG.FONT_FAMILY}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(hint, boardX + boardSize / 2, boardY - 14);
}

// ============================================================
// DRAWING — Power-drop 3-Choice Picker
// ============================================================

const POWER_META = {
  LASER:    { icon: '⚡', label: 'LASER'   },
  BOMB:     { icon: '💣', label: 'BOMB'    },
  REARRANGE:{ icon: '🔀', label: 'SHUFFLE' },
  DOUBLE:   { icon: '×2', label: 'DOUBLE'  },
  UNDO:     { icon: '↩',  label: 'UNDO'    },
  FREEZE:   { icon: '❄',  label: 'FREEZE'  },
  UPGRADE:  { icon: '⬆',  label: 'UPGRADE' },
  SWAP:     { icon: '↔',  label: 'SWAP'    },
};

function drawPowerDropPicker(layout) {
  const { w, h } = layout;

  // Full-screen dim
  ctx.fillStyle = 'rgba(0,0,0,0.58)';
  ctx.fillRect(0, 0, w, h);

  // Card
  const btnW = 82, btnH = 92, btnGap = 10;
  const totalBtnW = 3 * btnW + 2 * btnGap;
  const cardPadX = 24, cardPadTop = 44, cardPadBot = 20;
  const cardW = totalBtnW + cardPadX * 2;
  const cardH = cardPadTop + btnH + cardPadBot;
  const cardX = (w - cardW) / 2;
  const cardY = (h - cardH) / 2;

  roundRect(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.fillStyle = '#faf8ef';
  ctx.fill();
  ctx.strokeStyle = 'rgba(187,173,160,0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Title
  ctx.fillStyle    = CONFIG.COLORS.TEXT_DARK;
  ctx.font         = `bold 13px ${CONFIG.FONT_FAMILY}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡ Power Drop — pick one!', w / 2, cardY + 22);

  // Buttons
  const btnStartX = cardX + cardPadX;
  const btnY      = cardY + cardPadTop;

  hitAreas.powerDropChoices = [];

  (state.powerDropChoices || []).forEach((name, i) => {
    const meta = POWER_META[name] || { icon: '?', label: name };
    const bX   = btnStartX + i * (btnW + btnGap);

    // Button bg
    roundRect(ctx, bX, btnY, btnW, btnH, 12);
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
    ctx.font      = `bold 9px ${CONFIG.FONT_FAMILY}`;
    ctx.fillStyle = CONFIG.COLORS.TEXT_DARK;
    ctx.fillText(meta.label, bX + btnW / 2, btnY + btnH * 0.76);

    hitAreas.powerDropChoices.push({ name, x: bX, y: btnY, w: btnW, h: btnH });
  });
}

// ============================================================
// DRAWING — Freeze Active Indicator
// ============================================================

function drawFreezeIndicator(layout) {
  const { boardX, boardY, boardSize } = layout;
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
  ctx.save();
  ctx.globalAlpha = 0.7 + 0.3 * pulse;
  ctx.fillStyle   = 'rgba(100,200,255,0.92)';
  ctx.font        = `bold 11px ${CONFIG.FONT_FAMILY}`;
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('❄ SPAWN FROZEN', boardX + boardSize / 2, boardY - 14);
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

  const { boardX, boardSize, boardY } = layout;
  const cx = boardX + boardSize / 2;
  const cy = boardY + boardSize / 2 + rise;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Pill background
  const PAD_X = 16, PAD_Y = 8;
  ctx.font = `bold 14px ${CONFIG.FONT_FAMILY}`;
  const textW = ctx.measureText(powerDropToast.text).width;
  const pillW = textW + PAD_X * 2;
  const pillH = 30;
  roundRect(ctx, cx - pillW / 2, cy - pillH / 2, pillW, pillH, 15);
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

function goToSpawnOrDone(timestamp) {
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
