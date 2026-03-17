/* ============================================================
   main.js — Orchestrator.
   Connects modules, manages the game loop & screen state machine.
   ============================================================ */

import { CONFIG }          from './config.js';
import * as storage        from './storage.js';
import * as logic          from './logic.js';
import { state, initState, startNewGame, ageTiles, getMaxTileAge } from './state.js';
import { evaluateTags, TAG_DEFS } from './tags.js';
import * as renderer        from './renderer.js';
import * as input           from './input.js';

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

// Check grid for newly discovered catalog tiles — call after every grid change
function checkDiscoveries() {
  const catalogValues = Object.keys(CONFIG.MEDIA_CATALOG).map(Number);
  const newOnes = [];

  state.grid.forEach(row => row.forEach(v => {
    if (v > 0 && catalogValues.includes(v) && !state.discoveredTiles.has(v)) {
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
      <span class="disc-title">${entry.title}</span>`;

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
    const shuffled = [...allPowers].sort(() => Math.random() - 0.5);
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
  if (power !== 'LASER') state.onlyLaserUsed = false;

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
  state.onlyLaserUsed  = false;
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
  state.onlyLaserUsed = false;
  state.activePower   = null;
}

function applyFreeze() {
  state.freezeNextSpawn = true;
  state.powers.FREEZE--;
  state.powersUsed.add('FREEZE');
  state.onlyLaserUsed = false;
  state.activePower   = null;
}

function applyUpgrade() {
  const { newGrid, row, col } = logic.applyUpgrade(state.grid);
  state.grid = newGrid;
  state.powers.UPGRADE--;
  state.powersUsed.add('UPGRADE');
  state.onlyLaserUsed = false;
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

    // Tap to toggle tooltip, tap same again to dismiss
    tagsEl.addEventListener('click', e => {
      const pill = e.target.closest('.tag-pill-lg');
      if (!pill) return;
      const wasOpen = pill.classList.contains('tooltip-open');
      tagsEl.querySelectorAll('.tag-pill-lg.tooltip-open').forEach(p => p.classList.remove('tooltip-open'));
      if (!wasOpen) pill.classList.add('tooltip-open');
    }, { capture: true });
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
