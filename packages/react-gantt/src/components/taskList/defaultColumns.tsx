import type { ColumnDef, GanttTask } from "../../types";
import { ActionsCell } from "./ActionsCell";

/**
 * Key of the built-in edit/add/delete column, dropped when `readOnly` is set.
 *
 * Exported so a consumer can extend the built-in set rather than replace it:
 * `[...DEFAULT_COLUMNS.filter((c) => c.key !== ACTION_COLUMN_KEY), myColumn]`.
 */
export const ACTION_COLUMN_KEY = "__action";

/**
 * The columns `<Gantt>` renders when no `columns` prop is given.
 *
 * Treat as immutable — it is module state shared by every chart on the page.
 */
export const DEFAULT_COLUMNS: ColumnDef[] = [
  {
    key: ACTION_COLUMN_KEY,
    header: "  ",
    width: 100,
    render: (task, api) => <ActionsCell task={task} api={api} />,
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
