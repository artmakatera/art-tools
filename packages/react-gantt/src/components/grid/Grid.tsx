import { useMemo, useState } from "react";
import { buildDatesFromTasks, diffDays, isWeekend } from "../../core/dateUtils";
import type { GanttTask, Scale } from "../../types";
import { Calendar } from "../calendar/Calendar";
import { Task } from "../task/Task";
import styles from "./Grid.module.css";

type GridProps = {
  tasks: readonly GanttTask[];
  colWidth?: number;
  rowHeight?: number;
  scales?: Scale[];
  padDays?: number;
};

const DEFAULT_COL_WIDTH = 40;
const DEFAULT_ROW_HEIGHT = 36;
const DEFAULT_PAD_DAYS = 1;
const TASK_VERTICAL_PADDING = 6;

interface TaskState {
  left: number;
  width: number;
  progress: number;
}

function computeTaskState(
  task: GanttTask,
  origin: Date,
  colWidth: number,
): TaskState {
  const startOffset = diffDays(origin, task.startDate);
  const endDate = task.endDate ?? task.startDate;
  const span = Math.max(1, diffDays(task.startDate, endDate) + 1);
  return {
    left: startOffset * colWidth,
    width: span * colWidth,
    progress: task.progress ?? 0,
  };
}

export function Grid({
  tasks,
  colWidth = DEFAULT_COL_WIDTH,
  rowHeight = DEFAULT_ROW_HEIGHT,
  scales,
  padDays = DEFAULT_PAD_DAYS,
}: GridProps) {
  const dates = useMemo(
    () => buildDatesFromTasks(tasks, padDays),
    [tasks, padDays],
  );
  const origin = dates[0];
  const totalWidth = dates.length * colWidth;
  const bodyHeight = tasks.length * rowHeight;

  const [overrides, setOverrides] = useState<
    Record<string | number, Partial<TaskState>>
  >({});

  if (!origin) return null;

  const updateTask = (id: string | number, patch: Partial<TaskState>) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

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
        {tasks.map((task, index) => {
          const base = computeTaskState(task, origin, colWidth);
          const override = overrides[task.id] ?? {};
          const left = override.left ?? base.left;
          const width = override.width ?? base.width;
          const progress = override.progress ?? base.progress;
          const top = index * rowHeight;
          return (
            <div
              key={task.id}
              className={styles.row}
              style={{ top, height: rowHeight }}
            >
              <Task
                left={left}
                top={TASK_VERTICAL_PADDING}
                width={width}
                height={rowHeight - TASK_VERTICAL_PADDING * 2}
                colWidth={colWidth}
                title={task.name}
                progress={progress}
                onProgressChange={(p) => updateTask(task.id, { progress: p })}
                onMove={(newLeft) => updateTask(task.id, { left: newLeft })}
                onResize={(newWidth, newLeft) =>
                  updateTask(task.id, { width: newWidth, left: newLeft })
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
