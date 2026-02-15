"use client";

import { useState, useEffect, useCallback } from "react";
import ZipGrid from "@/components/game/ZipGrid";
import GameHeader from "@/components/game/GameHeader";
import HowToPlay from "@/components/game/HowToPlay";
import type { Puzzle, Cell } from "@/engine/types";
import styles from "./page.module.css";

export default function Home() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPuzzle() {
      try {
        const res = await fetch("/api/puzzle/daily");
        if (!res.ok) throw new Error("Failed to fetch puzzle");
        const data = await res.json();
        setPuzzle(data);
      } catch (err) {
        setError("Could not load today's puzzle. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPuzzle();
  }, []);

  const handleComplete = useCallback(async (path: Cell[], timeMs: number) => {
    setIsComplete(true);

    // Submit to leaderboard
    try {
      await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Player",
          timeMs,
          path,
        }),
      });
    } catch {
      // Silently fail — leaderboard is optional
    }
  }, []);

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.loader}>
          <div className={styles.spinner} />
          <p>Loading today&apos;s puzzle...</p>
        </div>
      </main>
    );
  }

  if (error || !puzzle) {
    return (
      <main className={styles.main}>
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠️</span>
          <p>{error || "Something went wrong"}</p>
          <button className={styles.retryBtn} onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <GameHeader difficulty={puzzle.difficulty} date={puzzle.date} gridSize={puzzle.size} isComplete={isComplete} />
      <ZipGrid puzzle={puzzle} onComplete={handleComplete} />
      <HowToPlay />

      <footer className={styles.footer}>
        <p>
          Built with <span className={styles.heart}>♥</span> using Next.js + Elysia
        </p>
      </footer>
    </main>
  );
}
