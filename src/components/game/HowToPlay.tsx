"use client";

import { useState } from "react";

export default function HowToPlay() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full border border-slate-300 bg-sky-600 text-lg font-bold text-white shadow-sm transition hover:scale-105 hover:bg-sky-700"
        onClick={() => setIsOpen(true)}
        aria-label="How to play"
      >
        ?
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-50" onClick={() => setIsOpen(false)}>
          <div
            className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-md"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="absolute right-4 top-4 rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-sm text-slate-600 transition hover:text-slate-900"
              onClick={() => setIsOpen(false)}
            >
              X
            </button>
            <h2 className="text-2xl font-semibold">How to Play</h2>

            <div className="mt-6 flex flex-col gap-4 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-200 bg-sky-100 text-xs font-bold text-sky-700">
                  1
                </span>
                <p>
                  Start from the cell marked <strong className="text-slate-900">1</strong> and draw a continuous path to
                  connect all numbered cells in order.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-200 bg-sky-100 text-xs font-bold text-sky-700">
                  2
                </span>
                <p>
                  Your path must visit <strong className="text-slate-900">every cell</strong> in the grid exactly once.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-200 bg-sky-100 text-xs font-bold text-sky-700">
                  3
                </span>
                <p>
                  You can only move <strong className="text-slate-900">horizontally or vertically</strong> - no diagonal
                  moves allowed.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-200 bg-sky-100 text-xs font-bold text-sky-700">
                  4
                </span>
                <p>
                  Click on a visited cell to <strong className="text-slate-900">backtrack</strong>, or use the Undo button.
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500">
              <h3 className="mb-2 text-base font-semibold text-slate-900">Tips</h3>
              <ul className="flex list-none flex-col gap-2">
                <li className="relative pl-4 before:absolute before:left-0 before:text-sky-500 before:content-['->']">
                  Plan your route before drawing - it helps avoid dead ends.
                </li>
                <li className="relative pl-4 before:absolute before:left-0 before:text-sky-500 before:content-['->']">
                  Difficulty increases through the week (Mon to Sun).
                </li>
                <li className="relative pl-4 before:absolute before:left-0 before:text-sky-500 before:content-['->']">
                  The faster you solve, the higher you rank.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
