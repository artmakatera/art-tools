import type { GanttBaseline, GanttTask, Id } from "../types";

export const MAX_VISIBLE_BASELINES = 5;
export const BASELINE_LINE_HEIGHT = 3;
export const BASELINE_LANE_GAP = 2;
export const BASELINE_LANE_STRIDE = BASELINE_LINE_HEIGHT + BASELINE_LANE_GAP;
export const BASELINE_STRIP_PADDING = 1;

type BaselineTask = Pick<GanttTask, "baselines" | "type"> & { id?: Id };

const warned = new WeakSet<object>();
const warnedValues = new Set<string>();
const EMPTY_BASELINES: GanttBaseline[] = [];

function warnInvalid(task: BaselineTask, baseline: unknown): void {
  if (!(import.meta as ImportMeta & { env: { DEV: boolean } }).env.DEV) {
    return;
  }
  if (baseline !== null && typeof baseline === "object") {
    if (warned.has(baseline)) {
      return;
    }
    warned.add(baseline);
  } else {
    const key = `${String(task.id)}:${String(baseline)}`;
    if (warnedValues.has(key)) {
      return;
    }
    warnedValues.add(key);
  }
  const id =
    baseline !== null && typeof baseline === "object" && "id" in baseline ? baseline.id : baseline;
  console.warn(`Invalid baseline ${String(id)} on task ${String(task.id)}; skipped.`);
}

/** Only the first five inputs are considered; a sixth never replaces an invalid one. */
export function visibleBaselinesOf(task: BaselineTask): GanttBaseline[] {
  const baselines = task.baselines;
  if (!baselines?.length) {
    return EMPTY_BASELINES;
  }
  const result: GanttBaseline[] = [];
  const ids = new Set<Id>();
  for (const baseline of baselines.slice(0, MAX_VISIBLE_BASELINES)) {
    if (!baseline || typeof baseline !== "object") {
      warnInvalid(task, baseline);
      continue;
    }
    const start = baseline.startDate instanceof Date ? baseline.startDate.getTime() : NaN;
    const end = baseline.endDate instanceof Date ? baseline.endDate.getTime() : NaN;
    const duplicate = ids.has(baseline.id);
    ids.add(baseline.id);
    const invalid =
      (typeof baseline.id !== "string" && typeof baseline.id !== "number") ||
      duplicate ||
      !Number.isFinite(start) ||
      (task.type !== "milestone" && (!Number.isFinite(end) || end <= start));
    if (invalid) {
      warnInvalid(task, baseline);
      continue;
    }
    result.push(baseline);
  }
  return result;
}

export function baselineLaneCount(tasks: readonly BaselineTask[]): number {
  let max = 0;
  for (const task of tasks) {
    max = Math.max(max, visibleBaselinesOf(task).length);
    if (max === MAX_VISIBLE_BASELINES) {
      break;
    }
  }
  return max;
}

export function baselineStripHeight(count: number): number {
  return count > 0
    ? count * BASELINE_LINE_HEIGHT + (count - 1) * BASELINE_LANE_GAP + BASELINE_STRIP_PADDING * 2
    : 0;
}
