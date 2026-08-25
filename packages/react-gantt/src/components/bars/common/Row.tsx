import { memo, startTransition, useState } from "react";
import {
  type BarCommit,
  computeTaskPixels,
  type DatePatch,
  pxToDate,
} from "../../../core/barUtils";
import { TASK_VERTICAL_PADDING } from "../../../core/constants";
import {
  useGanttCriticalPath,
  useGanttLabels,
  useGanttReadOnly,
  useGanttSelectedId,
  useGanttWorkCalendar,
} from "../../../context/contexts";
import { useGanttSlots } from "../../../context/GanttSlotsContext";
import { displayEndOf } from "../../../core/taskDates";
import type { CalendarUnit, GanttTask, Id, TaskState } from "../../../types";
import { MilestoneBar } from "../milestoneBar/MilestoneBar";
import { ProjectBar } from "../projectBar/ProjectBar";
import { TaskBar } from "../taskBar/TaskBar";
import type { BarTooltipOwnerState } from "../barTooltip";
import { ConnectorHandles } from "./ConnectorHandles";
import type { BarA11yProps } from "./DraggableBar";
import styles from "./Row.module.css";

interface RowProps {
  task: GanttTask;
  index: number;
  origin: Date;
  colWidth: number;
  rowHeight: number;
  unit: CalendarUnit;
  onUpdate: (id: Id, patch: DatePatch) => void;
  onCommit: (id: Id, commit: BarCommit) => void;
  override?: Partial<TaskState>;
  onOverride: (id: Id, patch: DatePatch | null) => void;
  onTaskClick?: (task: GanttTask) => void;
  rowIndexOffset: number;
}

export const Row = memo(function Row({
  task,
  index,
  origin,
  colWidth,
  rowHeight,
  unit,
  override,
  onOverride,
  onUpdate,
  onCommit,
  onTaskClick,
  rowIndexOffset,
}: RowProps) {
  const labels = useGanttLabels();
  const readOnly = useGanttReadOnly();
  const selectedId = useGanttSelectedId();
  const isSelected = selectedId === task.id;
  const criticalPath = useGanttCriticalPath();
  const isCritical = criticalPath?.criticalTaskIds.has(task.id) ?? false;

  const schedulingContext = useGanttWorkCalendar();
  // Read only to decide whether to suppress the native `title` — that has to
  // happen where `a11y` is assembled, which is here. The tooltip itself is
  // rendered by the bar.
  const Tooltip = useGanttSlots().bars?.tooltip?.slots?.tooltip;

  const { left, width, progress } = computeTaskPixels(task, override || {}, origin, colWidth, unit);
  const top = index * rowHeight;
  const visualLeft = left;
  const barHeight = rowHeight - TASK_VERTICAL_PADDING * 2;
  const barCenterY = TASK_VERTICAL_PADDING + barHeight / 2;

  // The handles bracket the bar's *painted* box, which for a milestone is not
  // its date span. A milestone is an instant, so `computeTaskPixels` returns
  // width 0, while `MilestoneBar` paints a `barHeight`-square diamond centred on
  // `visualLeft` — mirrored from its own `centerLeft - size / 2`. Passing the raw
  // span put the start handle over the diamond's left half and the end handle
  // exactly on its centre, instead of outside it as on every other bar type.
  const isMilestone = task.type === "milestone";
  const handleLeft = isMilestone ? visualLeft - barHeight / 2 : visualLeft;
  const handleWidth = isMilestone ? barHeight - 1 : width;

  // Row-level hover, for the connector handles: they should appear as the
  // pointer approaches the bar. The tooltip's own hover lives in the bar
  // (DraggableBar), which is what renders it (ADR-022).
  const [hovered, setHovered] = useState(false);

  // `endDate` is exclusive (ADR-014), so the bar's right edge maps straight to it —
  // no day subtracted back off.
  const moveAt = (newLeft: number): DatePatch => ({
    startDate: pxToDate(newLeft, origin, colWidth, unit),
    endDate: pxToDate(newLeft + width, origin, colWidth, unit),
  });

  const resizeAt = (newWidth: number, newLeft: number): DatePatch => ({
    startDate: pxToDate(newLeft, origin, colWidth, unit),
    endDate: pxToDate(newLeft + newWidth, origin, colWidth, unit),
  });

  const handleOverride = (patch: DatePatch) => {
    onOverride(task.id, patch);
  };

  const handleUpdate = (id: Id, patch: DatePatch) => {
    startTransition(() => {
      onUpdate(id, patch);
      onOverride(id, null);
    });
  };

  // Commits carry INTENT, not the two dates the pixels happened to land on: a move
  // must preserve working time, which pixel width cannot express once a calendar
  // exists. Clearing the override unconditionally is also what makes a bar dropped
  // in non-working time visibly settle back — a commit that resolves to no change
  // schedules no log update, so the preview clear is the only thing in the
  // transition and the bar settles on the next render.
  const handleCommit = (commit: BarCommit) => {
    startTransition(() => {
      onCommit(task.id, commit);
      onOverride(task.id, null);
    });
  };

  const commitMoveAt = (newLeft: number): BarCommit => ({
    kind: "move",
    startDate: pxToDate(newLeft, origin, colWidth, unit),
  });

  // A read-only bar is handed no editing handlers at all, rather than handlers
  // that decline: each affordance (drag listener, resizer, progress handle)
  // renders only when its callbacks arrive, so omitting them removes the
  // affordance itself — nothing to grab, nothing to explain away.
  const moveHandlers = readOnly
    ? {}
    : {
        onMove: (newVisualLeft: number) => handleOverride(moveAt(newVisualLeft)),
        onMoveEnd: (newVisualLeft: number) => handleCommit(commitMoveAt(newVisualLeft)),
      };

  const progressHandlers = readOnly
    ? {}
    : {
        onProgressChange: (p: number) => handleOverride({ progress: p }),
        onProgressEnd: (p: number) => handleUpdate(task.id, { progress: p }),
      };

  const resizeHandlers = readOnly
    ? {}
    : {
        onResize: (newWidth: number, newVisualLeft: number) =>
          handleOverride(resizeAt(newWidth, newVisualLeft)),
        onResizeEnd: (edge: "start" | "end", edgePx: number) =>
          handleCommit(
            edge === "start"
              ? { kind: "resizeStart", startDate: pxToDate(edgePx, origin, colWidth, unit) }
              : { kind: "resizeEnd", endDate: pxToDate(edgePx, origin, colWidth, unit) },
          ),
      };

  // The native `title` is dropped when a tooltip slot is configured: the browser
  // tooltip would otherwise surface on top of the custom one. `aria-label` is
  // untouched, so the accessible name is the same either way — which is also why
  // dropping it is safe with a hover-only tooltip (ADR-022).
  const a11y: BarA11yProps = {
    role: "gridcell",
    "aria-colindex": Math.max(1, Math.floor(visualLeft / colWidth) + 1),
    "aria-colspan": Math.max(1, Math.round(width / colWidth)),
    "aria-label": labels.bar(task, { progress }),
    "aria-selected": isSelected || undefined,
    title: Tooltip ? undefined : task.name,
  };

  // Data only — nothing here says whether the tooltip is showing, because that is
  // the slot's own state (ADR-022). `progress` is override-aware during a drag,
  // and `displayEnd` is inclusive (ADR-014) so no consumer rediscovers that
  // `task.endDate` is exclusive.
  const tooltipData: BarTooltipOwnerState = {
    task,
    progress,
    displayEnd: displayEndOf(task, schedulingContext),
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
      {!readOnly && (
        <ConnectorHandles
          taskId={task.id}
          barLeft={handleLeft}
          barWidth={handleWidth}
          barCenterY={barCenterY}
          show={hovered}
        />
      )}

      {task.type === "milestone" && (
        <MilestoneBar
          tooltip={tooltipData}
          size={barHeight}
          centerLeft={visualLeft}
          top={TASK_VERTICAL_PADDING}
          colWidth={colWidth}
          title={task.name}
          a11y={a11y}
          isCritical={isCritical}
          {...moveHandlers}
        />
      )}
      {task.type === "summary" && (
        <ProjectBar
          tooltip={tooltipData}
          left={visualLeft}
          top={TASK_VERTICAL_PADDING}
          width={width}
          height={barHeight}
          colWidth={colWidth}
          title={task.name}
          a11y={a11y}
          progress={progress}
          isCritical={isCritical}
          {...progressHandlers}
          {...moveHandlers}
        />
      )}
      {task.type === "task" || !task.type ? (
        <TaskBar
          tooltip={tooltipData}
          left={visualLeft}
          top={TASK_VERTICAL_PADDING}
          width={width}
          height={barHeight}
          colWidth={colWidth}
          title={task.name}
          a11y={a11y}
          progress={progress}
          isCritical={isCritical}
          {...progressHandlers}
          {...moveHandlers}
          {...resizeHandlers}
        />
      ) : null}
    </div>
  );
});

Row.displayName = "Row";
