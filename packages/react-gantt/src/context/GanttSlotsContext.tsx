import { createContext, useContext, type ReactNode } from "react";
import type { TreeCellSlotConfig } from "../components/taskList/TreeCell";
import type { TaskListHeaderSlotConfig } from "../components/taskList/TaskListHeader";
import type { TaskBarSlotConfig } from "../components/bars/taskBar/TaskBar";
import type { ProjectBarSlotConfig } from "../components/bars/projectBar/ProjectBar";
import type { MilestoneBarSlotConfig } from "../components/bars/milestoneBar/MilestoneBar";
import type { BarProgressSlotConfig } from "../components/bars/progress/BarProgress";
import type { BarProgressResizeHandleSlotConfig } from "../components/bars/progress/BarProgressResizeHandle";
import type { TaskResizerSlotConfig } from "../components/bars/taskBar/TaskResizer";
import type { ConnectorHandlesSlotConfig } from "../components/bars/common/ConnectorHandles";
import type { BarTooltipSlotConfig } from "../components/bars/common/BarTooltip";
import type { DependencyLinksSlotConfig } from "../components/dependency-links/DependencyLinks";
import type { DependencyPreviewSlotConfig } from "../components/dependency-links/DependencyPreview";
import type { CalendarRowSlotConfig } from "../components/calendar/CalendarRow";
import type { GridColumnsSlotConfig } from "../components/grid/GridColumns";
import type { GridSlotConfig } from "../components/grid/Grid";
import type { GridResizeHandleSlotConfig } from "../components/grid/GridResizeHandle";

/** Slots for the task-list pane. Delivered by prop-drilling (see `<Gantt taskList>`). */
export interface GanttTaskListSlots {
  treeCell?: TreeCellSlotConfig;
  header?: TaskListHeaderSlotConfig;
}

/** Slots for the timeline bars and their handles. Delivered via context. */
export interface GanttBarsSlots {
  taskBar?: TaskBarSlotConfig;
  projectBar?: ProjectBarSlotConfig;
  milestoneBar?: MilestoneBarSlotConfig;
  barProgress?: BarProgressSlotConfig;
  barProgressResizeHandle?: BarProgressResizeHandleSlotConfig;
  taskResizer?: TaskResizerSlotConfig;
  connectorHandles?: ConnectorHandlesSlotConfig;
  /**
   * One slot for all three bar types, rendered by `Row` — which already tracks
   * hover and holds the task. Empty by default: no tooltip is rendered and the
   * bar keeps its native `title` (ADR-022).
   */
  tooltip?: BarTooltipSlotConfig;
}

/** Slots for dependency links. Delivered via context. */
export interface GanttDependenciesSlots {
  links?: DependencyLinksSlotConfig;
  preview?: DependencyPreviewSlotConfig;
}

/** Slots for the calendar/grid timeline chrome. Delivered via context. */
export interface GanttTimelineSlots {
  calendarRow?: CalendarRowSlotConfig;
  gridColumn?: GridColumnsSlotConfig;
  grid?: GridSlotConfig;
  gridResizeHandle?: GridResizeHandleSlotConfig;
}

/**
 * The grid-side slot groups delivered through context (bars/dependencies/
 * timeline). The `taskList` group is prop-drilled separately and is NOT here.
 */
export interface GanttSlotsValue {
  bars?: GanttBarsSlots;
  dependencies?: GanttDependenciesSlots;
  timeline?: GanttTimelineSlots;
}

// Default is an empty object so components reading their slice work fine when
// rendered outside a provider (e.g. in isolation tests) — the hook never throws.
const GanttSlotsContext = createContext<GanttSlotsValue>({});

export function GanttSlotsProvider({
  value,
  children,
}: {
  value: GanttSlotsValue;
  children: ReactNode;
}) {
  return <GanttSlotsContext.Provider value={value}>{children}</GanttSlotsContext.Provider>;
}

/** Read the grid-side slot groups. Returns `{}` outside a provider. */
export function useGanttSlots(): GanttSlotsValue {
  return useContext(GanttSlotsContext);
}
