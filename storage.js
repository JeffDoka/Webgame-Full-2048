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
export function getBest() {
  return safeGet(KEY_BEST, 0);
}

export function setBest(n) {
  safeSet(KEY_BEST, n);
}

// ---- History ----
// GameResult: { date, score, maxTile, totalMoves, durationMs, tags, powersUsed }
export function getHistory() {
  return safeGet(KEY_HISTORY, []);
}

export function addResult(result) {
  const history = getHistory();
  history.unshift(result); // newest first
  // Keep max 200 entries
  if (history.length > 200) history.length = 200;
  safeSet(KEY_HISTORY, history);
}

export function clearHistory() {
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

export function getSettings() {
  const stored = safeGet(KEY_SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function setSetting(key, value) {
  const settings = getSettings();
  settings[key] = value;
  safeSet(KEY_SETTINGS, settings);
}

export function saveSettings(settings) {
  safeSet(KEY_SETTINGS, settings);
}

// ---- Daily Plays ----
export function getDailyPlays() {
  return safeGet(KEY_DAILY(today()), 0);
}

export function incrementDailyPlays() {
  const count = getDailyPlays() + 1;
  safeSet(KEY_DAILY(today()), count);
  return count;
}

// ---- Discovered Tiles (media catalog) ----
const KEY_DISCOVERED = '2048_discovered';

export function getDiscoveredTiles() {
  return safeGet(KEY_DISCOVERED, []);
}

export function setDiscoveredTiles(arr) {
  safeSet(KEY_DISCOVERED, arr);
}

// ---- Reset All ----
export function resetAll() {
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
