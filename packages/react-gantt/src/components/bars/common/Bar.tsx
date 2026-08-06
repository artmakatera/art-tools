import { memo, useState } from "react";
import {
  computeTaskPixels,
  type DatePatch,
  pxToDate,
  pxToEndDate,
  resolveTaskDates,
} from "../../../core/barUtils";
import { TASK_VERTICAL_PADDING } from "../../../core/constants";
import type { CalendarUnit, GanttTask, Id, TaskState } from "../../../types";
import { MilestoneBar } from "../milestoneBar/MilestoneBar";
import { ProjectBar } from "../projectBar/ProjectBar";
import { TaskBar } from "../taskBar/TaskBar";
import { ConnectorHandles } from "./ConnectorHandles";
import type { ConnectorHandle } from "../../../hooks/useDependencyDrag";
import styles from "./Bar.module.css";

interface BarProps {
  task: GanttTask;
  index: number;
  origin: Date;
  colWidth: number;
  rowHeight: number;
  snapToDay: boolean;
  unit: CalendarUnit;
  depth: number;
  posinset: number;
  setsize: number;
  isParent: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  /** True for this pane's single roving tab stop. */
  isFocused: boolean;
  /** Set when this bar's handle is the source of an in-progress keyboard link. */
  focusedHandle?: ConnectorHandle | null;
  /** Set when this bar's handle is the prospective target of that link. */
  linkTargetHandle?: ConnectorHandle | null;
  onUpdate: (id: Id, patch: DatePatch) => void;
  override?: Partial<TaskState>;
  onOverride: (id: Id, patch: DatePatch | null) => void;
  onTaskClick?: (task: GanttTask) => void;
}

/**
 * Accessible name for the bar cell. The timeline exposes one cell per row, so
 * this is the only place the schedule is spoken — it has to carry the dates and
 * progress the sighted user reads off the bar's position and fill.
 */
function barLabel(task: GanttTask, effective: { startDate: Date; endDate: Date; progress: number }): string {
  const start = effective.startDate.toLocaleDateString();
  if (task.type === "milestone") {
    return `${task.name}, milestone ${start}`;
  }
  const end = effective.endDate.toLocaleDateString();
  const span = start === end ? start : `${start} to ${end}`;
  return `${task.name}, ${span}, ${Math.round(effective.progress)}% complete`;
}

export const Bar = memo(function Bar({
  task,
  index,
  origin,
  colWidth,
  rowHeight,
  snapToDay,
  unit,
  depth,
  posinset,
  setsize,
  isParent,
  isExpanded,
  isSelected,
  isFocused,
  focusedHandle = null,
  linkTargetHandle = null,
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
    unit,
    { snapToDay },
  );
  const effective = resolveTaskDates(task, override || {});
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

  return (
    <div
      className={styles.row}
      style={{ top, height: rowHeight }}
      onClick={onTaskClick ? () => onTaskClick(task) : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="row"
      // No header row in this pane (the calendar is aria-hidden), so data rows
      // are 1-based. Correlation with the task list is by data-task-id, not by
      // index — the two panes deliberately use different bases.
      aria-rowindex={index + 1}
      aria-level={depth + 1}
      aria-posinset={posinset}
      aria-setsize={setsize}
      aria-selected={isSelected}
      aria-expanded={isParent ? isExpanded : undefined}
      data-task-id={task.id}
      data-gantt-slot="bar-row"
    >
      {/* A row's children must all be cells, so everything lives inside this
          one. It is `inset: 0` over the row strip, giving the bars an identical
          containing block — their left/top values are unaffected. */}
      <div
        role="gridcell"
        aria-colindex={1}
        aria-label={barLabel(task, effective)}
        className={styles.cell}
        tabIndex={isFocused ? 0 : -1}
        data-task-id={task.id}
        data-gantt-slot="bar"
      >
      <ConnectorHandles
        taskId={task.id}
        taskName={task.name}
        barLeft={visualLeft}
        barWidth={width}
        barCenterY={barCenterY}
        show={hovered}
        focusedHandle={focusedHandle}
        linkTargetHandle={linkTargetHandle}
      />

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
      {task.type === "summary" && (
        <ProjectBar
          left={visualLeft}
          top={TASK_VERTICAL_PADDING}
          width={width}
          height={barHeight}
          colWidth={colWidth}
          title={task.name}
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
    </div>
  );
});

Bar.displayName = "Bar";
