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
  powerups: [],   // [{name, x,y,w,h}]
  quitBtn:  null, // {x,y,w,h}
  cells:    [],   // [{row,col,x,y,w,h}] — used during TARGETING
  arrows:   [],   // [{dir, x,y,w,h}] — directional bumper buttons
};

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
  const colors = getTileColors(value);

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
  const { w, boardY, boardSize, boardX, h, POWERBAR_H } = layout;
  const barW = boardSize;
  const barH = Math.min(68, POWERBAR_H - 10);
  const barX = boardX;
  // Position bar at: board bottom + bottom-bumper + gap + centering
  // Powerbar lives in the bottom zone: centred in POWERBAR_H strip at screen bottom
  const barY = h - POWERBAR_H - 8 + (POWERBAR_H - barH) / 2;

  // Glass pill background
  ctx.save();
  roundRect(ctx, barX, barY, barW, barH, 16);
  ctx.fillStyle = 'rgba(187,173,160,0.35)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth   = 1;
  ctx.stroke();
  ctx.restore();

  const powers  = ['LASER', 'BOMB', 'REARRANGE'];
  const icons   = ['⚡', '💣', '🔀'];
  const labels  = ['LASER', 'BOMB', 'SHUFFLE'];
  const btnW    = (barW - 32) / 3;
  const btnH    = 62;
  const gapBtn  = 8;

  hitAreas.powerups = [];

  powers.forEach((name, i) => {
    const bX      = barX + 8 + i * (btnW + gapBtn);
    const bY      = barY + (barH - btnH) / 2;
    const charges = state.powers[name] ?? 0;
    const active  = state.activePower === name;
    const empty   = charges <= 0;

    // Button bg
    roundRect(ctx, bX, bY, btnW, btnH, 10);
    if (active) {
      ctx.fillStyle = CONFIG.COLORS.TEXT_DARK;
    } else if (empty) {
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
    }
    ctx.fill();

    ctx.globalAlpha = empty ? 0.35 : 1;

    // Icon
    ctx.font         = `${Math.round(btnH * 0.34)}px ${CONFIG.FONT_FAMILY}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[i], bX + btnW / 2, bY + btnH * 0.38);

    // Label
    ctx.fillStyle = active ? CONFIG.COLORS.TEXT_LIGHT : CONFIG.COLORS.TEXT_DARK;
    ctx.font      = `bold 9px ${CONFIG.FONT_FAMILY}`;
    ctx.fillText(labels[i], bX + btnW / 2, bY + btnH * 0.68);

    // Charge count badge
    if (charges > 0) {
      const bR  = 9;
      const bCX = bX + btnW - bR + 2;
      const bCY = bY + bR - 2;
      ctx.beginPath();
      ctx.arc(bCX, bCY, bR, 0, Math.PI * 2);
      ctx.fillStyle = active ? CONFIG.COLORS.TEXT_LIGHT : CONFIG.COLORS.BOARD_BG;
      ctx.fill();
      ctx.fillStyle = active ? CONFIG.COLORS.TEXT_DARK : CONFIG.COLORS.TEXT_LIGHT;
      ctx.font      = `bold 11px ${CONFIG.FONT_FAMILY}`;
      ctx.fillText(String(charges), bCX, bCY);
    }

    ctx.globalAlpha = 1;

    hitAreas.powerups.push({ name, x: bX, y: bY, w: btnW, h: btnH });
  });
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

      // LASER & BOMB need a non-empty tile; BOMB can also be centred on empty
      const valid = (power === 'BOMB') || !isEmpty;
      if (!valid) continue;

      // Glowing highlight
      ctx.save();
      roundRect(ctx, x, y, cellSize, cellSize, CONFIG.TILE_RADIUS);
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.5 * pulse})`;
      ctx.lineWidth   = 3;
      ctx.stroke();
      if (!isEmpty) {
        ctx.fillStyle = `rgba(255,255,255,${0.08 + 0.08 * pulse})`;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Cancel hint text
  ctx.fillStyle    = 'rgba(255,255,255,0.85)';
  ctx.font         = `bold 13px ${CONFIG.FONT_FAMILY}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Tap a tile  ·  Swipe to cancel', boardX + boardSize / 2, boardY - 14);
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
