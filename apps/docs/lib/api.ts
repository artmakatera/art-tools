export interface ApiSection {
  slug: string;
  title: string;
  description: string;
  symbols: readonly string[];
}

/** Navigation metadata only: usage prose and snippets stay out of client bundles. */
export const API_SECTIONS: readonly ApiSection[] = [
  {
    slug: "gantt",
    title: "Gantt",
    description: "The complete chart: data, layout, callbacks, and accessible labels.",
    symbols: ["Gantt", "GanttProps", "GanttEngineProps", "GanttLabels", "ResolvedGanttLabels"],
  },
  {
    slug: "tasks",
    title: "Tasks & dependencies",
    description: "Task dates, hierarchy, baseline plans, and scheduling links.",
    symbols: ["GanttTask", "Id", "GanttBaseline", "TaskDependency", "TaskDependencyType"],
  },
  {
    slug: "calendar",
    title: "Working time & dates",
    description: "Working hours, date overrides, duration units, and date-input helpers.",
    symbols: [
      "GanttCalendar",
      "DayHours",
      "WorkTimeRange",
      "Weekday",
      "DurationUnit",
      "NonWorkingReason",
      "displayEndDate",
      "endInstantFromDisplayDate",
    ],
  },
  {
    slug: "columns",
    title: "Columns",
    description: "Define task-list cells and extend the built-in column catalogue.",
    symbols: [
      "ColumnDef",
      "ColumnApi",
      "DEFAULT_COLUMNS",
      "READ_ONLY_COLUMNS",
      "ACTION_COLUMN_KEY",
    ],
  },
  {
    slug: "imperative",
    title: "Imperative API",
    description: "Create, update, delete, undo, reveal tasks, and control zoom through a ref.",
    symbols: ["GanttHandle", "TaskPatch", "RevealOptions"],
  },
  {
    slug: "composition",
    title: "Composition",
    description: "Assemble the provider, task list, grid, and lower-level display components.",
    symbols: [
      "GanttProvider",
      "GanttProviderProps",
      "GanttGrid",
      "TaskList",
      "Calendar",
      "CalendarProps",
      "IndexRange",
      "TaskBar",
      "ProjectBar",
      "MilestoneBar",
      "useGanttReadOnly",
    ],
  },
  {
    slug: "timeline",
    title: "Timeline & zoom",
    description: "Scales, zoom levels, date-anchored overlays, and the Marker component.",
    symbols: [
      "Scale",
      "CalendarUnit",
      "ZoomLevel",
      "DEFAULT_ZOOM_LEVELS",
      "DEFAULT_ZOOM_INDEX",
      "GanttTimelineElement",
      "TimelineElementRenderProps",
      "Marker",
      "MarkerProps",
    ],
  },
  {
    slug: "tooltips",
    title: "Bar tooltips",
    description: "Enable the built-in hover tooltip or compose a custom popup.",
    symbols: [
      "GanttBarTooltip",
      "BarTooltipRoot",
      "BarTooltipTrigger",
      "useBarTooltip",
      "BarTooltipProps",
      "BarTooltipContextValue",
    ],
  },
  {
    slug: "slots",
    title: "Slots & owner state",
    description:
      "Component overrides, slot props, and the state exposed to customization callbacks.",
    symbols: [
      "GanttSlotsProvider",
      "useGanttSlots",
      "GanttSlotsValue",
      "GanttTaskListSlots",
      "GanttBarsSlots",
      "GanttDependenciesSlots",
      "GanttTimelineSlots",
      "SlotConfig",
      "SlotPropsInput",
      "mergeSlotProps",
    ],
  },
];

export function getApiSection(slug: string): ApiSection | undefined {
  return API_SECTIONS.find((section) => section.slug === slug);
}

export function apiSectionForSymbol(name: string): ApiSection | undefined {
  const section = API_SECTIONS.find((entry) => entry.symbols.includes(name));
  if (section) {
    return section;
  }
  if (
    /(?:Slots|SlotProps|SlotConfig|OwnerState)$/.test(name) ||
    ["Bounds", "Point", "DependencyLink", "BaselineTooltipProps"].includes(name)
  ) {
    return getApiSection("slots");
  }
  return undefined;
}
