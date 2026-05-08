import styles from "./Calendar.module.css";
import { CalendarRow, type Scale } from "./CalendarRow";

type CalendarProps = {
  colWidth: number;
  rowHeight: number;
  scales?: Scale[];
  dates: Date[];
};

const DEFAULT_SCALES: Scale[] = [
  {
    unit: "month",
    step: 1,
    format: (d) =>
      d.toLocaleString(undefined, { month: "long", year: "numeric" }),
  },
  {
    unit: "day",
    step: 1,
    format: (d) => String(d.getDate()),
  },
];

export function Calendar({
  colWidth,
  rowHeight,
  scales = DEFAULT_SCALES,
  dates,
}: CalendarProps) {
  const totalWidth = dates.length * colWidth;

  return (
    <div className={styles.calendar} style={{ width: totalWidth }}>
      {scales.map((scale) => (
        <CalendarRow
          key={`${scale.unit}-${scale.step}`}
          scale={scale}
          dates={dates}
          colWidth={colWidth}
          rowHeight={rowHeight}
          highlightWeekends={scale.unit === "day" && scale.step === 1}
        />
      ))}
    </div>
  );
}
