import { computeTaskPixels } from "../../core/barUtils";
import { TASK_VERTICAL_PADDING } from "../../core/constants";
import type { CalendarUnit, GanttTask, Id, TaskDependency, TaskDependencyType, TaskState } from "../../types";

/** Length of the horizontal stub that leaves a bar before the link turns. */
const STUB = 12;

/** Shared so a chart without dependencies keeps a stable links identity. */
const EMPTY_LINKS: DependencyLink[] = [];

export interface Point {
  x: number;
  y: number;
}

export interface DependencyLink {
  /** Stable key, e.g. `"1->2"`. */
  id: string;
  type: TaskDependencyType;
  /** Orthogonal polyline from the source edge to the target edge. */
  points: Point[];
  /** Bounding box of {@link DependencyLink.points}, precomputed for culling. */
  bounds: Bounds;
  /** The original dependency for callbacks. */
  dep: TaskDependency;
}

/** Axis-aligned pixel bounds. */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Bounding box of a polyline, for viewport culling. */
export function linkBounds(points: Point[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) {
      minX = p.x;
    }
    if (p.x > maxX) {
      maxX = p.x;
    }
    if (p.y < minY) {
      minY = p.y;
    }
    if (p.y > maxY) {
      maxY = p.y;
    }
  }
  return { minX, minY, maxX, maxY };
}

/** Midpoint of the middle segment of a polyline. */
export function midpoint(points: Point[]): Point {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0 };
  const mid = Math.floor((points.length - 1) / 2);
  const a = points[mid]!;
  const b = points[mid + 1]!;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Pixel-space bounds of a single bar: its left/right edges and vertical center. */
interface Box {
  startX: number;
  endX: number;
  centerY: number;
}

/** Maps a task to its horizontal pixel span; captures origin/colWidth/unit. */
type PixelFn = (task: GanttTask) => { left: number; width: number };

/**
 * Build a lookup of every task's pixel bounds.
 *
 * x-coordinates come from `toPixels` (backed by {@link computeTaskPixels}, the
 * same source the bars use, so links stay glued to bar edges). The y-coordinate
 * is derived from the task's row index — the visual order of `tasks` maps 1:1
 * to grid rows.
 */
function buildBoxes(
  tasks: GanttTask[],
  rowHeight: number,
  toPixels: PixelFn,
  /** Only these tasks get a box; the rest can never be an endpoint. */
  wanted: Set<Id>,
): Map<Id, Box> {
  const boxes = new Map<Id, Box>();
  const half = (rowHeight - TASK_VERTICAL_PADDING * 2) / 2;

  tasks.forEach((task, index) => {
    if (!wanted.has(task.id)) {
      return;
    }
    const { left, width } = toPixels(task);
    const centerY = index * rowHeight + rowHeight / 2;

    if (task.type === "milestone") {
      // Milestones render as a diamond centered on `left`.
      boxes.set(task.id, { startX: left - half, endX: left + half, centerY });
    } else {
      boxes.set(task.id, { startX: left, endX: left + width, centerY });
    }
  });

  return boxes;
}

/**
 * "Staircase" route: source edge points toward the target, so a single vertical
 * mid-segment connects the two horizontal runs. Used when the target edge sits
 * far enough ahead in the travel direction; otherwise we wrap (see `wrap`).
 */
function staircase(s: Point, t: Point): Point[] {
  const midX = (s.x + t.x) / 2;
  return [s, { x: midX, y: s.y }, { x: midX, y: t.y }, t];
}

/**
 * "Wrap" route for when the target edge is behind the source's exit direction:
 * exit by a stub, drop to the mid-row, run across, then approach the target.
 */
function wrap(s: Point, t: Point, sDir: number, tDir: number): Point[] {
  const ox = s.x + sDir * STUB; // source stub end
  const ix = t.x - tDir * STUB; // target stub start
  const midY = (s.y + t.y) / 2;
  return [
    s,
    { x: ox, y: s.y },
    { x: ox, y: midY },
    { x: ix, y: midY },
    { x: ix, y: t.y },
    t,
  ];
}

/**
 * "L" route for same-edge relationships (SS / FF): exit horizontally just past
 * the outermost of the two edges, drop straight to the target's row, then run
 * back in to the target edge. No backtracking past the bar.
 */
function lShape(s: Point, t: Point, xv: number): Point[] {
  return [s, { x: xv, y: s.y }, { x: xv, y: t.y }, t];
}

/** Build the polyline for one dependency from the two bars' pixel bounds. */
function routeLink(type: TaskDependencyType, from: Box, to: Box): Point[] {
  const sy = from.centerY;
  const ty = to.centerY;

  switch (type) {
    case "FS": {
      // finish → start: exit the source's right edge, enter the target's left.
      const s: Point = { x: from.endX, y: sy };
      const t: Point = { x: to.startX, y: ty };
      return to.startX >= from.endX + 2 * STUB
        ? staircase(s, t)
        : wrap(s, t, 1, 1);
    }
    case "SS": {
      // start ⇉ start: both exit left; drop at the leftmost edge, run in right.
      const s: Point = { x: from.startX, y: sy };
      const t: Point = { x: to.startX, y: ty };
      return lShape(s, t, Math.min(from.startX, to.startX) - STUB);
    }
    case "FF": {
      // finish ⇄ finish: both exit right; drop at the rightmost edge, run in left.
      const s: Point = { x: from.endX, y: sy };
      const t: Point = { x: to.endX, y: ty };
      return lShape(s, t, Math.max(from.endX, to.endX) + STUB);
    }
    case "SF": {
      // start → finish: exit the source's left edge, enter the target's right.
      const s: Point = { x: from.startX, y: sy };
      const t: Point = { x: to.endX, y: ty };
      return to.endX <= from.startX - 2 * STUB
        ? staircase(s, t)
        : wrap(s, t, -1, -1);
    }
  }
}

export interface DependencyLinkParams {
  tasks: GanttTask[];
  dependencies: TaskDependency[];
  origin: Date;
  colWidth: number;
  rowHeight: number;
  unit: CalendarUnit;
  overrides: Record<string, Partial<TaskState>>;
}

/**
 * Compute the polyline geometry for every dependency. Dependencies whose
 * endpoints are not present in `tasks` are skipped.
 *
 * `lag` is intentionally not drawn: the gap it implies is already baked into
 * each task's scheduled dates, and therefore into the bar edges we connect.
 */
export function computeDependencyLinks({
  tasks,
  dependencies,
  origin,
  colWidth,
  rowHeight,
  unit,
  overrides
}: DependencyLinkParams): DependencyLink[] {
  // Only endpoints need geometry. This used to price every visible task, so a
  // 10k-row chart with no dependencies at all still paid 10k pixel conversions
  // on every edit.
  if (dependencies.length === 0) {
    return EMPTY_LINKS;
  }
  const endpoints = new Set<Id>();
  for (const dep of dependencies) {
    endpoints.add(dep.from);
    endpoints.add(dep.to);
  }

  const boxes = buildBoxes(
    tasks,
    rowHeight,
    (task) => computeTaskPixels(task, overrides[task.id] || {}, origin, colWidth, unit),
    endpoints,
  );
  const links: DependencyLink[] = [];

  for (const dep of dependencies) {
    const from = boxes.get(dep.from);
    const to = boxes.get(dep.to);
    if (!from || !to) continue;

    // Bounds are computed here, not at render time: the renderer culls on every
    // scroll frame, and the geometry it culls against only changes when this
    // memo re-runs.
    const points = routeLink(dep.type, from, to);
    links.push({
      id: `${dep.from}->${dep.to}`,
      type: dep.type,
      points,
      bounds: linkBounds(points),
      dep,
    });
  }

  return links;
}
