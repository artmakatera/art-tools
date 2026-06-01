import { useCallback, useMemo, useState } from "react";
import { buildDatesFromTasks, isWeekend } from "../../core/dateUtils";
import type { GanttTask, Id, Scale, TaskDependency, TaskState } from "../../types";
import { Calendar } from "../calendar/Calendar";
import { Bar } from "../bars/common/Bar";
import { DependencyLinksProvider } from "../dependency-links/DependencyLinksContext";
import { DependencyLinks } from "../dependency-links/DependencyLinks";
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
  dependencies?: TaskDependency[];
  colWidth?: number;
  rowHeight?: number;
  scales?: Scale[];
  padDays?: number;
  onUpdateTask: (id: Id, patch: DatePatch) => void
};


export function Grid({
  tasks,
  dependencies,
  colWidth = DEFAULT_COL_WIDTH,
  rowHeight = DEFAULT_ROW_HEIGHT,
  scales,
  padDays = DEFAULT_PAD_DAYS,
  onUpdateTask,
}: GridProps) {
  const [overrides, setOverrides] = useState<Record<Id, Partial<TaskState>>>({});

  const handleOverride = useCallback((id: Id, patch: Partial<TaskState> | null) => {
    setOverrides((prev) => {
      // If patch is null, remove the override for this task
      if (patch === null) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }

      // Otherwise, update or add the override for this task
      return ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    })});
  }, []);

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
      <DependencyLinksProvider
        tasks={tasks}
        dependencies={dependencies ?? []}
        origin={origin}
        colWidth={colWidth}
        rowHeight={rowHeight}
        snapToDay={snapToDay}
        overrides={overrides}
      >
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
              origin={origin}
              colWidth={colWidth}
              rowHeight={rowHeight}
              snapToDay={snapToDay}
              onUpdate={onUpdateTask}
              override={overrides[task.id]}
              onOverride={handleOverride}

            />
          ))}
          <DependencyLinks width={totalWidth} height={bodyHeight} />
        </div>
      </DependencyLinksProvider>
    </div>
  );
}
