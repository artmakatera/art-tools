import { useMemo, useState } from "react";
import { addDays, buildDatesFromTasks, isWeekend } from "../../core/dateUtils";
import type { GanttTask, Id, Scale, TaskState } from "../../types";
import { Calendar } from "../calendar/Calendar";
import { TaskBar } from "../bars/taskBar/TaskBar";
import { ProjectBar } from "../bars/projectBar/ProjectBar";
import { MilestoneBar } from "../bars/milestoneBar/MilestoneBar";
import styles from "./Grid.module.css";
import { commitTaskState, computeTaskState } from "../../core/barUtils";
import {
  DEFAULT_COL_WIDTH,
  DEFAULT_PAD_DAYS,
  DEFAULT_ROW_HEIGHT,
  TASK_VERTICAL_PADDING,
} from "../../core/constants";

type GridProps = {
  tasks: readonly GanttTask[];
  colWidth?: number;
  rowHeight?: number;
  scales?: Scale[];
  padDays?: number;
};

interface GridState {
  padLeft: number;
  padRight: number;
  overrides: Record<Id, Partial<TaskState>>;
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

  const updateTask = (id: Id, patch: Partial<TaskState>) => {
    setState((prev) => ({
      ...prev,
      overrides: {
        ...prev.overrides,
        [id]: { ...prev.overrides[id], ...patch },
      },
    }));
  };

  const commitTask = (id: Id, patch: Partial<TaskState>, isResize = false) => {
    setState((prev) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return prev;

      const next = commitTaskState({
        task,
        origin,
        colWidth,
        dataCols,
        prevOverride: prev.overrides[id] ?? {},
        prevPadLeft: prev.padLeft,
        prevPadRight: prev.padRight,
        patch,
        isResize,
      });

      return {
        padLeft: next.padLeft,
        padRight: next.padRight,
        overrides: { ...prev.overrides, [id]: next.override },
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
          const barHeight = rowHeight - TASK_VERTICAL_PADDING * 2;

          let bar;
          if (task.type === "milestone") {
            bar = (
              <MilestoneBar
                size={barHeight}
                centerLeft={visualLeft}
                top={TASK_VERTICAL_PADDING}
                colWidth={colWidth}
                title={task.name}
                onMove={(newCenter) =>
                  updateTask(task.id, { left: newCenter - offsetLeft })
                }
                onMoveEnd={(newCenter) =>
                  commitTask(task.id, { left: newCenter - offsetLeft })
                }
              />
            );
          } else if (task.type === "project") {
            bar = (
              <ProjectBar
                left={visualLeft}
                top={TASK_VERTICAL_PADDING}
                width={width}
                height={barHeight}
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
              />
            );
          } else {
            bar = (
              <TaskBar
                left={visualLeft}
                top={TASK_VERTICAL_PADDING}
                width={width}
                height={barHeight}
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
            );
          }

          return (
            <div
              key={task.id}
              className={styles.row}
              style={{ top, height: rowHeight }}
            >
              {bar}
            </div>
          );
        })}
      </div>
    </div>
  );
}
