import type { Scale } from "../../types";
import type { IndexRange } from "../../core/virtualize";
import styles from "./Calendar.module.css";
import { CalendarRow } from "./CalendarRow";
import { DEFAULT_SCALES } from "../../core/scales";

export type CalendarProps = {
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
    <div className={styles.calendar} style={{ width: totalWidth }} role="rowgroup">
      {scales.map((scale, index) => (
        <CalendarRow
          key={`${scale.unit}-${scale.step}`}
          scale={scale}
          dates={dates}
          colWidth={colWidth}
          rowHeight={rowHeight}
          highlightWeekends={scale.unit === "day" && scale.step === 1}
          colRange={colRange}
          rowIndex={index + 1}
        />
      ))}
    </div>
  );
}
