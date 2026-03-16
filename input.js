/* ============================================================
   input.js — Unified input handler.
   Handles keyboard arrows, pointer swipes, and canvas taps.
   ============================================================ */

import { hitAreas } from './renderer.js';

const SWIPE_THRESHOLD  = 30;   // px minimum for swipe recognition
const SWIPE_TIMEOUT_MS = 500;  // ignore slow drags

let onSwipe = null;   // (direction: 'left'|'right'|'up'|'down') => void
let onTap   = null;   // (x, y) => void — canvas-space coordinates

let pointerStart  = null;
let pointerStartT = 0;

export function setup(canvas, swipeCb, tapCb) {
  onSwipe = swipeCb;
  onTap   = tapCb;

  // ---- Keyboard ----
  window.addEventListener('keydown', onKey, { passive: false });

  // ---- Pointer (mouse + touch via PointerEvents) ----
  canvas.addEventListener('pointerdown',  onPointerDown,  { passive: true });
  canvas.addEventListener('pointermove',  onPointerMove,  { passive: true });
  canvas.addEventListener('pointerup',    onPointerUp,    { passive: true });
  canvas.addEventListener('pointercancel', onPointerCancel, { passive: true });

  // Prevent browser swipe-back navigation
  canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
}

// ============================================================
// KEYBOARD
// ============================================================

const KEY_DIR = {
  ArrowLeft:  'left',
  ArrowRight: 'right',
  ArrowUp:    'up',
  ArrowDown:  'down',
  a: 'left', A: 'left',
  d: 'right',D: 'right',
  w: 'up',   W: 'up',
  s: 'down', S: 'down',
};

function onKey(e) {
  const dir = KEY_DIR[e.key];
  if (dir) {
    e.preventDefault();
    onSwipe?.(dir);
  }
}

// ============================================================
// POINTER EVENTS
// ============================================================

function getCanvasXY(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left),
    y: (e.clientY - rect.top),
  };
}

function onPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  pointerStart  = getCanvasXY(e, e.currentTarget);
  pointerStartT = Date.now();
}

function onPointerMove() { /* intentionally empty — we use start/end delta */ }

function onPointerUp(e) {
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
    // Treat as tap
    onTap?.(start.x, start.y);
  } else {
    // Treat as swipe
    const dir = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down'  : 'up');
    onSwipe?.(dir);
  }
}

function onPointerCancel() {
  pointerStart = null;
}

// ============================================================
// HIT-TESTING HELPERS (used by main.js)
// ============================================================

export function hitTestPowerup(x, y) {
  for (const area of hitAreas.powerups) {
    if (x >= area.x && x <= area.x + area.w &&
        y >= area.y && y <= area.y + area.h) {
      return area.name;
    }
  }
  return null;
}

export function hitTestCell(x, y) {
  for (const area of hitAreas.cells) {
    if (x >= area.x && x <= area.x + area.w &&
        y >= area.y && y <= area.y + area.h) {
      return { row: area.row, col: area.col };
    }
  }
  return null;
}

export function hitTestQuit(x, y) {
  const q = hitAreas.quitBtn;
  if (!q) return false;
  return x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h;
}

export function hitTestArrow(x, y) {
  for (const a of hitAreas.arrows) {
    if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) {
      return a.dir;
    }
  }
  return null;
}
