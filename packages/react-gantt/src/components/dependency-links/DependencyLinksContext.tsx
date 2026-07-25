import { createContext, useContext, useMemo, type ReactNode } from "react";
import type {
  CalendarUnit,
  GanttTask,
  TaskDependency,
  TaskState,
} from "../../types";
import { computeDependencyLinks, type DependencyLink } from "./geometry";

const DependencyLinksContext = createContext<DependencyLink[] | null>(null);

interface DependencyLinksProviderProps {
  tasks: GanttTask[];
  dependencies: TaskDependency[];
  origin: Date;
  colWidth: number;
  rowHeight: number;
  snapToDay: boolean;
  unit: CalendarUnit;
  children: ReactNode;
  overrides: Record<string, Partial<TaskState>>;
}

/**
 * Computes dependency-link geometry once and exposes it to descendants. Keeping
 * the links in context lets the renderer (and any future consumers, e.g.
 * hover-highlighting) read them without re-deriving the geometry.
 */
export function DependencyLinksProvider({
  tasks,
  dependencies,
  origin,
  colWidth,
  rowHeight,
  snapToDay,
  unit,
  children,
  overrides,
}: DependencyLinksProviderProps) {
  const links = useMemo(
    () =>
      computeDependencyLinks({
        tasks,
        dependencies,
        origin,
        colWidth,
        rowHeight,
        snapToDay,
        unit,
        overrides,
      }),
    [tasks, dependencies, origin, colWidth, rowHeight, snapToDay, unit, overrides],
  );

  return (
    <DependencyLinksContext.Provider value={links}>
      {children}
    </DependencyLinksContext.Provider>
  );
}

/** Read the computed dependency links from context. */
export function useDependencyLinks(): DependencyLink[] {
  const links = useContext(DependencyLinksContext);
  if (links === null) {
    throw new Error(
      "useDependencyLinks must be used within a <DependencyLinksProvider>",
    );
  }
  return links;
}
