/**
 * Path validator — checks that a submitted path is a valid solution.
 */

import type { Anchor, Cell, ValidationResult } from "./types";

/** Check if two cells are adjacent (horizontal or vertical only) */
function isAdjacent(a: Cell, b: Cell): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

/** Check if two cells are the same position */
function isSameCell(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col;
}

/**
 * Validate a submitted path against a puzzle's anchors and grid size.
 */
export function validatePath(path: Cell[], anchors: Anchor[], gridSize: number): ValidationResult {
  const totalCells = gridSize * gridSize;

  // 1. Path must cover every cell
  if (path.length !== totalCells) {
    return {
      valid: false,
      error: `Path covers ${path.length}/${totalCells} cells. Every cell must be visited.`,
    };
  }

  // 2. All cells must be within bounds
  for (const cell of path) {
    if (cell.row < 0 || cell.row >= gridSize || cell.col < 0 || cell.col >= gridSize) {
      return {
        valid: false,
        error: `Cell (${cell.row}, ${cell.col}) is out of bounds.`,
      };
    }
  }

  // 3. No duplicates
  const seen = new Set<string>();
  for (const cell of path) {
    const key = `${cell.row},${cell.col}`;
    if (seen.has(key)) {
      return {
        valid: false,
        error: `Cell (${cell.row}, ${cell.col}) visited more than once.`,
      };
    }
    seen.add(key);
  }

  // 4. Each step must be adjacent (no diagonals)
  for (let i = 1; i < path.length; i++) {
    if (!isAdjacent(path[i - 1], path[i])) {
      return {
        valid: false,
        error: `Move from (${path[i - 1].row},${path[i - 1].col}) to (${path[i].row},${path[i].col}) is not adjacent.`,
      };
    }
  }

  // 5. Anchors must appear in the path in ascending order
  const sortedAnchors = [...anchors].sort((a, b) => a.number - b.number);
  let anchorIdx = 0;

  for (const cell of path) {
    if (anchorIdx < sortedAnchors.length && isSameCell(cell, sortedAnchors[anchorIdx])) {
      anchorIdx++;
    }
  }

  if (anchorIdx !== sortedAnchors.length) {
    return {
      valid: false,
      error: `Path does not pass through all anchors in ascending order.`,
    };
  }

  return { valid: true };
}
