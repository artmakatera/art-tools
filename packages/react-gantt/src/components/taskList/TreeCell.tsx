import type { ReactNode } from "react";
import type { Id } from "../../types";
import styles from "./TaskList.module.css";

const INDENT_PX = 16;

interface TreeCellProps {
  taskId: Id;
  depth: number;
  isParent: boolean;
  isExpanded: boolean;
  onToggleExpand: (id: Id) => void;
  children: ReactNode;
}

export function TreeCell({
  taskId,
  depth,
  isParent,
  isExpanded,
  onToggleExpand,
  children,
}: TreeCellProps) {
  return (
    <span
      className={styles.nameContent}
      style={{ paddingLeft: depth * INDENT_PX }}
    >
      {isParent ? (
        <button
          className={styles.expandBtn}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(taskId);
          }}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? "▾" : "▸"}
        </button>
      ) : (
        <span className={styles.expandPlaceholder} />
      )}
      {children}
    </span>
  );
}
