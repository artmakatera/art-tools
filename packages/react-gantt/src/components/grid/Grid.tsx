import { useMemo } from "react";
import { buildDatesFromTasks, isWeekend } from "../../core/dateUtils";
import type { GanttTask, Id, Overrides, Scale } from "../../types";
import { Calendar } from "../calendar/Calendar";
import { Bar } from "../bars/common/Bar";
import styles from "./Grid.module.css";
import {

  getFinestUnit,
  type DatePatch,
} from "../../core/barUtils";
import {
  DEFAULT_COL_WIDTH,
  DEFAULT_PAD_DAYS,
  DEFAULT_ROW_HEIGHT,
} from "../../core/constants";

type GridProps = {
  tasks: GanttTask[];
  colWidth?: number;
  rowHeight?: number;
  scales?: Scale[];
  padDays?: number;
  overrides: Overrides;
  onUpdateTask: (id: Id, patch: DatePatch) => void
  onCommitTask: (id: Id, patch: DatePatch) => void
};


export function Grid({
  tasks,
  colWidth = DEFAULT_COL_WIDTH,
  rowHeight = DEFAULT_ROW_HEIGHT,
  scales,
  padDays = DEFAULT_PAD_DAYS,
  overrides,
  onUpdateTask,
  onCommitTask
}: GridProps) {

  const dates = useMemo(
    () => buildDatesFromTasks(tasks, padDays),
    [tasks, padDays],
  );

  const origin = dates[0];
  if (!origin) return null;

  const snapToDay = getFinestUnit(scales) !== "day";
  const totalWidth = dates.length * colWidth;
  const bodyHeight = tasks.length * rowHeight;


  return (
    <div className={styles.grid} style={{ width: totalWidth }}>
      <Calendar
        colWidth={colWidth}
        rowHeight={rowHeight}
        dates={dates}
        scales={scales}
      />
      <div
        className={styles.body}
        style={{ height: bodyHeight, width: totalWidth }}
      >
        <div className={styles.cols} aria-hidden>
          {dates.map((date) => (
            <div
              key={date.toISOString()}
              className={
                isWeekend(date)
                  ? `${styles.col} ${styles.colWeekend}`
                  : styles.col
              }
              style={{ width: colWidth, height: bodyHeight }}
            />
          ))}
        </div>
        {tasks.map((task, index) => (
          <Bar
            key={task.id}
            task={task}
            index={index}
            override={overrides[task.id] ?? {}}
            origin={origin}
            colWidth={colWidth}
            rowHeight={rowHeight}
            snapToDay={snapToDay}
            onUpdate={onUpdateTask}
            onCommit={onCommitTask}
          />
        ))}
      </div>
    </div>
  );
}
