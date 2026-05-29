import { useState } from "react";
import {
  applyPatch,
  computeTaskPixels,
  type DatePatch,
  pxToDate,
} from "../../../core/barUtils";
import { TASK_VERTICAL_PADDING } from "../../../core/constants";
import type { GanttTask, Id, TaskState } from "../../../types";
import { MilestoneBar } from "../milestoneBar/MilestoneBar";
import { ProjectBar } from "../projectBar/ProjectBar";
import { TaskBar } from "../taskBar/TaskBar";
import styles from "./Bar.module.css";

interface BarProps {
  task: GanttTask;
  index: number;
  origin: Date;
  colWidth: number;
  rowHeight: number;
  snapToDay: boolean;
  onUpdate: (id: Id, patch: DatePatch) => void;
}

export function Bar({
  task,
  index,
  origin,
  colWidth,
  rowHeight,
  snapToDay,
  onUpdate,
}: BarProps) {
  const [override, setOverride] = useState<Partial<TaskState>>({});

  const { left, width, progress } = computeTaskPixels(
    task,
    override,
    origin,
    colWidth,
    { snapToDay },
  );
  const top = index * rowHeight;
  const visualLeft = left;
  const barHeight = rowHeight - TASK_VERTICAL_PADDING * 2;

  const moveAt = (newLeft: number): DatePatch => ({
    startDate: pxToDate(newLeft, origin, colWidth),
    endDate: pxToDate(newLeft + width - colWidth, origin, colWidth),
  });

  const resizeAt = (newWidth: number, newLeft: number): DatePatch => ({
    startDate: pxToDate(newLeft, origin, colWidth),
    endDate: pxToDate(newLeft + newWidth - colWidth, origin, colWidth),
  });

  const handleOverride = (patch: DatePatch) => {
    setOverride((prev) => {
      return { ...prev, ...applyPatch(task, prev, patch) };
    });
  };

  const handleUpdate = (id: Id, patch: DatePatch) => {
    onUpdate(id, patch);
    setOverride({});
  };

  return (
    <div className={styles.row} style={{ top, height: rowHeight }}>
      {task.type === "milestone" && (
        <MilestoneBar
          size={barHeight}
          centerLeft={visualLeft}
          top={TASK_VERTICAL_PADDING}
          colWidth={colWidth}
          title={task.name}
          onMove={(newCenter) => handleOverride(moveAt(newCenter))}
          onMoveEnd={(newCenter) => handleUpdate(task.id, moveAt(newCenter))}
        />
      )}
      {task.type === "project" && (
        <ProjectBar
          left={visualLeft}
          top={TASK_VERTICAL_PADDING}
          width={width}
          height={barHeight}
          colWidth={colWidth}
          title={task.name}
          progress={progress}
          onProgressChange={(p) => handleOverride({ progress: p })}
          onMove={(newVisualLeft) => handleOverride(moveAt(newVisualLeft))}
          onMoveEnd={(newVisualLeft) =>
            handleUpdate(task.id, moveAt(newVisualLeft))
          }
        />
      )}
      {task.type === "task" || !task.type ? (
        <TaskBar
          left={visualLeft}
          top={TASK_VERTICAL_PADDING}
          width={width}
          height={barHeight}
          colWidth={colWidth}
          title={task.name}
          progress={progress}
          onProgressChange={(p) => handleUpdate(task.id, { progress: p })}
          onMove={(newVisualLeft) => handleOverride(moveAt(newVisualLeft))}
          onMoveEnd={(newVisualLeft) =>
            handleUpdate(task.id, moveAt(newVisualLeft))
          }
          onResize={(newWidth, newVisualLeft) =>
            handleOverride(resizeAt(newWidth, newVisualLeft))
          }
          onResizeEnd={(newWidth, newVisualLeft) =>
            handleUpdate(task.id, resizeAt(newWidth, newVisualLeft))
          }
        />
      ) : null}
    </div>
  );
}
