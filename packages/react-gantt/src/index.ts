import "./index.css";
export { Gantt } from "./Gantt";
export { GanttProvider } from "./context/GanttProvider";
// `GanttProvider` was exported without its props type, so a consumer on the
// composable path could not name what it takes.
export type { GanttEngineProps, GanttProviderProps } from "./types";
export { useGanttReadOnly } from "./context/contexts";
export { GanttGrid } from "./components/grid/Grid";
export { TaskList } from "./components/taskList/TaskList";
// The built-in column catalogue. Exported so it can be *extended* rather than
// only replaced — `columns` overrides the whole set, so without these a consumer
// wanting one extra column had to reimplement all five.
export {
  ACTION_COLUMN_KEY,
  DEFAULT_COLUMNS,
  READ_ONLY_COLUMNS,
} from "./components/taskList/defaultColumns";
export { TaskBar } from "./components/bars/taskBar/TaskBar";
export { ProjectBar } from "./components/bars/projectBar/ProjectBar";
export { MilestoneBar } from "./components/bars/milestoneBar/MilestoneBar";
export {
  BarTooltipRoot,
  BarTooltipTrigger,
  GanttBarTooltip,
  useBarTooltip,
} from "./components/bars/barTooltip";
export { Calendar } from "./components/calendar/Calendar";
// `Calendar` requires a virtualization window, whose type was not exported — so
// the exported component was literally impossible to type a call to.
export type { CalendarProps } from "./components/calendar/Calendar";
export type { IndexRange } from "./core/virtualize";
export { mergeSlotProps } from "./core/slots";
export type { SlotConfig, SlotPropsInput } from "./core/slots";

// --- Zoom ---
export { DEFAULT_ZOOM_LEVELS, DEFAULT_ZOOM_INDEX } from "./core/zoom";
export type { ZoomLevel } from "./core/zoom";

// --- Reveal ---
export type { RevealOptions } from "./hooks/useRevealTask";

// --- Slot config groups (the shapes of the <Gantt> taskList/bars/dependencySlots/timeline props) ---
//
// The provider is exported because `<Gantt>` is otherwise the only thing that can
// mount it — which left the composable `<GanttProvider>` path unable to supply
// the bars / dependencySlots / timeline groups at all, since those three reach
// their components through this context rather than through props.
export { GanttSlotsProvider, useGanttSlots } from "./context/GanttSlotsContext";
export type {
  GanttTaskListSlots,
  GanttBarsSlots,
  GanttDependenciesSlots,
  GanttTimelineSlots,
  GanttSlotsValue,
} from "./context/GanttSlotsContext";

// --- Per-component slot types ---
export type {
  TreeCellSlots,
  TreeCellSlotProps,
  TreeCellSlotConfig,
  TreeCellOwnerState,
} from "./components/taskList/TreeCell";
export type {
  TaskListHeaderSlots,
  TaskListHeaderSlotProps,
  TaskListHeaderSlotConfig,
  TaskListHeaderOwnerState,
  TaskListHeaderCellOwnerState,
} from "./components/taskList/TaskListHeader";
export type {
  TaskBarSlots,
  TaskBarSlotProps,
  TaskBarSlotConfig,
  TaskBarOwnerState,
} from "./components/bars/taskBar/TaskBar";
export type {
  ProjectBarSlots,
  ProjectBarSlotProps,
  ProjectBarSlotConfig,
  ProjectBarOwnerState,
} from "./components/bars/projectBar/ProjectBar";
export type {
  MilestoneBarSlots,
  MilestoneBarSlotProps,
  MilestoneBarSlotConfig,
  MilestoneBarOwnerState,
} from "./components/bars/milestoneBar/MilestoneBar";
export type {
  BarProgressSlots,
  BarProgressSlotProps,
  BarProgressSlotConfig,
  BarProgressOwnerState,
} from "./components/bars/progress/BarProgress";
export type {
  BarProgressResizeHandleSlots,
  BarProgressResizeHandleSlotProps,
  BarProgressResizeHandleSlotConfig,
  BarProgressResizeHandleOwnerState,
} from "./components/bars/progress/BarProgressResizeHandle";
export type {
  TaskResizerSlots,
  TaskResizerSlotProps,
  TaskResizerSlotConfig,
  TaskResizerOwnerState,
} from "./components/bars/taskBar/TaskResizer";
export type {
  ConnectorHandlesSlots,
  ConnectorHandlesSlotProps,
  ConnectorHandlesSlotConfig,
  ConnectorHandlesOwnerState,
} from "./components/bars/common/ConnectorHandles";
export type {
  BarTooltipSlots,
  BarTooltipSlotProps,
  BarTooltipSlotConfig,
  BarTooltipOwnerState,
  BarTooltipProps,
  BarTooltipContextValue,
} from "./components/bars/barTooltip";
export type {
  DependencyLinksSlots,
  DependencyLinksSlotProps,
  DependencyLinksSlotConfig,
  // These five were exported from their own module but never re-exported here, so
  // the function form of the links' slotProps had no nameable ownerState.
  DependencyLinksLayerOwnerState,
  DependencyLinkOwnerState,
  DependencySegmentOwnerState,
  DependencyLagLabelOwnerState,
  DependencyDeleteButtonOwnerState,
} from "./components/dependency-links/DependencyLinks";
// Reachable from those ownerStates, so they must be nameable too.
export type { Bounds, DependencyLink, Point } from "./components/dependency-links/geometry";
export type {
  DependencyPreviewSlots,
  DependencyPreviewSlotProps,
  DependencyPreviewSlotConfig,
  DependencyPreviewOwnerState,
} from "./components/dependency-links/DependencyPreview";
export type {
  CalendarRowSlots,
  CalendarRowSlotProps,
  CalendarRowSlotConfig,
  CalendarRowOwnerState,
  CalendarCellOwnerState,
} from "./components/calendar/CalendarRow";
export type {
  GridColumnsSlots,
  GridColumnsSlotProps,
  GridColumnsSlotConfig,
  GridColumnOwnerState,
} from "./components/grid/GridColumns";
export type {
  GridSlots,
  GridSlotProps,
  GridSlotConfig,
  GridOwnerState,
} from "./components/grid/Grid";
export type {
  GridResizeHandleSlots,
  GridResizeHandleSlotProps,
  GridResizeHandleSlotConfig,
  GridResizeHandleOwnerState,
} from "./components/grid/GridResizeHandle";

export type {
  GanttProps,
  GanttHandle,
  GanttTask,
  TaskPatch,
  Id,
  TaskDependency,
  TaskDependencyType,
  ColumnDef,
  ColumnApi,
  GanttLabels,
  ResolvedGanttLabels,
} from "./types";

// Working-time calendar (see docs/adr/).
export type { GanttCalendar, DayHours, WorkTimeRange, Weekday, DurationUnit } from "./types";

// `Scale` and `CalendarUnit` were referenced by `GanttProps.scales` but never
// exported, so a consumer could not name that prop's type.
export type { Scale, CalendarUnit } from "./types";

/**
 * Convert between the stored EXCLUSIVE end instant and the inclusive last day a
 * user expects to see or pick. Needed by any consumer bridging a task to a
 * `<input type="date">` end-date editor.
 */
export { displayEndDate, endInstantFromDisplayDate } from "./core/taskDates";

/** Why a timeline column is shaded, surfaced on the grid/calendar ownerStates. */
export type { NonWorkingReason } from "./core/workingTime";
