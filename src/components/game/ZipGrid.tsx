"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { Puzzle, Cell } from "@/engine/types";
import { cn } from "@/lib/utils";

interface ZipGridProps {
  puzzle: Puzzle;
  onComplete: (path: Cell[], timeMs: number) => void;
  startTime?: number; // Optional, defaults to mount time if not provided
}

const isAdjacent = (a: Cell, b: Cell): boolean => {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
};

export default function ZipGrid({ puzzle, onComplete, startTime: propStartTime }: ZipGridProps) {
  const [path, setPath] = useState<Cell[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  // If prop provided, use it. Else use mount time (for daily single player)
  const [internalStartTime] = useState(() => Date.now());
  const effectiveStartTime = propStartTime ?? internalStartTime;

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

  // Helper to get intermediate cells for fast drags
  const getInterpolatedCells = (start: Cell, end: Cell): Cell[] => {
    const cells: Cell[] = [];
    const dr = end.row - start.row;
    const dc = end.col - start.col;

    // Only interpolate straight lines to avoid ambiguity
    if (dr !== 0 && dc !== 0) return [];

    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    const rStep = dr === 0 ? 0 : dr / steps;
    const cStep = dc === 0 ? 0 : dc / steps;

    for (let i = 1; i <= steps; i++) {
      cells.push({
        row: start.row + Math.round(rStep * i),
        col: start.col + Math.round(cStep * i),
      });
    }
    return cells;
  };

  const handleCellInteraction = useCallback(
    (targetRow: number, targetCol: number) => {
      if (isComplete) return;

      setPath((prev) => {
        // 1. Handle clicking/dragging on an EXISTING cell
        const existingIdx = prev.findIndex((c) => c.row === targetRow && c.col === targetCol);

        if (existingIdx !== -1) {
          // If it's the very last cell (current head), do nothing
          if (existingIdx === prev.length - 1) return prev;

          // STRICT BACKTRACKING: Only allow going back to the immediate previous cell.
          // This prevents accidental "path resetting" if the user grazes an earlier cell.
          if (existingIdx === prev.length - 2) {
            return prev.slice(0, existingIdx + 1);
          }

          // If touching any other earlier cell, ignore it (don't break the line)
          return prev;
        }

        // 2. Handle adding NEW cells
        let newPath = [...prev];

        if (prev.length === 0) {
          // Must start at anchor #1
          const anchor1 = anchors.find((a) => a.number === 1);
          if (anchor1 && anchor1.row === targetRow && anchor1.col === targetCol) {
            newPath = [{ row: targetRow, col: targetCol }];
          } else {
            // Invalid start
            setIsShaking(true);
            return prev;
          }
        } else {
          const lastCell = prev[prev.length - 1];
          // Check interpolation for fast drags
          const steps = getInterpolatedCells(lastCell, { row: targetRow, col: targetCol });

          if (steps.length > 0) {
            // Try to add all steps sequentially
            for (const step of steps) {
              // Verify adjacency just in case (interpolation logic guarantees it for straight lines, but good to be safe)
              const currentLast = newPath[newPath.length - 1];
              if (isAdjacent(currentLast, step)) {
                // Verify not already in path (handled by existingIdx check above, but purely for `steps` loop)
                // Actually, if we cross our own path during interpolation, we should probably stop or cut?
                // For simplicity: Simple "Snake" logic: You can't cross yourself.
                // But wait, "backtracking" is handled by existingIdx.
                // If we interpolate over an existing cell, we should probably stop there or handle it?
                // Let's keep it simple: Only add if NOT in path.
                const isInPath = newPath.some((c) => c.row === step.row && c.col === step.col);
                if (!isInPath) {
                  newPath.push(step);
                }
              }
            }
          } else {
            // Fallback to strict adjacency (for single step or diagonal fail)
            if (isAdjacent(lastCell, { row: targetRow, col: targetCol })) {
              newPath.push({ row: targetRow, col: targetCol });
            } else {
              return prev;
            }
          }
        }

        // Check completion immediately
        if (newPath !== prev && newPath.length > prev.length && checkCompletion(newPath)) {
          setIsComplete(true);
          isDrawingRef.current = false;
          const elapsed = Date.now() - effectiveStartTime;
          setFinalTime(elapsed);
          onComplete(newPath, elapsed);
        }

        return newPath;
      });
    },
    [anchors, isComplete, checkCompletion, onComplete, effectiveStartTime],
  );

  const [gridRect, setGridRect] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!gridRef.current) return;

    // Initial measure
    const rect = gridRef.current.getBoundingClientRect();
    setGridRect({ width: rect.width, height: rect.height });

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setGridRect({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });

    observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, [gridRef]);

  // Derive dynamic metrics
  const dynamicCellSize = useMemo(() => {
    if (!gridRect) return cellSize; // Fallback
    // Width = 2*padding + size*cell + (size-1)*gap
    // size*cell = Width - 2*padding - (size-1)*gap
    const available = gridRect.width - 2 * padding - (size - 1) * gap;
    return available / size;
  }, [gridRect, size]);

  const getCellFromPoint = (clientX: number, clientY: number): { row: number; col: number } | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) return null;

    // Calculate effective cell size based on rendered content box
    const contentWidth = rect.width - 2 * padding;
    const contentHeight = rect.height - 2 * padding;

    if (contentWidth <= 0 || contentHeight <= 0) return null;

    // Relative to the inner content area
    const x = clientX - rect.left - padding;
    const y = clientY - rect.top - padding;

    // Normalize
    const xRel = x / contentWidth;
    const yRel = y / contentHeight;

    // Clamp to 0..1 to allow clicking in the padding area (forgiveness)
    const xClamped = Math.max(0, Math.min(1, xRel));
    const yClamped = Math.max(0, Math.min(1, yRel));

    // Map to row/col
    let col = Math.floor(xClamped * size);
    let row = Math.floor(yClamped * size);

    // Edge case: if xClamped is exactly 1, floor gives size. Clamp to size-1.
    if (col >= size) col = size - 1;
    if (row >= size) row = size - 1;

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
          // User tried to start somewhere else -> Shake
          setIsShaking(true);
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

  // Context menu prevention removed to allow Inspect Element
  // Touch action: none handles most mobile issues

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

  const totalSize = gridRect ? gridRect.width : size * cellSize + (size - 1) * gap + padding * 2; // Fallback if gridRect not yet available
  const segments = getConnectionSegments();

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex w-full items-center justify-center gap-4">
        <button
          className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={handleUndo}
          disabled={path.length === 0 || isComplete}
        >
          Undo
        </button>
        <span className="min-w-[60px] text-center text-sm font-semibold text-slate-500">
          {path.length} / {size * size}
        </span>
        <button
          className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={handleReset}
          disabled={isComplete}
        >
          Reset
        </button>
      </div>

      <div
        ref={gridRef}
        className={cn(
          "relative grid aspect-square w-full max-w-[500px] select-none touch-none rounded-3xl border border-slate-200 bg-white shadow-sm transition-all",
          isComplete && "shadow-md",
          isShaking && "animate-shake border-red-400",
        )}
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
        <svg className="pointer-events-none absolute left-0 top-0 z-30 h-full w-full" width="100%" height="100%" viewBox={`0 0 ${totalSize} ${totalSize}`} preserveAspectRatio="none">
          {segments.map((seg) => {
            const x1 = padding + seg.c1 * (dynamicCellSize + gap) + dynamicCellSize / 2;
            const y1 = padding + seg.r1 * (dynamicCellSize + gap) + dynamicCellSize / 2;
            const x2 = padding + seg.c2 * (dynamicCellSize + gap) + dynamicCellSize / 2;
            const y2 = padding + seg.r2 * (dynamicCellSize + gap) + dynamicCellSize / 2;

            return (
              <line
                key={seg.index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                strokeWidth={4}
                strokeLinecap="round"
                className="stroke-sky-500"
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
                  "relative z-20 flex aspect-square w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 transition",
                  "hover:border-sky-300 hover:bg-slate-100",
                  anchorNumber !== undefined && "border-sky-300 bg-sky-100",
                  isInPath && "border-sky-400 bg-sky-200",
                  isHead && "border-sky-500 bg-sky-300 shadow-sm",
                  isStart && "border-cyan-300 bg-cyan-100",
                  isEnd && "border-blue-300 bg-blue-100",
                  isComplete && "border-teal-300 bg-teal-100",
                )}
              >
                {anchorNumber !== undefined && (
                  <span className={cn("text-base md:text-lg font-bold text-sky-700", isStart && "text-cyan-700", isEnd && "text-blue-700")}>
                    {anchorNumber}
                  </span>
                )}
                {isInPath && anchorNumber === undefined && <span className="h-2 w-2 rounded-full bg-sky-500" />}
              </div>
            );
          }),
        )}
      </div>

      {isComplete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50">
          <div className="rounded-3xl border border-slate-200 bg-white px-12 py-10 text-center shadow-md">
            <span className="block text-4xl font-bold text-slate-900">WIN</span>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Puzzle Complete!</h2>
            <p className="mt-2 text-sm text-slate-500">Time: {(finalTime / 1000).toFixed(1)}s</p>
          </div>
        </div>
      )}
    </div>
  );
}
