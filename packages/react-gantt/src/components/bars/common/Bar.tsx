import { memo, useState } from "react";
import {
  computeTaskPixels,
  type DatePatch,
  pxToDate,
} from "../../../core/barUtils";
import { TASK_VERTICAL_PADDING } from "../../../core/constants";
import type { GanttTask, Id, TaskState } from "../../../types";
import { MilestoneBar } from "../milestoneBar/MilestoneBar";
import { ProjectBar } from "../projectBar/ProjectBar";
import { TaskBar } from "../taskBar/TaskBar";
import { ConnectorHandles } from "./ConnectorHandles";
import styles from "./Bar.module.css";

interface BarProps {
  task: GanttTask;
  index: number;
  origin: Date;
  colWidth: number;
  rowHeight: number;
  snapToDay: boolean;
  onUpdate: (id: Id, patch: DatePatch) => void;
  override?: Partial<TaskState>;
  onOverride: (id: Id, patch: DatePatch | null) => void;
  onTaskClick?: (task: GanttTask) => void;
}

export const Bar = memo(function Bar({
  task,
  index,
  origin,
  colWidth,
  rowHeight,
  snapToDay,
  override,
  onOverride,
  onUpdate,
  onTaskClick,
}: BarProps) {
  const { left, width, progress } = computeTaskPixels(
    task,
    override || {},
    origin,
    colWidth,
    { snapToDay },
  );
  const top = index * rowHeight;
  const visualLeft = left;
  const barHeight = rowHeight - TASK_VERTICAL_PADDING * 2;
  const barCenterY = TASK_VERTICAL_PADDING + barHeight / 2;

  const [hovered, setHovered] = useState(false);

  const moveAt = (newLeft: number): DatePatch => ({
    startDate: pxToDate(newLeft, origin, colWidth),
    endDate: pxToDate(newLeft + width - colWidth, origin, colWidth),
  });

  const resizeAt = (newWidth: number, newLeft: number): DatePatch => ({
    startDate: pxToDate(newLeft, origin, colWidth),
    endDate: pxToDate(newLeft + newWidth - colWidth, origin, colWidth),
  });

  const handleOverride = (patch: DatePatch) => {
    onOverride(task.id, patch);
  };

  const handleUpdate = (id: Id, patch: DatePatch) => {
    onUpdate(id, patch);
    onOverride(id, null);
  };

  return (
    <div
      className={styles.row}
      style={{ top, height: rowHeight }}
      onClick={onTaskClick ? () => onTaskClick(task) : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ConnectorHandles taskId={task.id} barCenterY={barCenterY} show={hovered} />

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
});
