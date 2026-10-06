import { createContext } from "react";
import type { GanttTimelineElement } from "../types";

// Element updates must not invalidate the task rows through shared config.
export const EMPTY_TIMELINE_ELEMENTS: readonly GanttTimelineElement[] = [];
export const TimelineElementsContext =
  createContext<readonly GanttTimelineElement[]>(EMPTY_TIMELINE_ELEMENTS);
