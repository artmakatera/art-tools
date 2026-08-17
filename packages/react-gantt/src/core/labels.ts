import type { CalendarUnit, GanttLabels, GanttTask, ResolvedGanttLabels } from "../types";
import { dateFormatter } from "./intl";


export const DEFAULT_LABELS: ResolvedGanttLabels = {
  gantt: "Gantt chart",
  taskList: "Task list",
  timeline: "Timeline",
  expand: "Expand",
  collapse: "Collapse",
  resizeTaskList: "Resize task list",
  deleteDependency: "Delete dependency",
  editTask: (task) => `Edit ${task.name}`,
  addTaskAfter: (task) => `Add task after ${task.name}`,
  deleteTask: (task) => `Delete ${task.name}`,
  bar: (task, { progress }) => formatBarLabel(task, progress),
};

export function resolveLabels(labels: GanttLabels | undefined): ResolvedGanttLabels {
  if (!labels) {
    return DEFAULT_LABELS;
  }
  return { ...DEFAULT_LABELS, ...labels };
}

const formatDate = dateFormatter({ dateStyle: "medium" });

const TYPE_NAMES: Record<NonNullable<GanttTask["type"]>, string> = {
  task: "task",
  milestone: "milestone",
  summary: "summary",
};


export function formatBarLabel(task: GanttTask, progress: number): string {
  const type = TYPE_NAMES[task.type ?? "task"];
  const parts = [task.name, type];
  if (task.endDate && task.endDate.getTime() !== task.startDate.getTime()) {
    parts.push(`${formatDate(task.startDate)} to ${formatDate(task.endDate)}`);
  } else {
    parts.push(formatDate(task.startDate));
  }
  // Milestones are a point in time — a completion percentage is meaningless.
  if (task.type !== "milestone") {
    parts.push(`${Math.round(progress)}% complete`);
  }
  return parts.join(", ");
}

const formatDateTimeLong = dateFormatter({ dateStyle: "long", timeStyle: "short" });
const formatDateLong = dateFormatter({ dateStyle: "long" });
const formatMonthYear = dateFormatter({ month: "long", year: "numeric" });

export function formatPeriodLabel(date: Date, unit: CalendarUnit, step: number): string {
  switch (unit) {
    case "minute":
    case "hour":
      return formatDateTimeLong(date);
    case "day":
      return formatDateLong(date);
    case "week":
      return `Week of ${formatDateLong(date)}`;
    case "month":
      return formatMonthYear(date);
    case "quarter": {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    }
    case "year":
      return step > 1
        ? `${date.getFullYear()} to ${date.getFullYear() + step - 1}`
        : String(date.getFullYear());
  }
}
