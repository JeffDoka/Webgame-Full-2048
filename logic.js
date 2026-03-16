/* ============================================================
   logic.js — Mathematical heart. Pure functions only.
   No side-effects. No imports from mutable modules.
   ============================================================ */

// ---- Slide a single 1-D line towards index 0 (left) ----
// Returns: { result[], moves[], scoreIncrement }
// moves: [{from, to, value, isMergeResult, isMergeContributor}]
//   - isMergeResult: this tile's value doubles (stays at dest)
//   - isMergeContributor: this tile disappears into dest
//   - plain slide: just moves
export function slideLine(line) {
  const n = line.length;
  const moves = [];
  let score = 0;

  // Collect non-zero tiles with source index
  const tiles = [];
  for (let i = 0; i < n; i++) {
    if (line[i] !== 0) tiles.push({ from: i, value: line[i] });
  }

  const result = new Array(n).fill(0);
  let dest = 0;
  let i = 0;

  while (i < tiles.length) {
    const curr = tiles[i];

    if (i + 1 < tiles.length && tiles[i + 1].value === curr.value) {
      // Merge: curr survives with doubled value, next disappears
      const next = tiles[i + 1];
      const newVal = curr.value * 2;
      score += newVal;
      result[dest] = newVal;

      moves.push({ from: curr.from, to: dest, value: curr.value, isMergeResult: true });
      moves.push({ from: next.from, to: dest, value: next.value, isMergeContributor: true });

      i += 2;
    } else {
      // Plain slide
      result[dest] = curr.value;
      moves.push({ from: curr.from, to: dest, value: curr.value });
      i += 1;
    }
    dest++;
  }

  return { result, moves, score };
}

// ---- Slide full grid in a direction ----
// Returns: { newGrid, moved, moves[], scoreIncrement }
// moves: [{fromRow, fromCol, toRow, toCol, value, isMergeResult, isMergeContributor}]
export function slide(grid, direction) {
  const N = grid.length;
  // Work on a deep copy
  const newGrid = grid.map(r => [...r]);
  let totalScore = 0;
  let moved = false;
  const allMoves = [];

  // Helper: extract line, slide it, write back + map coordinates
  function processLine(lineGetter, lineSetter, coordMapper) {
    for (let r = 0; r < N; r++) {
      const line = lineGetter(r);
      const original = [...line];
      const { result, moves, score } = slideLine(line);

      lineSetter(r, result);
      totalScore += score;

      // Check change
      if (original.some((v, i) => v !== result[i])) moved = true;

      moves.forEach(m => {
        const [fromRow, fromCol] = coordMapper(r, m.from);
        const [toRow, toCol]     = coordMapper(r, m.to);
        allMoves.push({
          fromRow, fromCol, toRow, toCol,
          value: m.value,
          isMergeResult:      !!m.isMergeResult,
          isMergeContributor: !!m.isMergeContributor,
        });
      });
    }
  }

  switch (direction) {
    case 'left':
      processLine(
        r => [...newGrid[r]],
        (r, row) => { newGrid[r] = row; },
        (r, c)   => [r, c]
      );
      break;

    case 'right':
      processLine(
        r => [...newGrid[r]].reverse(),
        (r, row) => { newGrid[r] = [...row].reverse(); },
        (r, c)   => [r, N - 1 - c]
      );
      break;

    case 'up':
      processLine(
        r => newGrid.map(row => row[r]),
        (r, col) => { col.forEach((v, c) => { newGrid[c][r] = v; }); },
        (r, c)   => [c, r]
      );
      break;

    case 'down':
      processLine(
        r => newGrid.map(row => row[r]).reverse(),
        (r, col) => { [...col].reverse().forEach((v, c) => { newGrid[c][r] = v; }); },
        (r, c)   => [N - 1 - c, r]
      );
      break;
  }

  return { newGrid, moved, moves: allMoves, scoreIncrement: totalScore };
}

// ---- Spawn a random tile on an empty cell ----
export function spawnTile(grid, prob4 = 0.10) {
  const empty = getEmptyCells(grid);
  if (empty.length === 0) return { newGrid: grid, spawned: null };

  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const value  = Math.random() < prob4 ? 4 : 2;
  const newGrid = grid.map(row => [...row]);
  newGrid[r][c] = value;

  return { newGrid, spawned: { row: r, col: c, value } };
}

// ---- Utility ----
export function getEmptyCells(grid) {
  const cells = [];
  grid.forEach((row, r) => row.forEach((v, c) => { if (v === 0) cells.push([r, c]); }));
  return cells;
}

export function getMaxTile(grid) {
  return grid.reduce((max, row) => Math.max(max, ...row), 0);
}

export function countTiles(grid) {
  return grid.reduce((n, row) => n + row.filter(v => v !== 0).length, 0);
}

export function isGameOver(grid) {
  if (getEmptyCells(grid).length > 0) return false;
  const N = grid.length;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = grid[r][c];
      if (c + 1 < N && grid[r][c + 1] === v) return false;
      if (r + 1 < N && grid[r + 1][c] === v) return false;
    }
  }
  return true;
}

export function hasWon(grid, winTile = 2048) {
  return grid.some(row => row.some(v => v >= winTile));
}

// Flatten non-zero values, shuffle, unflatten (Rearrange powerup)
export function rearrangeGrid(grid) {
  const N = grid.length;
  const values = grid.flat().filter(v => v !== 0);
  // Fisher-Yates
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  const newGrid = grid.map(row => [...row]);
  let k = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (newGrid[r][c] !== 0) newGrid[r][c] = values[k++];
    }
  }
  return newGrid;
}

// Apply Laser: zero out one cell
export function applyLaser(grid, row, col) {
  const newGrid = grid.map(r => [...r]);
  newGrid[row][col] = 0;
  return newGrid;
}

// Apply Bomb: zero out 3×3 area centered on (row, col)
export function applyBomb(grid, row, col) {
  const N = grid.length;
  const newGrid = grid.map(r => [...r]);
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
        newGrid[nr][nc] = 0;
      }
    }
  }
  return newGrid;
}
