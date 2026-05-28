import { useMemo, useState } from "react";
import { addDays, buildDatesFromTasks, isWeekend } from "../../core/dateUtils";
import type { GanttTask, Id, Scale, TaskState } from "../../types";
import { Calendar } from "../calendar/Calendar";
import { Bar } from "../bars/common/Bar";
import styles from "./Grid.module.css";
import {
  applyPixelPatch,
  commitTaskState,
  getFinestUnit,
  type PixelPatch,
} from "../../core/barUtils";
import {
  DEFAULT_COL_WIDTH,
  DEFAULT_PAD_DAYS,
  DEFAULT_ROW_HEIGHT,
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

  const snapToDay = getFinestUnit(scales) !== "day";
  const dataCols = baseDates.length;
  const extendedWidth = extendedDates.length * colWidth;
  const bodyHeight = tasks.length * rowHeight;
  const offsetLeft = padLeft * colWidth;

  const updateTask = (id: Id, patch: PixelPatch) => {
    setState((prev) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return prev;
      const nextOverride = applyPixelPatch(
        task,
        prev.overrides[id] ?? {},
        patch,
        origin,
        colWidth,
      );
      return {
        ...prev,
        overrides: { ...prev.overrides, [id]: nextOverride },
      };
    });
  };

  const commitTask = (id: Id, patch: PixelPatch, isResize = false) => {
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
        {tasks.map((task, index) => (
          <Bar
            key={task.id}
            task={task}
            index={index}
            override={overrides[task.id] ?? {}}
            origin={origin}
            colWidth={colWidth}
            rowHeight={rowHeight}
            offsetLeft={offsetLeft}
            snapToDay={snapToDay}
            onUpdate={updateTask}
            onCommit={commitTask}
          />
        ))}
      </div>
    </div>
  );
}
