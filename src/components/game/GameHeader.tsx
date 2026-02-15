"use client";

import { useState, useEffect } from "react";
import styles from "./GameHeader.module.css";

interface GameHeaderProps {
  difficulty: "easy" | "medium" | "hard";
  date: string;
  gridSize: number;
  isComplete: boolean;
}

export default function GameHeader({ difficulty, date, gridSize, isComplete }: GameHeaderProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isComplete) return;

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isComplete]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  const difficultyColors: Record<string, string> = {
    easy: "#10b981",
    medium: "#f59e0b",
    hard: "#ef4444",
  };

  // Format date for display
  const displayDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.title}>
          <span className={styles.lightning}>⚡</span> Zip
        </h1>
        <p className={styles.date}>{displayDate}</p>
      </div>

      <div className={styles.center}>
        <div className={styles.timer}>
          <span className={styles.timerIcon}>⏱</span>
          {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
        </div>
      </div>

      <div className={styles.right}>
        <span
          className={styles.badge}
          style={{
            backgroundColor: `${difficultyColors[difficulty]}20`,
            color: difficultyColors[difficulty],
            borderColor: `${difficultyColors[difficulty]}40`,
          }}
        >
          {difficulty.toUpperCase()}
        </span>
        <span className={styles.gridSizeBadge}>
          {gridSize}×{gridSize}
        </span>
      </div>
    </header>
  );
}
