import type React from "react";
import type { ComponentProps, ElementType } from "react";
import type { ColumnDef, Scale } from "../../types";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../core/slots";
import styles from "./TaskList.module.css";
import { DEFAULT_SCALES } from "../../core/scales";

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

export type TaskListHeaderSlotConfig = SlotConfig<TaskListHeaderSlots, TaskListHeaderSlotProps>;

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
