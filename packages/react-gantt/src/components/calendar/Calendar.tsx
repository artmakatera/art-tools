import type { Scale } from "../../types";
import type { IndexRange } from "../../core/virtualize";
import styles from "./Calendar.module.css";
import { CalendarRow,  } from "./CalendarRow";
import { DEFAULT_SCALES } from "../../core/scales";

type CalendarProps = {
  colWidth: number;
  rowHeight: number;
  scales?: Scale[];
  dates: Date[];
  /** Half-open range of date indices in view (virtualization window). */
  colRange: IndexRange;
};

export function Calendar({
  colWidth,
  rowHeight,
  scales = DEFAULT_SCALES,
  dates,
  colRange,
}: CalendarProps) {
  const totalWidth = dates.length * colWidth;

  return (
    // Decorative: the dates are already spoken as part of each bar's accessible
    // name, and exposing thousands of virtualized column headers would bury it.
    <div className={styles.calendar} style={{ width: totalWidth }} aria-hidden>
      {scales.map((scale) => (
        <CalendarRow
          key={`${scale.unit}-${scale.step}`}
          scale={scale}
          dates={dates}
          colWidth={colWidth}
          rowHeight={rowHeight}
          highlightWeekends={scale.unit === "day" && scale.step === 1}
          colRange={colRange}
        />
      ))}
    </div>
  );
}
