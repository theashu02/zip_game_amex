"use client";

import { useState, useEffect, useMemo } from "react";

interface GameHeaderProps {
  difficulty: "easy" | "medium" | "hard";
  date: string;
  gridSize: number;
  isComplete: boolean;
  startTime?: number;
}

export default function GameHeader({ difficulty, date, gridSize, isComplete, startTime }: GameHeaderProps) {
  // Use a local start time if none provided (legacy behavior)
  const [internalStart] = useState(() => Date.now());
  const effectiveStart = startTime || internalStart;

  // Calculate initial elapsed time
  const [elapsed, setElapsed] = useState(() => {
    return Math.floor((Date.now() - effectiveStart) / 1000);
  });

  useEffect(() => {
    if (isComplete) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - effectiveStart) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isComplete, effectiveStart]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  const difficultyStyles: Record<string, string> = {
    easy: "bg-sky-100 text-sky-700 border-sky-200",
    medium: "bg-slate-200 text-slate-700 border-slate-300",
    hard: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const displayDate = useMemo(() => {
    try {
      return new Date(date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Today";
    }
  }, [date]);

  return (
    <header className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white text-lg font-bold">Z</div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Zip</h1>
          <p className="text-sm text-slate-500">{displayDate}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 text-sm font-semibold text-slate-900">
        <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
        </span>
        <span className={`inline-flex items-center rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${difficultyStyles[difficulty]}`}>
          {difficulty}
        </span>
        <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-600">
          {gridSize}x{gridSize}
        </span>
      </div>
    </header>
  );
}
