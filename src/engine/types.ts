/** Core types for the Zip puzzle game */

export interface Cell {
  row: number;
  col: number;
}

export interface Anchor {
  row: number;
  col: number;
  number: number; // The sequential number displayed on this cell
}

export interface Puzzle {
  id: string;
  size: number; // Grid dimension (e.g., 5 for 5×5)
  anchors: Anchor[]; // Numbered cells the path must pass through in order
  date: string; // ISO date string for daily puzzles
  difficulty: "easy" | "medium" | "hard";
}

export interface Solution {
  path: Cell[]; // Ordered list of cells forming the solution path
}

export interface GameState {
  puzzle: Puzzle;
  currentPath: Cell[];
  isComplete: boolean;
  startTime: number;
  elapsedMs: number;
}

export interface LeaderboardEntry {
  name: string;
  timeMs: number;
  date: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}
