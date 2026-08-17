import type React from "react";
import type { ComponentProps, ElementType } from "react";
import type { ColumnDef, GanttTask, Scale } from "../../types";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../core/slots";
import styles from "./TaskList.module.css";
import { DEFAULT_SCALES } from "../../core/scales";
import { addDays } from "../../core/dateUtils";

/** State passed to the function form of the header (container) slotProps. */
export interface TaskListHeaderOwnerState {
  columns: ColumnDef[];
  headerHeight: number;
}

/** State passed to the function form of the per-column slotProps. */
export interface TaskListHeaderCellOwnerState {
  column: ColumnDef;
  index: number;
}

export interface TaskListHeaderSlots {
  /** The header row container. Default: `"div"`. */
  header?: ElementType;
  /** A per-column header cell. Default: `"div"`. */
  headerCell?: ElementType;
  /** The per-column resize handle (divider). Default: `"div"`. */
  columnResizeHandle?: ElementType;
}

export interface TaskListHeaderSlotProps {
  header?: SlotPropsInput<ComponentProps<"div">, TaskListHeaderOwnerState>;
  headerCell?: SlotPropsInput<ComponentProps<"div">, TaskListHeaderCellOwnerState>;
  columnResizeHandle?: SlotPropsInput<ComponentProps<"div">, TaskListHeaderCellOwnerState>;
}

export type TaskListHeaderSlotConfig = SlotConfig<
  TaskListHeaderSlots,
  TaskListHeaderSlotProps
>;

interface TaskListHeaderProps {
  columns: ColumnDef[];
  rowHeight: number;
  scales?: Scale[];
  onResizeStart: (key: string, startWidth: number, e: React.MouseEvent) => void;
  slots?: TaskListHeaderSlots;
  slotProps?: TaskListHeaderSlotProps;
}

export function TaskListHeader({
  columns,
  rowHeight,
  scales = DEFAULT_SCALES,
  onResizeStart,
  slots,
  slotProps,
}: TaskListHeaderProps) {
  // Height tracks the calendar: one row per scale, +2 for its 1px top/bottom
  // borders. Both default to the shared DEFAULT_SCALES so the counts can't drift.
  const headerHeight = scales.length * rowHeight + 2;

  const Header = slots?.header ?? "div";
  const HeaderCell = slots?.headerCell ?? "div";
  const ColumnResizeHandle = slots?.columnResizeHandle ?? "div";

  // Row 1 of the enclosing treegrid.
  const headerProps = mergeSlotProps(
    {
      className: styles.header,
      style: { minHeight: headerHeight, height: headerHeight },
      role: "row",
      "aria-rowindex": 1,
    },
    slotProps?.header,
    { columns, headerHeight },
  );

  return (
    <Header {...headerProps}>
      {columns.map((col, index) => {
        const cellOwnerState: TaskListHeaderCellOwnerState = { column: col, index };

        const headerCellProps = mergeSlotProps(
          {
            className: styles.headerCell,
            style: col.width
              ? { width: col.width, flexShrink: 0 }
              : { flex: "1 1 auto", minWidth: 100 },
            role: "columnheader",
            "aria-colindex": index + 1,
          },
          slotProps?.headerCell,
          cellOwnerState,
        );

        const resizeHandleProps = mergeSlotProps(
          {
            className: styles.divider,
            "aria-hidden": true,
            onMouseDown: (e: React.MouseEvent) => {
              // Read the rendered width from the DOM so flex (no explicit width)
              // columns snap cleanly to a fixed width on first drag.
              const cell = e.currentTarget.parentElement as HTMLElement;
              onResizeStart(col.key, cell.offsetWidth, e);
            },
          },
          slotProps?.columnResizeHandle,
          cellOwnerState,
        );

        return (
          <HeaderCell key={col.key} {...headerCellProps}>
            {col.header}
            <ColumnResizeHandle {...resizeHandleProps} />
          </HeaderCell>
        );
      })}
    </Header>
  );
}

/**
 * Builds the task inserted by the actions-column "add after" button: a blank
 * one-day task starting the day after the clicked row, under the same parent.
 *
 * `endDate` is exclusive, so a one-day task ends at the following midnight.
 *
 * Known gap (ADR-012): this is a library-authored date that does NOT snap onto
 * working time, because a column's `render` is a plain function with no access to
 * the calendar. A task added after a Friday row can therefore land on a Saturday
 * until it is first dragged.
 */
function buildActionTask(task: GanttTask): GanttTask {
  const start = addDays(task.startDate, 1);
  return {
    id: `task-${Date.now()}`,
    name: "New task",
    startDate: start,
    endDate: addDays(start, 1),
    duration: 1,
    progress: 0,
    type: "task",
    parentId: task.parentId ?? null,
  };
}

/** Key of the built-in edit/add/delete column, dropped when `readOnly` is set. */
const ACTION_COLUMN_KEY = "__action";

export const DEFAULT_COLUMNS: ColumnDef[] = [
    {
    key: ACTION_COLUMN_KEY,
    header: "  ",
    width: 120,
    render: (task, api) => {
      return  <div style={{ display: "flex", gap: "8px"}}>
        <button
          type="button"
          title="Edit"
          aria-label={api.labels.editTask(task)}
          onClick={(e) => {
            e.stopPropagation();
            api.editTask(task);
          }}
        >
          <span aria-hidden="true">&#9998;</span>
        </button>
        <button
          type="button"
          title="Add after"
          aria-label={api.labels.addTaskAfter(task)}
          onClick={(e) => {
            e.stopPropagation();
            const created = buildActionTask(task);
            api.createTask(created, task.id);
            api.editTask(created);
          }}
        >
          <span aria-hidden="true">&#10133;</span>
        </button>
        <button
          type="button"
          title="Delete"
          aria-label={api.labels.deleteTask(task)}
          style={{ fontSize: 9 }}
          onClick={(e) => {
            e.stopPropagation();
            api.deleteTask(task.id);
          }}
        >
          <span aria-hidden="true">&#10060;</span>
        </button>
      </div>
    }
  },
  {
    key: "__name",
    header: "Task Name",
    render: (task: GanttTask) => task.name,
    width: 200,
    isTreeColumn: true,
  },
  {
    key: "__start",
    header: "Start",
    width: 90,
    render: (task: GanttTask) => task.startDate.toLocaleDateString(),
  },
  {
    key: "__end",
    header: "End",
    width: 90,
    // Stored ends are exclusive instants, so format through the api rather than
    // reading `task.endDate` — otherwise a Mon–Fri task reads as ending Saturday.
    render: (task: GanttTask, api) => api.format.endDate(task)?.toLocaleDateString() ?? "—",
  },
  {
    key: "__progress",
    header: "Progress, %",
    width: 90,
    render: (task: GanttTask) => `${task.progress ?? 0}%`,
  },

];

/** {@link DEFAULT_COLUMNS} without the actions column — the `readOnly` default. */
export const READ_ONLY_COLUMNS: ColumnDef[] = DEFAULT_COLUMNS.filter(
  (col) => col.key !== ACTION_COLUMN_KEY,
);
