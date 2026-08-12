import { memo, useState } from "react";
import {
  computeTaskPixels,
  type DatePatch,
  pxToDate,
  pxToEndDate,
} from "../../../core/barUtils";
import { TASK_VERTICAL_PADDING } from "../../../core/constants";
import { useGanttLabels, useGanttSelectedId } from "../../../context/GanttContext";
import type { CalendarUnit, GanttTask, Id, TaskState } from "../../../types";
import { MilestoneBar } from "../milestoneBar/MilestoneBar";
import { ProjectBar } from "../projectBar/ProjectBar";
import { TaskBar } from "../taskBar/TaskBar";
import { ConnectorHandles } from "./ConnectorHandles";
import type { BarA11yProps } from "./DraggableBar";
import styles from "./Bar.module.css";

interface BarProps {
  task: GanttTask;
  index: number;
  origin: Date;
  colWidth: number;
  rowHeight: number;
  snapToDay: boolean;
  unit: CalendarUnit;
  onUpdate: (id: Id, patch: DatePatch) => void;
  override?: Partial<TaskState>;
  onOverride: (id: Id, patch: DatePatch | null) => void;
  onTaskClick?: (task: GanttTask) => void;
  rowIndexOffset: number;
}

export const Bar = memo(function Bar({
  task,
  index,
  origin,
  colWidth,
  rowHeight,
  snapToDay,
  unit,
  override,
  onOverride,
  onUpdate,
  onTaskClick,
  rowIndexOffset,
}: BarProps) {
  const labels = useGanttLabels();
  const selectedId = useGanttSelectedId();
  const isSelected = selectedId === task.id;

  const { left, width, progress } = computeTaskPixels(
    task,
    override || {},
    origin,
    colWidth,
    unit,
    { snapToDay },
  );
  const top = index * rowHeight;
  const visualLeft = left;
  const barHeight = rowHeight - TASK_VERTICAL_PADDING * 2;
  const barCenterY = TASK_VERTICAL_PADDING + barHeight / 2;

  const [hovered, setHovered] = useState(false);

  const moveAt = (newLeft: number): DatePatch => ({
    startDate: pxToDate(newLeft, origin, colWidth, unit),
    endDate: pxToEndDate(newLeft + width, origin, colWidth, unit),
  });

  const resizeAt = (newWidth: number, newLeft: number): DatePatch => ({
    startDate: pxToDate(newLeft, origin, colWidth, unit),
    endDate: pxToEndDate(newLeft + newWidth, origin, colWidth, unit),
  });

  const handleOverride = (patch: DatePatch) => {
    onOverride(task.id, patch);
  };

  const handleUpdate = (id: Id, patch: DatePatch) => {
    onUpdate(id, patch);
    onOverride(id, null);
  };

  const a11y: BarA11yProps = {
    role: "gridcell",
    "aria-colindex": Math.max(1, Math.floor(visualLeft / colWidth) + 1),
    "aria-colspan": Math.max(1, Math.round(width / colWidth)),
    "aria-label": labels.bar(task, { progress }),
    "aria-selected": isSelected || undefined,
    title: task.name,
  };

  return (
    <div
      className={styles.row}
      style={{ top, height: rowHeight }}
      onClick={onTaskClick ? () => onTaskClick(task) : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="row"
      aria-rowindex={rowIndexOffset + index + 1}
    >
      <ConnectorHandles
        taskId={task.id}
        barLeft={visualLeft}
        barWidth={width}
        barCenterY={barCenterY}
        show={hovered}
      />

      {task.type === "milestone" && (
        <MilestoneBar
          size={barHeight}
          centerLeft={visualLeft}
          top={TASK_VERTICAL_PADDING}
          colWidth={colWidth}
          title={task.name}
          a11y={a11y}
          onMove={(newCenter) => handleOverride(moveAt(newCenter))}
          onMoveEnd={(newCenter) => handleUpdate(task.id, moveAt(newCenter))}
        />
      )}
      {task.type === "summary" && (
        <ProjectBar
          left={visualLeft}
          top={TASK_VERTICAL_PADDING}
          width={width}
          height={barHeight}
          colWidth={colWidth}
          title={task.name}
          a11y={a11y}
          progress={progress}
          onProgressChange={(p) => handleOverride({ progress: p })}
          onProgressEnd={(p) => handleUpdate(task.id, { progress: p })}
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
          a11y={a11y}
          progress={progress}
          onProgressChange={(p) => handleOverride({ progress: p })}
          onProgressEnd={(p) => handleUpdate(task.id, { progress: p })}
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

Bar.displayName = "Bar";
