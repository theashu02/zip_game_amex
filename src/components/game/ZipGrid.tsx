"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import type { Puzzle, Cell } from "@/engine/types";
import styles from "./ZipGrid.module.css";

interface ZipGridProps {
  puzzle: Puzzle;
  onComplete: (path: Cell[], timeMs: number) => void;
}

export default function ZipGrid({ puzzle, onComplete }: ZipGridProps) {
  const [path, setPath] = useState<Cell[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState(Date.now());
  const gridRef = useRef<HTMLDivElement>(null);

  const { size, anchors } = puzzle;

  // Create anchor lookup
  const anchorMap = new Map<string, number>();
  anchors.forEach((a) => anchorMap.set(`${a.row},${a.col}`, a.number));

  // Create path lookup for quick cell-in-path check
  const pathSet = new Set<string>();
  path.forEach((c) => pathSet.add(`${c.row},${c.col}`));

  // Get path index of a cell (-1 if not in path)
  const getPathIndex = (row: number, col: number): number => {
    return path.findIndex((c) => c.row === row && c.col === col);
  };

  const isAdjacent = (a: Cell, b: Cell): boolean => {
    const dr = Math.abs(a.row - b.row);
    const dc = Math.abs(a.col - b.col);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  };

  const checkCompletion = useCallback(
    (currentPath: Cell[]) => {
      if (currentPath.length !== size * size) return false;

      // Check all anchors are visited in order
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

      const cellKey = `${row},${col}`;
      const existingIdx = path.findIndex((c) => c.row === row && c.col === col);

      // If clicking on the last cell, do nothing
      if (existingIdx === path.length - 1) return;

      // If clicking on a cell already in path (but not last), backtrack to it
      if (existingIdx >= 0) {
        setPath(path.slice(0, existingIdx + 1));
        return;
      }

      // If path is empty, only allow starting from anchor #1
      if (path.length === 0) {
        const anchor1 = anchors.find((a) => a.number === 1);
        if (anchor1 && anchor1.row === row && anchor1.col === col) {
          setPath([{ row, col }]);
        }
        return;
      }

      // Must be adjacent to the last cell in path
      const lastCell = path[path.length - 1];
      if (!isAdjacent(lastCell, { row, col })) return;

      // Can't revisit cells
      if (pathSet.has(cellKey)) return;

      const newPath = [...path, { row, col }];
      setPath(newPath);

      // Check completion
      if (checkCompletion(newPath)) {
        setIsComplete(true);
        const elapsed = Date.now() - startTime;
        onComplete(newPath, elapsed);
      }
    },
    [path, pathSet, isComplete, anchors, size, startTime, onComplete, checkCompletion],
  );

  const handleMouseDown = (row: number, col: number) => {
    setIsDrawing(true);
    handleCellInteraction(row, col);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isDrawing) {
      handleCellInteraction(row, col);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e: React.TouchEvent, row: number, col: number) => {
    e.preventDefault();
    setIsDrawing(true);
    handleCellInteraction(row, col);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !gridRef.current) return;

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
      const row = element.getAttribute("data-row");
      const col = element.getAttribute("data-col");
      if (row !== null && col !== null) {
        handleCellInteraction(parseInt(row), parseInt(col));
      }
    }
  };

  const handleUndo = () => {
    if (path.length > 0 && !isComplete) {
      setPath(path.slice(0, -1));
    }
  };

  const handleReset = () => {
    setPath([]);
    setIsComplete(false);
  };

  // Generate connection lines between consecutive path cells
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

  // Prevent context menu on long press
  useEffect(() => {
    const handler = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  const cellSize = 70;
  const gap = 4;
  const padding = 16;
  const totalSize = size * cellSize + (size - 1) * gap + padding * 2;
  const segments = getConnectionSegments();

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <button className={styles.controlBtn} onClick={handleUndo} disabled={path.length === 0 || isComplete}>
          ↩ Undo
        </button>
        <span className={styles.cellCount}>
          {path.length} / {size * size}
        </span>
        <button className={styles.controlBtn} onClick={handleReset} disabled={isComplete}>
          ⟲ Reset
        </button>
      </div>

      <div
        ref={gridRef}
        className={`${styles.grid} ${isComplete ? styles.complete : ""}`}
        style={{
          width: totalSize,
          height: totalSize,
          gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
          gap: `${gap}px`,
          padding: `${padding}px`,
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchEnd={() => setIsDrawing(false)}
        onTouchMove={handleTouchMove}
      >
        {/* SVG overlay for path lines */}
        <svg className={styles.pathOverlay} width={totalSize} height={totalSize}>
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
                className={styles.pathLine}
                style={{
                  animationDelay: `${seg.index * 30}ms`,
                }}
              />
            );
          })}
        </svg>

        {/* Grid cells */}
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
                className={`${styles.cell} ${anchorNumber !== undefined ? styles.anchor : ""} ${isInPath ? styles.visited : ""} ${isHead ? styles.head : ""} ${isStart ? styles.startCell : ""} ${isEnd ? styles.endCell : ""} ${isComplete ? styles.completedCell : ""}`}
                onMouseDown={() => handleMouseDown(row, col)}
                onMouseEnter={() => handleMouseEnter(row, col)}
                onTouchStart={(e) => handleTouchStart(e, row, col)}
              >
                {anchorNumber !== undefined && <span className={styles.anchorNumber}>{anchorNumber}</span>}
                {isInPath && anchorNumber === undefined && <span className={styles.pathDot} />}
              </div>
            );
          }),
        )}
      </div>

      {isComplete && (
        <div className={styles.victory}>
          <div className={styles.victoryContent}>
            <span className={styles.victoryEmoji}>🎉</span>
            <h2>Puzzle Complete!</h2>
            <p>Time: {((Date.now() - startTime) / 1000).toFixed(1)}s</p>
          </div>
        </div>
      )}
    </div>
  );
}
