/**
 * Central Elysia server — defines all API routes for the Zip game.
 * This runs INSIDE Next.js via the App Router catch-all route.
 */

import { Elysia, t } from "elysia";
import { generatePuzzle } from "@/engine/generator";
import { validatePath } from "@/engine/validator";
import { getTodayStr } from "@/engine/seeder";

// In-memory leaderboard (resets on cold start — fine for MVP)
const leaderboards = new Map<string, Array<{ name: string; timeMs: number }>>();

function getLeaderboard(date: string) {
  if (!leaderboards.has(date)) {
    leaderboards.set(date, []);
  }
  return leaderboards.get(date)!;
}

export const app = new Elysia({ prefix: "/api" })
  // GET /api/puzzle/daily — returns today's puzzle
  .get("/puzzle/daily", () => {
    const today = getTodayStr();
    const puzzle = generatePuzzle(today);
    return puzzle;
  })

  // GET /api/puzzle/:date — returns puzzle for a specific date
  .get(
    "/puzzle/:date",
    ({ params }) => {
      const puzzle = generatePuzzle(params.date);
      return puzzle;
    },
    {
      params: t.Object({
        date: t.String(),
      }),
    },
  )

  // POST /api/puzzle/validate — validate a submitted path
  .post(
    "/puzzle/validate",
    ({ body }) => {
      const puzzle = generatePuzzle(body.date);
      const result = validatePath(body.path, puzzle.anchors, puzzle.size);
      return result;
    },
    {
      body: t.Object({
        date: t.String(),
        path: t.Array(
          t.Object({
            row: t.Number(),
            col: t.Number(),
          }),
        ),
      }),
    },
  )

  // GET /api/leaderboard — get today's leaderboard
  .get("/leaderboard", () => {
    const today = getTodayStr();
    const entries = getLeaderboard(today);
    return entries.sort((a, b) => a.timeMs - b.timeMs).slice(0, 10);
  })

  // POST /api/leaderboard — submit a score
  .post(
    "/leaderboard",
    ({ body }) => {
      const today = getTodayStr();
      const entries = getLeaderboard(today);

      // Only allow submission if there's a valid puzzle for today
      const puzzle = generatePuzzle(today);
      const validation = validatePath(body.path, puzzle.anchors, puzzle.size);

      if (!validation.valid) {
        return { success: false, error: "Invalid solution" };
      }

      entries.push({
        name: body.name,
        timeMs: body.timeMs,
      });

      // Keep only top 50
      entries.sort((a, b) => a.timeMs - b.timeMs);
      if (entries.length > 50) entries.length = 50;

      return { success: true };
    },
    {
      body: t.Object({
        name: t.String(),
        timeMs: t.Number(),
        path: t.Array(
          t.Object({
            row: t.Number(),
            col: t.Number(),
          }),
        ),
      }),
    },
  );

export type App = typeof app;
