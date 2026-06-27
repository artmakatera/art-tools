import { isWeekend, periodKey } from "../../core/dateUtils";
import type { Scale } from "../../types";
import type { IndexRange } from "../../core/virtualize";
import styles from "./Calendar.module.css";

type CalendarRowProps = {
  scale: Scale;
  dates: Date[];
  colWidth: number;
  rowHeight: number;
  highlightWeekends?: boolean;
  /**
   * Half-open range of date indices in view (virtualization window).
   * When omitted, every group is rendered.
   */
  colRange?: IndexRange;
};

interface Group {
  key: string;
  start: Date;
  /** Index of the group's first date column, for absolute positioning. */
  startIndex: number;
  count: number;
}

function groupDates(dates: Date[], scale: Scale): Group[] {
  const groups: Group[] = [];
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]!;
    const key = periodKey(date, scale.unit, scale.step);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.count += 1;
    } else {
      groups.push({ key, start: date, startIndex: i, count: 1 });
    }
  }
  return groups;
}

export function CalendarRow({
  scale,
  dates,
  colWidth,
  rowHeight,
  highlightWeekends = false,
  colRange,
}: CalendarRowProps) {
  const groups = groupDates(dates, scale);

  return (
    <div className={styles.row} style={{ height: rowHeight }}>
      {groups.map((group) => {
        // Skip groups that fall entirely outside the visible column window.
        if (
          colRange &&
          (group.startIndex >= colRange.end ||
            group.startIndex + group.count <= colRange.start)
        ) {
          return null;
        }
        const weekend = highlightWeekends && isWeekend(group.start);
        return (
          <div
            key={group.key}
            className={
              weekend ? `${styles.cell} ${styles.cellWeekend}` : styles.cell
            }
            style={{ left: group.startIndex * colWidth, width: group.count * colWidth }}
          >
            {scale.format(group.start)}
          </div>
        );
      })}
    </div>
  );
}
