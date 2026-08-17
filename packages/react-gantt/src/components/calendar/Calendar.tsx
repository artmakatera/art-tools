import { memo } from "react";
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

/**
 * Memoized: the header is the most expensive part of the chart to render (a
 * locale format call per cell) and the least volatile — it only changes when the
 * timeline, the zoom level, or the horizontal scroll window does, never when a
 * task's own fields do. Every prop here is held identity-stable by `GanttGrid`.
 */
export const Calendar = memo(function Calendar({
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
});

Calendar.displayName = "Calendar";
