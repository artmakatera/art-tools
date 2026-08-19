import { computeTaskPixels } from "../../core/barUtils";
import { TASK_VERTICAL_PADDING } from "../../core/constants";
import type {
  CalendarUnit,
  GanttTask,
  Id,
  TaskDependency,
  TaskDependencyType,
  TaskState,
} from "../../types";

/** Length of the horizontal stub that leaves a bar before the link turns. */
const STUB = 12;

/** Shared "no override" argument, so the base pass allocates nothing per task. */
const EMPTY_STATE: Partial<TaskState> = {};

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
  if (points.length < 2) {
    return points[0] ?? { x: 0, y: 0 };
  }
  const mid = Math.floor((points.length - 1) / 2);
  const a = points[mid]!;
  const b = points[mid + 1]!;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Pixel-space bounds of a single bar: its left/right edges and vertical center.
 *
 * Carries the `task` it was built from so a re-route can rebuild the box against
 * a drag override without a second id → task index (see {@link reRouteOverrides}).
 */
interface Box {
  startX: number;
  endX: number;
  centerY: number;
  task: GanttTask;
}

/** Pixel geometry inputs shared by the base pass and any later re-route. */
interface PixelParams {
  origin: Date;
  colWidth: number;
  rowHeight: number;
  unit: CalendarUnit;
}

/**
 * One task's pixel box at row centre `centerY`.
 *
 * x-coordinates come from {@link computeTaskPixels}, the same source the bars
 * use, so links stay glued to bar edges. Shared by the base pass and the
 * override re-route so the two can never drift apart.
 */
function boxOf(
  task: GanttTask,
  state: Partial<TaskState>,
  centerY: number,
  { origin, colWidth, rowHeight, unit }: PixelParams,
): Box {
  const { left, width } = computeTaskPixels(task, state, origin, colWidth, unit);
  if (task.type === "milestone") {
    // Milestones render as a diamond centered on `left`.
    const half = (rowHeight - TASK_VERTICAL_PADDING * 2) / 2;
    return { startX: left - half, endX: left + half, centerY, task };
  }
  return { startX: left, endX: left + width, centerY, task };
}

/**
 * Build a lookup of every task's pixel bounds. The y-coordinate is derived from
 * the task's row index — the visual order of `tasks` maps 1:1 to grid rows.
 */
function buildBoxes(tasks: GanttTask[], params: PixelParams): Map<Id, Box> {
  const boxes = new Map<Id, Box>();
  const { rowHeight } = params;
  tasks.forEach((task, index) => {
    boxes.set(task.id, boxOf(task, EMPTY_STATE, index * rowHeight + rowHeight / 2, params));
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
  return [s, { x: ox, y: s.y }, { x: ox, y: midY }, { x: ix, y: midY }, { x: ix, y: t.y }, t];
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
      return to.startX >= from.endX + 2 * STUB ? staircase(s, t) : wrap(s, t, 1, 1);
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
      return to.endX <= from.startX - 2 * STUB ? staircase(s, t) : wrap(s, t, -1, -1);
    }
  }
}

export interface DependencyLinkParams extends PixelParams {
  tasks: GanttTask[];
  dependencies: TaskDependency[];
}

/**
 * The base geometry pass, plus the per-task boxes it was built from.
 *
 * Keeping the boxes is what makes a drag cheap: {@link reRouteOverrides} rebuilds
 * only the handful of links touching the dragged task instead of re-deriving all
 * of them (at 100k tasks / 84k links the full pass is ~100ms — far too slow to
 * repeat on every mousemove).
 */
export interface LinkGeometry {
  links: DependencyLink[];
  boxes: Map<Id, Box>;
  /**
   * Indices into `links` of every link touching a task, keyed by `String(id)` so
   * it can be queried straight from an overrides object's keys. Built on first
   * use — a chart that is never dragged never pays for it.
   */
  linksTouching(key: string): number[] | undefined;
}

/**
 * Compute the polyline geometry for every dependency, at each task's committed
 * position. Dependencies whose endpoints are not present in `tasks` are skipped.
 *
 * `lag` is intentionally not drawn: the gap it implies is already baked into
 * each task's scheduled dates, and therefore into the bar edges we connect.
 */
export function computeLinkGeometry({
  tasks,
  dependencies,
  ...params
}: DependencyLinkParams): LinkGeometry {
  const boxes = buildBoxes(tasks, params);
  const links: DependencyLink[] = [];

  for (const dep of dependencies) {
    const from = boxes.get(dep.from);
    const to = boxes.get(dep.to);
    if (!from || !to) {
      continue;
    }
    links.push(linkOf(dep, from, to));
  }

  // Lazy, and owned by this result: the index is only worth building once a drag
  // starts re-routing, and it stays valid for exactly as long as `links` does.
  let byTask: Map<string, number[]> | null = null;
  return {
    links,
    boxes,
    linksTouching(key) {
      byTask ??= buildTouchIndex(links);
      return byTask.get(key);
    },
  };
}

/** One link between two known boxes. Bounds are baked in for viewport culling. */
function linkOf(dep: TaskDependency, from: Box, to: Box): DependencyLink {
  // Bounds are computed here, not at render time: the renderer culls on every
  // scroll frame, and the geometry it culls against only changes when the
  // geometry itself is rebuilt.
  const points = routeLink(dep.type, from, to);
  return { id: `${dep.from}->${dep.to}`, type: dep.type, points, bounds: linkBounds(points), dep };
}

/** task key → indices of the links that start or end at it. */
function buildTouchIndex(links: DependencyLink[]): Map<string, number[]> {
  const index = new Map<string, number[]>();
  const add = (key: string, i: number): void => {
    const list = index.get(key);
    if (list) {
      list.push(i);
    } else {
      index.set(key, [i]);
    }
  };
  links.forEach((link, i) => {
    add(String(link.dep.from), i);
    add(String(link.dep.to), i);
  });
  return index;
}

/**
 * Re-route only the links touching a task with a live drag override, reusing
 * every other link object from `base` untouched.
 *
 * This runs on every mousemove of a bar drag, so the work is bounded by the
 * dragged task's own edges, not the link count. Overrides are keyed by
 * `String(id)` because they arrive as an object literal, where a numeric `Id`
 * has already been stringified.
 */
export function reRouteOverrides(
  base: LinkGeometry,
  overrides: Record<string, Partial<TaskState>>,
  params: PixelParams,
): DependencyLink[] {
  const keys = Object.keys(overrides);
  if (keys.length === 0) {
    return base.links;
  }
  const patched = new Map<Id, Box>();

  // Rebuild an overridden task's box on demand, keyed by its real `Id` — a drag
  // moves the bar horizontally only, so the row centre carries over.
  const boxFor = (id: Id): Box | undefined => {
    const box = base.boxes.get(id);
    const override = box && overrides[String(id)];
    if (!box || !override) {
      return box;
    }
    let next = patched.get(id);
    if (!next) {
      next = boxOf(box.task, override, box.centerY, params);
      patched.set(id, next);
    }
    return next;
  };

  let next: DependencyLink[] | null = null;
  for (const key of keys) {
    for (const i of base.linksTouching(key) ?? []) {
      const { dep } = base.links[i]!;
      const from = boxFor(dep.from);
      const to = boxFor(dep.to);
      if (!from || !to) {
        continue;
      }
      next ??= base.links.slice();
      next[i] = linkOf(dep, from, to);
    }
  }
  return next ?? base.links;
}
