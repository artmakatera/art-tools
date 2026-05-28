import { computeTaskPixels, type PixelPatch } from "../../../core/barUtils";
import { TASK_VERTICAL_PADDING } from "../../../core/constants";
import type { GanttTask, Id, TaskState } from "../../../types";
import { MilestoneBar } from "../milestoneBar/MilestoneBar";
import { ProjectBar } from "../projectBar/ProjectBar";
import { TaskBar } from "../taskBar/TaskBar";
import styles from "./Bar.module.css";

interface BarProps {
  task: GanttTask;
  index: number;
  override: Partial<TaskState>;
  origin: Date;
  colWidth: number;
  rowHeight: number;
  offsetLeft: number;
  snapToDay: boolean;
  onUpdate: (id: Id, patch: PixelPatch) => void;
  onCommit: (id: Id, patch: PixelPatch, isResize?: boolean) => void;
}

export function Bar({
  task,
  index,
  override,
  origin,
  colWidth,
  rowHeight,
  offsetLeft,
  snapToDay,
  onUpdate,
  onCommit,
}: BarProps) {
  const { left, width, progress } = computeTaskPixels(
    task,
    override,
    origin,
    colWidth,
    { snapToDay },
  );
  const top = index * rowHeight;
  const visualLeft = offsetLeft + left;
  const barHeight = rowHeight - TASK_VERTICAL_PADDING * 2;

  return (
    <div className={styles.row} style={{ top, height: rowHeight }}>
      {task.type === "milestone" && (
        <MilestoneBar
          size={barHeight}
          centerLeft={visualLeft}
          top={TASK_VERTICAL_PADDING}
          colWidth={colWidth}
          title={task.name}
          onMove={(newCenter) =>
            onUpdate(task.id, { left: newCenter - offsetLeft })
          }
          onMoveEnd={(newCenter) =>
            onCommit(task.id, { left: newCenter - offsetLeft })
          }
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
          onProgressChange={(p) => onUpdate(task.id, { progress: p })}
          onMove={(newVisualLeft) =>
            onUpdate(task.id, { left: newVisualLeft - offsetLeft })
          }
          onMoveEnd={(newVisualLeft) =>
            onCommit(task.id, { left: newVisualLeft - offsetLeft })
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
          onProgressChange={(p) => onUpdate(task.id, { progress: p })}
          onMove={(newVisualLeft) =>
            onUpdate(task.id, { left: newVisualLeft - offsetLeft })
          }
          onMoveEnd={(newVisualLeft) =>
            onCommit(task.id, { left: newVisualLeft - offsetLeft })
          }
          onResize={(newWidth, newVisualLeft) =>
            onUpdate(task.id, {
              width: newWidth,
              left: newVisualLeft - offsetLeft,
            })
          }
          onResizeEnd={(newWidth, newVisualLeft) =>
            onCommit(
              task.id,
              { width: newWidth, left: newVisualLeft - offsetLeft },
              true,
            )
          }
        />
      ) : null}
    </div>
  );
}
