import type { ColumnApi, GanttTask } from "../../types";
import { addDays } from "../../core/dateUtils";

import styles from "./ActionsCell.module.css";

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
export function buildActionTask(task: GanttTask): GanttTask {
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

/**
 * The edit / add-after / delete controls of the built-in actions column.
 *
 * A real component rather than JSX inside an array literal, so it has somewhere
 * to grow a slot and somewhere to be tested from. Every handler stops propagation
 * because the whole row is clickable for selection.
 *
 * Labels come through `api.labels`, not `useGanttLabels()` — a column's `render`
 * is a plain function and cannot call hooks.
 */
export function ActionsCell({ task, api }: { task: GanttTask; api: ColumnApi }) {
  return (
    <div className={styles.actionsCell}>
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
  );
}
