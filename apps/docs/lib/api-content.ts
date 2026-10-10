interface ApiContent {
  notes: readonly string[];
  examples: readonly string[];
  code: string;
}

export const API_CONTENT: Record<string, ApiContent> = {
  gantt: {
    notes: [
      "Import @art-tools/react-gantt/style.css once at your application entry point. Render the chart inside a client boundary in Next.js.",
      "tasks is required. Keep the seed array stable and use apiRef for edits. onTasksChange reports the resolved task list; it is not a controlled-value setter to feed directly back into tasks.",
      "height is optional: set it to enable vertical scrolling with pinned headers, or omit it to grow with content. rowHeight defaults to 36px, defaultTaskListWidth to 280px, and the default month/day zoom level uses 40px columns.",
      "readOnly defaults to false. It removes built-in editing controls while selection, scrolling, zoom, and imperative edits remain available. showBaselines defaults to true; criticalPath defaults to false.",
      "Keep labels and slot configuration objects referentially stable to avoid unnecessary row and bar renders.",
    ],
    examples: ["basic", "read-only", "nextjs-ssr"],
    code: `"use client";

import { Gantt, type GanttTask } from "@art-tools/react-gantt";
import "@art-tools/react-gantt/style.css";

const tasks: GanttTask[] = [
  { id: 1, name: "Design", startDate: new Date(2026, 0, 5), duration: 3 },
];

export function Chart() {
  return <Gantt tasks={tasks} height={420} />;
}`,
  },
  tasks: {
    notes: [
      "endDate is exclusive: a Monday-through-Friday task ends at Saturday 00:00. An explicit endDate takes precedence over duration. Milestones and zero-duration tasks represent instants.",
      "duration uses the chart's durationUnit, which defaults to day. The library derives dates from duration and does not rewrite the input duration field. progress is a percentage from 0 to 100.",
      "type defaults to task. Use milestone for an instant and summary for a parent whose dates and progress roll up from children. parentId links a child to its parent; omit it or use null for a root.",
      "Baselines are consumer-owned snapshots. Only the first five entries per task are considered for display. Their endDate is required for tasks and summaries and omitted for milestones. baselineLayout defaults to height 4px, padding 1px, and gap 2px.",
      "Dependency from/to values are task IDs. FS means finish-to-start, SS start-to-start, FF finish-to-finish, and SF start-to-finish. lag uses durationUnit and counts working time when a calendar is supplied.",
    ],
    examples: ["hierarchy", "dependencies", "baselines", "critical-path"],
    code: `import type { GanttTask, TaskDependency } from "@art-tools/react-gantt";

const tasks: GanttTask[] = [
  { id: "design", name: "Design", startDate: new Date(2026, 0, 5), duration: 3 },
  { id: "build", name: "Build", startDate: new Date(2026, 0, 8), duration: 5 },
];

const dependencies: TaskDependency[] = [
  { from: "design", to: "build", type: "FS", lag: 0 },
];`,
  },
  calendar: {
    notes: [
      "Supplying calendar opts into working-time scheduling. Without it, scheduling uses linear time. Calendar precedence is dates, then days, then hours. Omitted hours means the full day; false marks a day off.",
      "Hours use local civil time with minute precision, such as 8:30-12:00. Ranges are half-open; 24:00 is allowed only as an end. Weekdays run from 0 (Sunday) to 6 (Saturday). Date keys use YYYY-MM-DD.",
      "snapToWorking defaults to true. Setting it to false disables snapping of library-authored dates, while working-time duration arithmetic and non-working shading remain in effect. Consumer-supplied dates are not rewritten merely by supplying a calendar.",
      "With a working calendar, one durationUnit day uses the longest working weekday in the week. Working-time walks use civil dates, including across daylight-saving changes.",
      "displayEndDate is for displaying an inclusive last day. endInstantFromDisplayDate converts a chosen whole-day end to the following local midnight. Preserve exact stored instants when an editor leaves a date unchanged.",
    ],
    examples: ["working-time", "task-editing"],
    code: `import type { GanttCalendar } from "@art-tools/react-gantt";

const calendar: GanttCalendar = {
  hours: ["9:00-12:00", "13:00-17:00"],
  days: { 0: false, 6: false },
  dates: { "2026-01-01": false },
};

// <Gantt tasks={tasks} calendar={calendar} durationUnit="hour" />`,
  },
  columns: {
    notes: [
      "columns replaces the complete built-in set. Spread DEFAULT_COLUMNS to extend it, or READ_ONLY_COLUMNS to omit the actions column. Treat both exported arrays as immutable.",
      "Set isTreeColumn on the column that should render hierarchy indentation and expand controls. width is measured in pixels.",
      "render receives the task and ColumnApi. Use api.format.endDate and api.format.duration for values that respect exclusive end dates, the calendar, and durationUnit.",
      "Custom editing controls must check api.readOnly. ColumnApi also exposes imperative methods, editTask, and resolved accessibility labels. render is a plain callback; put hooks in a child component.",
    ],
    examples: ["custom-columns", "task-editing"],
    code: `import { DEFAULT_COLUMNS, type ColumnDef } from "@art-tools/react-gantt";

const columns: ColumnDef[] = [
  ...DEFAULT_COLUMNS,
  {
    key: "duration",
    header: "Duration",
    width: 100,
    render: (task, api) => api.format.duration(task),
  },
];`,
  },
  imperative: {
    notes: [
      "Pass a React ref through apiRef on Gantt or GanttProvider. The handle becomes available after the chart mounts, so use optional chaining in event handlers.",
      "updateTask changes only supplied fields: name, startDate, endDate, and progress. createTask appends when afterId is omitted or null. Each user action and its cascading reschedules form one undo transaction.",
      "revealTask expands collapsed ancestors. It reveals vertically by default; pass horizontal: true to reveal the bar as well. Unknown IDs are ignored.",
      "zoomIn moves one level finer, zoomOut one level coarser, and setZoom clamps the requested index to the available ladder. Imperative mutations remain available when readOnly is true.",
    ],
    examples: ["imperative-api", "custom-zoom"],
    code: `"use client";

import { useRef } from "react";
import { Gantt, type GanttHandle, type GanttTask } from "@art-tools/react-gantt";

export function Chart({ tasks }: { tasks: GanttTask[] }) {
  const apiRef = useRef<GanttHandle>(null);
  return (
    <>
      <button onClick={() => apiRef.current?.undo()}>Undo</button>
      <Gantt tasks={tasks} apiRef={apiRef} height={420} />
    </>
  );
}`,
  },
  composition: {
    notes: [
      "GanttProvider owns chart state and accepts the shared GanttEngineProps plus children. Gantt adds the standard two-pane layout and slot configuration on top of that engine.",
      "Mount TaskList and GanttGrid inside the same provider to share selection, scrolling, and edits. Supply columns explicitly to TaskList. GanttGrid includes its calendar and virtualized bars.",
      "Calendar and the individual bar components are lower-level building blocks. Their declarations include layout and interaction inputs normally supplied by the grid; use GanttGrid for the complete timeline.",
      "Use GanttSlotsProvider for grid-side customization on the composable path. Its value uses dependencies, whereas the all-in-one Gantt prop is named dependencySlots. Task-list slots are passed directly to TaskList.",
    ],
    examples: ["composable"],
    code: `"use client";

import {
  GanttProvider,
  GanttGrid,
  TaskList,
  DEFAULT_COLUMNS,
  type GanttTask,
} from "@art-tools/react-gantt";

export function Chart({ tasks }: { tasks: GanttTask[] }) {
  return (
    <GanttProvider tasks={tasks} height={420}>
      <div style={{ display: "flex" }}>
        <div style={{ width: 280, flexShrink: 0 }}>
          <TaskList columns={DEFAULT_COLUMNS} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}><GanttGrid /></div>
      </div>
    </GanttProvider>
  );
}`,
  },
  timeline: {
    notes: [
      "A scale specifies unit, step, and a date formatter; ariaFormat optionally supplies an accessible label. The finest scale determines the column unit. padDays defaults to 1 and is measured in stepped column units, so at hour zoom it pads hours.",
      "zoomLevels is ordered coarse to fine. The default ladder has five levels, with month/day at index 3. scales and colWidth customize that default rung when a custom ladder is not supplied.",
      "zoomWheel and zoomKeyboard both default to false. Enable them for Ctrl/Cmd + wheel and focused-grid +/- shortcuts. onZoomChange reports index and count on mount and after changes.",
      "timelineElements requires a unique key, a Date or pointer date, and a render callback. Overlays do not expand the timeline and are horizontally virtualized with 256px overscan by default.",
      "A pointer element follows the mouse over the grid body and is noninteractive. Render props resolve its date to a Date. Marker is an explicit opt-in renderer; customize it directly inside render or through timeline.marker slots.",
    ],
    examples: ["custom-zoom", "timeline-elements"],
    code: `import { Marker, type GanttTimelineElement } from "@art-tools/react-gantt";

const timelineElements: GanttTimelineElement[] = [
  {
    key: "deadline",
    date: new Date(2026, 0, 16),
    title: "Deadline",
    render: (props) => <Marker {...props} />,
  },
];

// <Gantt tasks={tasks} timelineElements={timelineElements} zoomWheel />`,
  },
  tooltips: {
    notes: [
      "The tooltip slot is empty by default and bars retain their native title. Assign GanttBarTooltip to bars.tooltip.slots.tooltip to enable the built-in popup.",
      "Custom tooltip roots receive the task, derived progress, inclusive displayEnd, and an anchor ref. BarTooltipRoot, BarTooltipTrigger, and useBarTooltip expose the shared hover state for custom compositions.",
      "Replacing a bar's root replaces the default DraggableBar wrapper, which owns tooltip mounting. A custom bar root must preserve the behavior it needs.",
    ],
    examples: ["bar-tooltip", "bar-tooltip-base-ui"],
    code: `import { GanttBarTooltip, type GanttBarsSlots } from "@art-tools/react-gantt";

const bars: GanttBarsSlots = {
  tooltip: { slots: { tooltip: GanttBarTooltip } },
};

// <Gantt tasks={tasks} bars={bars} />`,
  },
  slots: {
    notes: [
      "slots replaces an element or component. slotProps supplies props directly or through an ownerState callback. The types below describe each component's available slots and state.",
      "mergeSlotProps combines class names and shallow-merges styles, with consumer styles taking precedence. Other props replace internal values, including event handlers, so preserve required behavior when overriding a handler.",
      "On Gantt, customization is grouped under taskList, bars, dependencySlots, and timeline. On the composable path, GanttSlotsProvider receives bars, dependencies, and timeline through value; TaskList receives its slots directly.",
      "The remaining exports below include per-component slot configurations, owner states, and dependency geometry used by those states. Import them as types when annotating custom renderers.",
    ],
    examples: ["slots", "theming-css-modules", "theming-css-variables"],
    code: `import type { GanttBarsSlots } from "@art-tools/react-gantt";

const bars: GanttBarsSlots = {
  taskBar: {
    slotProps: {
      root: { className: "my-task-bar" },
    },
  },
};

// <Gantt tasks={tasks} bars={bars} />`,
  },
};
