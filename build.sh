#!/bin/bash
# ============================================================
# build.sh — Bundle ES modules into a single file for file:// use
# Output: dist/index.html (self-contained, no module imports)
# ============================================================

set -e
cd "$(dirname "$0")"

mkdir -p dist
cp -r assets dist/ 2>/dev/null || true
cp style.css dist/

echo "Bundling JS modules..."

node -e "
const fs = require('fs');

// Read all source files
const configSrc  = fs.readFileSync('config.js', 'utf8');
const storageSrc = fs.readFileSync('storage.js', 'utf8');
const logicSrc   = fs.readFileSync('logic.js', 'utf8');
const tagsSrc    = fs.readFileSync('tags.js', 'utf8');
const stateSrc   = fs.readFileSync('state.js', 'utf8');
const rendererSrc = fs.readFileSync('renderer.js', 'utf8');
const inputSrc   = fs.readFileSync('input.js', 'utf8');
const mainSrc    = fs.readFileSync('main.js', 'utf8');

function stripImports(src) {
  return src.replace(/^import .+$/gm, '// (import removed)');
}

function stripExports(src) {
  // 'export const X' → 'const X', 'export function' → 'function', 'export let' → 'let'
  return src
    .replace(/^export (const |let |var |function |class )/gm, '\$1')
    .replace(/^export \{[^}]*\};?$/gm, '// (export removed)');
}

function clean(src) {
  return stripExports(stripImports(src));
}

// Build the bundle with module namespacing to avoid collisions
const bundle = \`/* 2048 — The Master Edition (bundled build) */
(function() {
'use strict';

// ═══════════════════════════════════════════
// CONFIG MODULE
// ═══════════════════════════════════════════
\${clean(configSrc)}

// ═══════════════════════════════════════════
// STORAGE MODULE
// ═══════════════════════════════════════════
const storage = (function() {
\${clean(storageSrc)}
return { getBest, setBest, getHistory, addResult, clearHistory, getSettings, setSetting, saveSettings, getDailyPlays, incrementDailyPlays, getDiscoveredTiles, setDiscoveredTiles, resetAll };
})();

// ═══════════════════════════════════════════
// LOGIC MODULE
// ═══════════════════════════════════════════
const logic = (function() {
\${clean(logicSrc)}
return { slideLine, slide, spawnTile, getEmptyCells, getMaxTile, countTiles, isGameOver, hasWon, rearrangeGrid, applyLaser, applyDouble, applyBomb, applyUpgrade, applySwap };
})();

// ═══════════════════════════════════════════
// TAGS MODULE
// ═══════════════════════════════════════════
\${clean(tagsSrc)}

// ═══════════════════════════════════════════
// STATE MODULE
// ═══════════════════════════════════════════
\${clean(stateSrc)}

// ═══════════════════════════════════════════
// RENDERER MODULE
// ═══════════════════════════════════════════
const renderer = (function() {
\${clean(rendererSrc)}
return { init, resize, render, isAnimating, startSlideAnim, flashRearrange, flashCell, showPowerDrop, getLayout, setDiscoveryPanelH, preloadMediaImage, setBarScroll, getBarScrollX, hitAreas };
})();

// ═══════════════════════════════════════════
// INPUT MODULE
// ═══════════════════════════════════════════
const input = (function() {
  const { hitAreas, setBarScroll, getBarScrollX, getLayout } = renderer;
\${clean(inputSrc)}
return { setup, hitTestPowerup, hitTestCell, hitTestQuit, hitTestArrow };
})();

// ═══════════════════════════════════════════
// MAIN MODULE
// ═══════════════════════════════════════════
\${clean(mainSrc)}

})();
\`;

fs.writeFileSync('dist/bundle.js', bundle);
console.log('  bundle.js: ' + Math.round(bundle.length / 1024) + 'KB');
"

# Build index.html — replace module script with bundle
sed 's|<script type="module" src="main.js"></script>|<script src="bundle.js"></script>|' index.html > dist/index.html

echo "✓ Built dist/ — $(du -sh dist | cut -f1) total"
echo "  Open dist/index.html directly in any browser"
