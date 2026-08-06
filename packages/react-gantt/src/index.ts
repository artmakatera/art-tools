import './index.css';
export { Gantt } from './Gantt';
export { GanttProvider } from './context/GanttContext';
export { GanttGrid } from './components/grid/Grid';
export { TaskList } from './components/taskList/TaskList';
export { TaskBar } from './components/bars/taskBar/TaskBar';
export { ProjectBar } from './components/bars/projectBar/ProjectBar';
export { MilestoneBar } from './components/bars/milestoneBar/MilestoneBar';
export { Calendar } from './components/calendar/Calendar';
export { mergeSlotProps } from './core/slots';
export type { SlotConfig, SlotPropsInput } from './core/slots';

// --- Zoom ---
export { DEFAULT_ZOOM_LEVELS, DEFAULT_ZOOM_INDEX } from './core/zoom';
export type { ZoomLevel } from './core/zoom';

// --- Slot config groups (the shapes of the <Gantt> taskList/bars/dependencySlots/timeline props) ---
export type {
  GanttTaskListSlots,
  GanttBarsSlots,
  GanttDependenciesSlots,
  GanttTimelineSlots,
  GanttSlotsValue,
} from './context/GanttSlotsContext';

// --- Per-component slot types ---
export type {
  TreeCellSlots,
  TreeCellSlotProps,
  TreeCellSlotConfig,
  TreeCellOwnerState,
} from './components/taskList/TreeCell';
export type {
  TaskListHeaderSlots,
  TaskListHeaderSlotProps,
  TaskListHeaderSlotConfig,
  TaskListHeaderOwnerState,
  TaskListHeaderCellOwnerState,
} from './components/taskList/TaskListHeader';
export type {
  TaskBarSlots,
  TaskBarSlotProps,
  TaskBarSlotConfig,
  TaskBarOwnerState,
} from './components/bars/taskBar/TaskBar';
export type {
  ProjectBarSlots,
  ProjectBarSlotProps,
  ProjectBarSlotConfig,
  ProjectBarOwnerState,
} from './components/bars/projectBar/ProjectBar';
export type {
  MilestoneBarSlots,
  MilestoneBarSlotProps,
  MilestoneBarSlotConfig,
  MilestoneBarOwnerState,
} from './components/bars/milestoneBar/MilestoneBar';
export type {
  BarProgressSlots,
  BarProgressSlotProps,
  BarProgressSlotConfig,
  BarProgressOwnerState,
} from './components/bars/progress/BarProgress';
export type {
  BarProgressResizeHandleSlots,
  BarProgressResizeHandleSlotProps,
  BarProgressResizeHandleSlotConfig,
  BarProgressResizeHandleOwnerState,
} from './components/bars/progress/BarProgressResizeHandle';
export type {
  TaskResizerSlots,
  TaskResizerSlotProps,
  TaskResizerSlotConfig,
  TaskResizerOwnerState,
} from './components/bars/taskBar/TaskResizer';
export type {
  ConnectorHandlesSlots,
  ConnectorHandlesSlotProps,
  ConnectorHandlesSlotConfig,
  ConnectorHandlesOwnerState,
} from './components/bars/common/ConnectorHandles';
export type {
  DependencyLinksSlots,
  DependencyLinksSlotProps,
  DependencyLinksSlotConfig,
} from './components/dependency-links/DependencyLinks';
export type {
  DependencyPreviewSlots,
  DependencyPreviewSlotProps,
  DependencyPreviewSlotConfig,
  DependencyPreviewOwnerState,
} from './components/dependency-links/DependencyPreview';
export type {
  CalendarRowSlots,
  CalendarRowSlotProps,
  CalendarRowSlotConfig,
  CalendarRowOwnerState,
  CalendarCellOwnerState,
} from './components/calendar/CalendarRow';
export type {
  GridColumnsSlots,
  GridColumnsSlotProps,
  GridColumnsSlotConfig,
  GridColumnOwnerState,
} from './components/grid/GridColumns';
export type {
  GridSlots,
  GridSlotProps,
  GridSlotConfig,
  GridOwnerState,
} from './components/grid/Grid';
export type {
  GridResizeHandleSlots,
  GridResizeHandleSlotProps,
  GridResizeHandleSlotConfig,
  GridResizeHandleOwnerState,
} from './components/grid/GridResizeHandle';

export type { GanttProps, GanttHandle, GanttTask, TaskPatch, Id, TaskDependency, TaskDependencyType, ColumnDef } from './types';

// --- Keyboard & accessibility ---
// The focus cursor's shape, exported so `ConnectorHandlesOwnerState` and other
// slot owner states are fully nameable by consumers.
export type { GanttPane, GanttFocusSlot, GanttFocusTarget } from './types';
export type { ConnectorHandle } from './hooks/useDependencyDrag';
