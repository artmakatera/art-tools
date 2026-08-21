import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CalendarUnit, GanttTask, TaskDependency, TaskState } from "../../types";
import { computeLinkGeometry, reRouteOverrides, type DependencyLink } from "./geometry";

const DependencyLinksContext = createContext<DependencyLink[] | null>(null);

interface DependencyLinksProviderProps {
  tasks: GanttTask[];
  dependencies: TaskDependency[];
  origin: Date;
  colWidth: number;
  rowHeight: number;
  unit: CalendarUnit;
  children: ReactNode;
  overrides: Record<string, Partial<TaskState>>;
}

/**
 * Computes dependency-link geometry once and exposes it to descendants. Keeping
 * the links in context lets the renderer (and any future consumers, e.g.
 * hover-highlighting) read them without re-deriving the geometry.
 *
 * Split in two on purpose. `overrides` churns on every mousemove of a bar drag,
 * while everything the base pass reads is stable for the whole gesture — so the
 * expensive pass (every task's box, every link's route) is kept off the drag
 * path, and each frame only re-routes the links touching the dragged bar.
 */
export function DependencyLinksProvider({
  tasks,
  dependencies,
  origin,
  colWidth,
  rowHeight,
  unit,
  children,
  overrides,
}: DependencyLinksProviderProps) {
  const base = useMemo(
    () => computeLinkGeometry({ tasks, dependencies, origin, colWidth, rowHeight, unit }),
    [tasks, dependencies, origin, colWidth, rowHeight, unit],
  );

  const links = useMemo(
    () => reRouteOverrides(base, overrides, { origin, colWidth, rowHeight, unit }),
    [base, overrides, origin, colWidth, rowHeight, unit],
  );

  return (
    <DependencyLinksContext.Provider value={links}>{children}</DependencyLinksContext.Provider>
  );
}

/** Read the computed dependency links from context. */
export function useDependencyLinks(): DependencyLink[] {
  const links = useContext(DependencyLinksContext);
  if (links === null) {
    throw new Error("useDependencyLinks must be used within a <DependencyLinksProvider>");
  }
  return links;
}
