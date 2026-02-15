/**
 * Puzzle generator — creates a Hamiltonian path through an N×N grid,
 * then places numbered anchors along the path.
 *
 * Uses a randomized depth-first search with Warnsdorff's heuristic
 * to efficiently find a path visiting every cell exactly once.
 */

import type { Anchor, Cell, Puzzle } from "./types";
import { createRng, getDifficultyForDate, hashDate } from "./seeder";

type Direction = [number, number];
const DIRS: Direction[] = [
  [0, 1], // right
  [1, 0], // down
  [0, -1], // left
  [-1, 0], // up
];

function isValid(row: number, col: number, size: number, visited: boolean[][]): boolean {
  return row >= 0 && row < size && col >= 0 && col < size && !visited[row][col];
}

/** Count unvisited neighbours — used for Warnsdorff's heuristic */
function countNeighbours(row: number, col: number, size: number, visited: boolean[][]): number {
  let count = 0;
  for (const [dr, dc] of DIRS) {
    if (isValid(row + dr, col + dc, size, visited)) count++;
  }
  return count;
}

/**
 * Find a Hamiltonian path using DFS + Warnsdorff's heuristic.
 * Returns the path as an array of cells, or null if no path found.
 */
function findHamiltonianPath(size: number, rng: () => number, maxAttempts = 20): Cell[] | null {
  const totalCells = size * size;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Random starting position
    const startRow = Math.floor(rng() * size);
    const startCol = Math.floor(rng() * size);

    const visited: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
    const path: Cell[] = [{ row: startRow, col: startCol }];
    visited[startRow][startCol] = true;

    let current = { row: startRow, col: startCol };

    while (path.length < totalCells) {
      // Get valid neighbours sorted by Warnsdorff's heuristic (fewest onward moves first)
      const neighbours: { row: number; col: number; score: number }[] = [];

      for (const [dr, dc] of DIRS) {
        const nr = current.row + dr;
        const nc = current.col + dc;
        if (isValid(nr, nc, size, visited)) {
          neighbours.push({
            row: nr,
            col: nc,
            score: countNeighbours(nr, nc, size, visited),
          });
        }
      }

      if (neighbours.length === 0) break; // Dead end

      // Sort by Warnsdorff's heuristic, break ties randomly
      neighbours.sort((a, b) => {
        const diff = a.score - b.score;
        return diff !== 0 ? diff : rng() - 0.5;
      });

      const next = neighbours[0];
      visited[next.row][next.col] = true;
      path.push({ row: next.row, col: next.col });
      current = next;
    }

    if (path.length === totalCells) return path;
  }

  return null;
}

/**
 * Select anchor positions along the path.
 * Anchors are evenly distributed, always including the first and last cell.
 */
function selectAnchors(path: Cell[], numAnchors: number): Anchor[] {
  const anchors: Anchor[] = [];
  const totalCells = path.length;

  if (numAnchors <= 2) {
    anchors.push({ ...path[0], number: 1 });
    anchors.push({ ...path[totalCells - 1], number: 2 });
    return anchors;
  }

  // Evenly distribute anchors along the path
  const step = (totalCells - 1) / (numAnchors - 1);
  for (let i = 0; i < numAnchors; i++) {
    const idx = Math.round(i * step);
    anchors.push({ ...path[idx], number: i + 1 });
  }

  return anchors;
}

/**
 * Generate a daily puzzle for a given date string (YYYY-MM-DD).
 */
export function generatePuzzle(dateStr: string): Puzzle {
  const seed = hashDate(dateStr);
  const rng = createRng(seed);
  const { difficulty, size } = getDifficultyForDate(dateStr);

  // Number of anchors scales with grid size
  const anchorCounts: Record<number, number> = {
    5: 5,
    6: 6,
    7: 8,
  };

  let path = findHamiltonianPath(size, rng);

  // Fallback: if Hamiltonian path fails, try smaller grid
  if (!path) {
    path = findHamiltonianPath(size, rng, 50);
  }

  // Ultimate fallback: generate a simple snake path
  if (!path) {
    path = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        path.push({ row: r, col: r % 2 === 0 ? c : size - 1 - c });
      }
    }
  }

  const numAnchors = anchorCounts[size] ?? Math.ceil(size * 1.2);
  const anchors = selectAnchors(path, numAnchors);

  return {
    id: `zip-${dateStr}`,
    size,
    anchors,
    date: dateStr,
    difficulty,
  };
}

/**
 * Get the full solution path for a puzzle (for hints/validation server-side).
 */
export function generateSolutionPath(dateStr: string): Cell[] {
  const seed = hashDate(dateStr);
  const rng = createRng(seed);
  const { size } = getDifficultyForDate(dateStr);

  let path = findHamiltonianPath(size, rng);

  if (!path) {
    path = findHamiltonianPath(size, rng, 50);
  }

  if (!path) {
    path = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        path.push({ row: r, col: r % 2 === 0 ? c : size - 1 - c });
      }
    }
  }

  return path;
}
