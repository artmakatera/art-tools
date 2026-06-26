import { isWeekend } from "../../core/dateUtils";
import type { IndexRange } from "../../core/virtualize";
import styles from "./GridColumns.module.css";

interface GridColumnsProps {
  dates: Date[];
  colWidth: number;
  bodyHeight: number;
  /** Half-open range of date indices to render (virtualization window). */
  colRange: IndexRange;
}

/**
 * Background layer that paints one vertical column per day, shading weekends.
 * Purely decorative — `aria-hidden` and non-interactive. Only the columns
 * inside `colRange` are rendered; each is absolutely positioned at its date
 * offset so the windowed subset still aligns with the full-width grid.
 */
export function GridColumns({ dates, colWidth, bodyHeight, colRange }: GridColumnsProps) {
  return (
    <div className={styles.cols} aria-hidden>
      {dates.slice(colRange.start, colRange.end).map((date, i) => {
        const index = colRange.start + i;
        return (
          <div
            key={date.toISOString()}
            className={
              isWeekend(date) ? `${styles.col} ${styles.colWeekend}` : styles.col
            }
            style={{
              left: index * colWidth,
              width: colWidth,
              height: bodyHeight,
            }}
          />
        );
      })}
    </div>
  );
}

GridColumns.displayName = "GridColumns";
