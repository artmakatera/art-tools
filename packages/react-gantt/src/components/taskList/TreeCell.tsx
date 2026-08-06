import type { ComponentProps, ElementType, ReactNode } from "react";
import type { Id } from "../../types";
import { mergeSlotProps, type SlotConfig, type SlotPropsInput } from "../../core/slots";
import styles from "./TaskList.module.css";

const INDENT_PX = 16;

/** State passed to the function form of each TreeCell slotProps. */
export interface TreeCellOwnerState {
  taskId: Id;
  depth: number;
  isParent: boolean;
  isExpanded: boolean;
}

export interface TreeCellSlots {
  /** The `nameContent` wrapper. Default: `"span"`. */
  root?: ElementType;
  /** The ▾/▸ expand/collapse toggle. Default: `"button"`. */
  expandButton?: ElementType;
  /** The spacer rendered for leaf (non-parent) rows. Default: `"span"`. */
  placeholder?: ElementType;
}

export interface TreeCellSlotProps {
  root?: SlotPropsInput<ComponentProps<"span">, TreeCellOwnerState>;
  expandButton?: SlotPropsInput<ComponentProps<"button">, TreeCellOwnerState>;
  placeholder?: SlotPropsInput<ComponentProps<"span">, TreeCellOwnerState>;
}

/**
 * Slot config for the tree cell. Pass via `<Gantt treeCell={...} />`.
 *
 * NOTE: pass a referentially stable / memoized object — `TaskListRow` is memoized,
 * so a fresh object each render defeats its memo and re-renders every row.
 */
export type TreeCellSlotConfig = SlotConfig<TreeCellSlots, TreeCellSlotProps>;

interface TreeCellProps {
  taskId: Id;
  depth: number;
  isParent: boolean;
  isExpanded: boolean;
  onToggleExpand: (id: Id) => void;
  children: ReactNode;
  slots?: TreeCellSlots;
  slotProps?: TreeCellSlotProps;
}

export function TreeCell({
  taskId,
  depth,
  isParent,
  isExpanded,
  onToggleExpand,
  children,
  slots,
  slotProps,
}: TreeCellProps) {
  const ownerState: TreeCellOwnerState = { taskId, depth, isParent, isExpanded };

  const Root = slots?.root ?? "span";
  const ExpandButton = slots?.expandButton ?? "button";
  const Placeholder = slots?.placeholder ?? "span";

  const rootProps = mergeSlotProps(
    {
      className: styles.nameContent,
      style: { paddingLeft: depth * INDENT_PX },
    },
    slotProps?.root,
    ownerState,
  );

  const buttonProps = mergeSlotProps(
    {
      className: styles.expandBtn,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleExpand(taskId);
      },
      "aria-label": isExpanded ? "Collapse" : "Expand",
      children: isExpanded ? "▾" : "▸",
    },
    slotProps?.expandButton,
    ownerState,
  );

  const placeholderProps = mergeSlotProps(
    { className: styles.expandPlaceholder },
    slotProps?.placeholder,
    ownerState,
  );

  return (
    <Root {...rootProps}>
      {isParent ? (
        <ExpandButton {...buttonProps} />
      ) : (
        <Placeholder {...placeholderProps} />
      )}
      {children}
    </Root>
  );
}
