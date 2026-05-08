import { isWeekend, periodKey } from "../../core/dateUtils";
import type { Scale } from "../../types";
import styles from "./Calendar.module.css";

type CalendarRowProps = {
  scale: Scale;
  dates: Date[];
  colWidth: number;
  rowHeight: number;
  highlightWeekends?: boolean;
};

interface Group {
  key: string;
  start: Date;
  count: number;
}

function groupDates(dates: Date[], scale: Scale): Group[] {
  const groups: Group[] = [];
  for (const date of dates) {
    const key = periodKey(date, scale.unit, scale.step);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.count += 1;
    } else {
      groups.push({ key, start: date, count: 1 });
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
}: CalendarRowProps) {
  const groups = groupDates(dates, scale);

  return (
    <div className={styles.row} style={{ height: rowHeight }}>
      {groups.map((group) => {
        const weekend = highlightWeekends && isWeekend(group.start);
        return (
          <div
            key={group.key}
            className={
              weekend ? `${styles.cell} ${styles.cellWeekend}` : styles.cell
            }
            style={{ width: group.count * colWidth }}
          >
            {scale.format(group.start)}
          </div>
        );
      })}
    </div>
  );
}
