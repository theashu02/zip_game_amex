/**
 * Deterministic seeder — same date always produces the same puzzle.
 * Uses a simple hash of the date string as the seed for a mulberry32 PRNG.
 */

export function hashDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const chr = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32-bit int
  }
  return Math.abs(hash);
}

/** Mulberry32 — a fast, seedable 32-bit PRNG */
export function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Get today's date as YYYY-MM-DD */
export function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/** Map day-of-week (0=Sun..6=Sat) to difficulty and grid size */
export function getDifficultyForDate(dateStr: string): {
  difficulty: "easy" | "medium" | "hard";
  size: number;
} {
  const day = new Date(dateStr).getDay();
  if (day >= 1 && day <= 3) return { difficulty: "easy", size: 5 };
  if (day >= 4 && day <= 5) return { difficulty: "medium", size: 6 };
  return { difficulty: "hard", size: 7 }; // Sat & Sun
}
