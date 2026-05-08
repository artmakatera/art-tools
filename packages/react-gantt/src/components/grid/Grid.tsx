import { useMemo, useState } from "react";
import {
  addDays,
  buildDatesFromTasks,
  diffDays,
  isWeekend,
} from "../../core/dateUtils";
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

interface GridState {
  padLeft: number;
  padRight: number;
  overrides: Record<string | number, Partial<TaskState>>;
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
  const baseDates = useMemo(
    () => buildDatesFromTasks(tasks, padDays),
    [tasks, padDays],
  );

  const [state, setState] = useState<GridState>({
    padLeft: 0,
    padRight: 0,
    overrides: {},
  });
  const { padLeft, padRight, overrides } = state;

  const extendedDates = useMemo(() => {
    const first = baseDates[0];
    const last = baseDates[baseDates.length - 1];
    if (!first || !last) return baseDates;
    const leftPad = Array.from({ length: padLeft }, (_, i) =>
      addDays(first, i - padLeft),
    );
    const rightPad = Array.from({ length: padRight }, (_, i) =>
      addDays(last, i + 1),
    );
    return [...leftPad, ...baseDates, ...rightPad];
  }, [baseDates, padLeft, padRight]);

  const origin = baseDates[0];
  if (!origin) return null;

  const dataCols = baseDates.length;
  const extendedWidth = extendedDates.length * colWidth;
  const bodyHeight = tasks.length * rowHeight;
  const offsetLeft = padLeft * colWidth;

  const updateTask = (id: string | number, patch: Partial<TaskState>) => {
    setState((prev) => ({
      ...prev,
      overrides: {
        ...prev.overrides,
        [id]: { ...prev.overrides[id], ...patch },
      },
    }));
  };

  const commitTask = (
    id: string | number,
    patch: Partial<TaskState>,
    isResize = false,
  ) => {
    setState((prev) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return prev;
      const base = computeTaskState(task, origin, colWidth);
      const prevOverride = prev.overrides[id] ?? {};
      let left = patch.left ?? prevOverride.left ?? base.left;
      let width = patch.width ?? prevOverride.width ?? base.width;
      let pl = prev.padLeft;
      let pr = prev.padRight;

      const minLeft = -pl * colWidth;
      if (left < minLeft) {
        pl = pl + 1;
        const newMin = -pl * colWidth;
        if (isResize) {
          width = left + width - newMin;
        }
        left = newMin;
      }
      const maxRight = (dataCols + pr) * colWidth;
      if (left + width > maxRight) {
        pr = pr + 1;
        const newMax = (dataCols + pr) * colWidth;
        if (isResize) {
          width = newMax - left;
        } else {
          left = newMax - width;
        }
      }

      return {
        padLeft: pl,
        padRight: pr,
        overrides: {
          ...prev.overrides,
          [id]: { ...prevOverride, ...patch, left, width },
        },
      };
    });
  };

  return (
    <div className={styles.grid} style={{ width: extendedWidth }}>
      <Calendar
        colWidth={colWidth}
        rowHeight={rowHeight}
        dates={extendedDates}
        scales={scales}
      />
      <div
        className={styles.body}
        style={{ height: bodyHeight, width: extendedWidth }}
      >
        <div className={styles.cols} aria-hidden>
          {extendedDates.map((date) => (
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
          const visualLeft = offsetLeft + left;
          return (
            <div
              key={task.id}
              className={styles.row}
              style={{ top, height: rowHeight }}
            >
              <Task
                left={visualLeft}
                top={TASK_VERTICAL_PADDING}
                width={width}
                height={rowHeight - TASK_VERTICAL_PADDING * 2}
                colWidth={colWidth}
                title={task.name}
                progress={progress}
                onProgressChange={(p) => updateTask(task.id, { progress: p })}
                onMove={(newVisualLeft) =>
                  updateTask(task.id, { left: newVisualLeft - offsetLeft })
                }
                onMoveEnd={(newVisualLeft) =>
                  commitTask(task.id, { left: newVisualLeft - offsetLeft })
                }
                onResize={(newWidth, newVisualLeft) =>
                  updateTask(task.id, {
                    width: newWidth,
                    left: newVisualLeft - offsetLeft,
                  })
                }
                onResizeEnd={(newWidth, newVisualLeft) =>
                  commitTask(
                    task.id,
                    { width: newWidth, left: newVisualLeft - offsetLeft },
                    true,
                  )
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
