import { useCallback, useMemo, useState } from "react";
import { buildDatesFromTasks, isWeekend } from "../../core/dateUtils";
import type { Id, TaskState } from "../../types";
import { Calendar } from "../calendar/Calendar";
import { Bar } from "../bars/common/Bar";
import { DependencyLinksProvider } from "../dependency-links/DependencyLinksContext";
import { DependencyLinks } from "../dependency-links/DependencyLinks";
import { DependencyPreview } from "../dependency-links/DependencyPreview";
import styles from "./Grid.module.css";
import { getFinestUnit } from "../../core/barUtils";
import { useGanttContext } from "../../context/GanttContext";

export function GanttGrid() {
  const {
    visibleTasks,
    dependencies,
    colWidth,
    rowHeight,
    scales,
    padDays,
    updateTask,
    onTaskClick,
    onDependencyDelete,
    gridRef,
    onGridScroll,
    gridBodyRef,
  } = useGanttContext();

  const [overrides, setOverrides] = useState<Record<Id, Partial<TaskState>>>({});

  const handleOverride = useCallback((id: Id, patch: Partial<TaskState> | null) => {
    setOverrides((prev) => {
      if (patch === null) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...prev[id], ...patch } };
    });
  }, []);

  const dates = useMemo(
    () => buildDatesFromTasks(visibleTasks, padDays),
    [visibleTasks, padDays],
  );

  const origin = dates[0];
  if (!origin) return null;

  const snapToDay = getFinestUnit(scales) !== "day";
  const totalWidth = dates.length * colWidth;
  const bodyHeight = visibleTasks.length * rowHeight;

  return (
    <div
      ref={gridRef}
      className={styles.gridWrapper}
      onScroll={onGridScroll}
    >
      <div className={styles.grid} style={{ width: totalWidth }}>
        <Calendar
          colWidth={colWidth}
          rowHeight={rowHeight}
          dates={dates}
          scales={scales}
        />
        <DependencyLinksProvider
          tasks={visibleTasks}
          dependencies={dependencies}
          origin={origin}
          colWidth={colWidth}
          rowHeight={rowHeight}
          snapToDay={snapToDay}
          overrides={overrides}
        >
          <div
            ref={gridBodyRef}
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
            <DependencyLinks
              width={totalWidth}
              height={bodyHeight}
              onDependencyDelete={onDependencyDelete}
            />
            <DependencyPreview />

            {visibleTasks.map((task, index) => (
              <Bar
                key={task.id}
                task={task}
                index={index}
                origin={origin}
                colWidth={colWidth}
                rowHeight={rowHeight}
                snapToDay={snapToDay}
                onUpdate={updateTask}
                override={overrides[task.id]}
                onOverride={handleOverride}
                onTaskClick={onTaskClick}
              />
            ))}
          </div>
        </DependencyLinksProvider>
      </div>
    </div>
  );
}

/** @deprecated Use GanttGrid instead */
export function Grid() {
  return <GanttGrid />;
}
