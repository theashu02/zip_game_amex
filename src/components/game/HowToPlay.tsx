"use client";

import { useState } from "react";
import styles from "./HowToPlay.module.css";

export default function HowToPlay() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className={styles.helpBtn} onClick={() => setIsOpen(true)} aria-label="How to play">
        ?
      </button>

      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
              ✕
            </button>
            <h2 className={styles.modalTitle}>How to Play</h2>

            <div className={styles.rules}>
              <div className={styles.rule}>
                <span className={styles.ruleNumber}>1</span>
                <p>
                  Start from the cell marked <strong>1</strong> and draw a continuous path to connect all numbered cells in order.
                </p>
              </div>
              <div className={styles.rule}>
                <span className={styles.ruleNumber}>2</span>
                <p>
                  Your path must visit <strong>every cell</strong> in the grid exactly once.
                </p>
              </div>
              <div className={styles.rule}>
                <span className={styles.ruleNumber}>3</span>
                <p>
                  You can only move <strong>horizontally or vertically</strong> — no diagonal moves allowed.
                </p>
              </div>
              <div className={styles.rule}>
                <span className={styles.ruleNumber}>4</span>
                <p>
                  Click on a visited cell to <strong>backtrack</strong>, or use the Undo button.
                </p>
              </div>
            </div>

            <div className={styles.tips}>
              <h3>💡 Tips</h3>
              <ul>
                <li>Plan your route before drawing — it helps avoid dead ends</li>
                <li>Difficulty increases through the week (Mon→Sun)</li>
                <li>The faster you solve, the higher you rank!</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
