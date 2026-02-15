"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { Puzzle, Cell } from "@/engine/types";
import { cn } from "@/lib/utils";

interface ZipGridProps {
  puzzle: Puzzle;
  onComplete: (path: Cell[], timeMs: number) => void;
}

const isAdjacent = (a: Cell, b: Cell): boolean => {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
};

export default function ZipGrid({ puzzle, onComplete }: ZipGridProps) {
  const [path, setPath] = useState<Cell[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [finalTime, setFinalTime] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const [isShaking, setIsShaking] = useState(false);

  // Reset shake
  useEffect(() => {
    if (isShaking) {
      const timer = setTimeout(() => setIsShaking(false), 500); // 500ms shake
      return () => clearTimeout(timer);
    }
  }, [isShaking]);

  const { size, anchors } = puzzle;
  const cellSize = 70;
  const gap = 4;
  const padding = 16;

  const anchorMap = useMemo(() => {
    const map = new Map<string, number>();
    anchors.forEach((a) => map.set(`${a.row},${a.col}`, a.number));
    return map;
  }, [anchors]);

  const pathSet = useMemo(() => {
    return new Set(path.map((c) => `${c.row},${c.col}`));
  }, [path]);

  const getPathIndex = (row: number, col: number): number => {
    return path.findIndex((c) => c.row === row && c.col === col);
  };

  const checkCompletion = useCallback(
    (currentPath: Cell[]) => {
      if (currentPath.length !== size * size) return false;

      const sortedAnchors = [...anchors].sort((a, b) => a.number - b.number);
      let anchorIdx = 0;
      for (const cell of currentPath) {
        if (anchorIdx < sortedAnchors.length && cell.row === sortedAnchors[anchorIdx].row && cell.col === sortedAnchors[anchorIdx].col) {
          anchorIdx++;
        }
      }
      return anchorIdx === sortedAnchors.length;
    },
    [anchors, size],
  );

  const handleCellInteraction = useCallback(
    (row: number, col: number) => {
      if (isComplete) return;

      setPath((prev) => {
        const existingIdx = prev.findIndex((c) => c.row === row && c.col === col);
        let newPath = prev;

        if (existingIdx === prev.length - 1) return prev;

        if (existingIdx >= 0) {
          newPath = prev.slice(0, existingIdx + 1);
        } else if (prev.length === 0) {
          const anchor1 = anchors.find((a) => a.number === 1);
          if (anchor1 && anchor1.row === row && anchor1.col === col) {
            newPath = [{ row, col }];
          } else {
            // Invalid start
            setIsShaking(true);
            return prev;
          }
        } else {
          const lastCell = prev[prev.length - 1];
          if (!isAdjacent(lastCell, { row, col })) return prev;
          newPath = [...prev, { row, col }];
        }

        // Check completion immediately
        if (newPath !== prev && checkCompletion(newPath)) {
          setIsComplete(true);
          isDrawingRef.current = false;
          const elapsed = Date.now() - startTime;
          setFinalTime(elapsed);
          onComplete(newPath, elapsed);
        }

        return newPath;
      });
    },
    [anchors, isComplete, checkCompletion, onComplete, startTime],
  );

  const getCellFromPoint = (clientX: number, clientY: number): { row: number; col: number } | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();

    // Safety check for zero-dimension (hidden) grid
    if (rect.width === 0 || rect.height === 0) return null;

    // Calculate dynamic scale based on current rendered width vs theoretical fixed width
    // Theoretical width = 2*padding + size*currentCellSize + (size-1)*gap
    // If we rely on CSS transform:scale, getBoundingClientRect handles it for us automatically!
    // But if we use flexible width (width: 100%), we need to recalculate.

    // Let's assume we use flexible width.
    // The relative position in % is safer.
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Relative coordinates 0..1
    const xRel = x / rect.width;
    const yRel = y / rect.height;

    // Map to row/col
    const col = Math.floor(xRel * size);
    const row = Math.floor(yRel * size);

    // Boundary check
    if (col < 0 || col >= size || row < 0 || row >= size) return null;

    // Optional: precise hit testing inside the cell vs gap
    // Since we want forgiveness, just accepting the routed column is fine.

    return { row, col };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isComplete) return;
    e.preventDefault();
    const cell = getCellFromPoint(e.clientX, e.clientY);

    isDrawingRef.current = true;
    gridRef.current?.setPointerCapture(e.pointerId);

    if (cell) {
      if (path.length === 0) {
        const anchor1 = anchors.find((a) => a.number === 1);
        if (!anchor1 || anchor1.row !== cell.row || anchor1.col !== cell.col) {
          // User tried to start somewhere else
          // Ideally show a transient tooltip or shake animation
          // For now, let's just log or ignore.
          // We'll add a visual "shake" effect to the "1" cell maybe?
          // Or just do nothing.
          return;
        }
      }
      handleCellInteraction(cell.row, cell.col);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current || isComplete) return;
    e.preventDefault();
    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (cell) handleCellInteraction(cell.row, cell.col);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gridRef.current?.hasPointerCapture(e.pointerId)) {
      gridRef.current.releasePointerCapture(e.pointerId);
    }
    isDrawingRef.current = false;
  };

  const handleUndo = () => {
    if (!isComplete) {
      setPath((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
    }
  };

  const handleReset = () => {
    setPath([]);
    setIsComplete(false);
    isDrawingRef.current = false;
  };

  const getConnectionSegments = () => {
    const segments: { r1: number; c1: number; r2: number; c2: number; index: number }[] = [];
    for (let i = 1; i < path.length; i++) {
      segments.push({
        r1: path[i - 1].row,
        c1: path[i - 1].col,
        r2: path[i].row,
        c2: path[i].col,
        index: i,
      });
    }
    return segments;
  };

  useEffect(() => {
    const handler = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  // Completion check moved to handleCellInteraction to avoid useEffect cascading updates
  // useEffect(() => {
  //   if (isComplete) return;
  //   if (checkCompletion(path)) {
  //     setIsComplete(true);
  //     isDrawingRef.current = false;
  //     const elapsed = Date.now() - startTime;
  //     setFinalTime(elapsed);
  //     onComplete(path, elapsed);
  //   }
  // }, [path, isComplete, checkCompletion, onComplete, startTime]);

  const totalSize = size * cellSize + (size - 1) * gap + padding * 2;
  const segments = getConnectionSegments();

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex w-full items-center justify-center gap-4">
        <button
          className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          onClick={handleUndo}
          disabled={path.length === 0 || isComplete}
        >
          Undo
        </button>
        <span className="min-w-[60px] text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
          {path.length} / {size * size}
        </span>
        <button
          className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          onClick={handleReset}
          disabled={isComplete}
        >
          Reset
        </button>
      </div>

      <div
        ref={gridRef}
        className={cn("relative grid aspect-square w-full max-w-[500px] select-none touch-none rounded-3xl border border-white/40 bg-white/60 shadow-xl backdrop-blur-sm transition-all dark:border-slate-800 dark:bg-slate-900/50", isComplete && "shadow-2xl shadow-sky-500/10")}
        style={{
          // Use CSS grid for layout
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap: `${gap}px`,
          padding: `${padding}px`,
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <svg className="pointer-events-none absolute left-0 top-0 z-30" width={totalSize} height={totalSize}>
          {segments.map((seg) => {
            const x1 = padding + seg.c1 * (cellSize + gap) + cellSize / 2;
            const y1 = padding + seg.r1 * (cellSize + gap) + cellSize / 2;
            const x2 = padding + seg.c2 * (cellSize + gap) + cellSize / 2;
            const y2 = padding + seg.r2 * (cellSize + gap) + cellSize / 2;

            return (
              <line
                key={seg.index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                strokeWidth={4}
                strokeLinecap="round"
                className="stroke-sky-500/80"
                style={{
                  animationDelay: `${seg.index * 30}ms`,
                }}
              />
            );
          })}
        </svg>

        {Array.from({ length: size }, (_, row) =>
          Array.from({ length: size }, (_, col) => {
            const key = `${row},${col}`;
            const anchorNumber = anchorMap.get(key);
            const isInPath = pathSet.has(key);
            const pathIdx = getPathIndex(row, col);
            const isHead = pathIdx === path.length - 1 && path.length > 0;
            const isStart = anchorNumber === 1;
            const isEnd = anchorNumber === anchors.length;

            return (
              <div
                key={key}
                data-row={row}
                data-col={col}
                className={cn(
                  "relative z-20 flex h-[70px] w-[70px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800",
                  "hover:border-sky-300 hover:bg-slate-100 dark:hover:border-sky-600 dark:hover:bg-slate-700",
                  anchorNumber !== undefined && "border-sky-300 bg-sky-100 dark:border-sky-700 dark:bg-sky-900",
                  isInPath && "border-sky-400 bg-sky-200 dark:border-sky-600 dark:bg-sky-800",
                  isHead && "border-sky-500 bg-sky-300 shadow-sm dark:border-sky-500 dark:bg-sky-700",
                  isStart && "border-cyan-300 bg-cyan-100 dark:border-cyan-700 dark:bg-cyan-900",
                  isEnd && "border-blue-300 bg-blue-100 dark:border-blue-700 dark:bg-blue-900",
                  isComplete && "border-teal-300 bg-teal-100 dark:border-teal-700 dark:bg-teal-900",
                )}
              >
                {anchorNumber !== undefined && <span className={cn("text-lg font-bold text-sky-700 dark:text-sky-200", isStart && "text-cyan-700 dark:text-cyan-200", isEnd && "text-blue-700 dark:text-blue-200")}>{anchorNumber}</span>}
                {isInPath && anchorNumber === undefined && <span className="h-2 w-2 rounded-full bg-sky-500" />}
              </div>
            );
          }),
        )}
      </div>

      {isComplete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="rounded-3xl border border-slate-200 bg-white px-12 py-10 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <span className="block text-4xl font-bold text-slate-900 dark:text-slate-50">WIN</span>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-50">Puzzle Complete!</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Time: {(finalTime / 1000).toFixed(1)}s</p>
          </div>
        </div>
      )}
    </div>
  );
}
