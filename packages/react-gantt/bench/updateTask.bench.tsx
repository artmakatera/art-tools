import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { bench, describe } from "vitest";
import { Gantt } from "../src/Gantt";
import type { GanttHandle, GanttTask } from "../src/types";

// jsdom never lays anything out, so virtualization would render a single
// overscan window and hide the real per-row cost. Pin a viewport instead.
Object.defineProperty(HTMLElement.prototype, "clientHeight", { value: 600, configurable: true });
Object.defineProperty(HTMLElement.prototype, "clientWidth", { value: 1200, configurable: true });

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DAY_MS = 86_400_000;
const PROJECT_START = new Date(2026, 0, 1).getTime();

/**
 * A tree, not a flat list: one summary per 10 leaves, so the parent roll-up and
 * the grouping pass are actually exercised. Tasks overlap in a ~2-year window
 * rather than marching forward a fixed step, which keeps the column count
 * realistic instead of letting it scale with the task count.
 */
function generateTree(count: number): GanttTask[] {
  const tasks: GanttTask[] = [];
  const groups = Math.ceil(count / 10);
  for (let g = 0; g < groups; g++) {
    const parentId = `g${g}`;
    tasks.push({
      id: parentId,
      name: `Group ${g + 1}`,
      type: "summary",
      startDate: new Date(PROJECT_START),
      endDate: new Date(PROJECT_START + DAY_MS),
    });
    for (let i = 0; i < 10 && g * 10 + i < count; i++) {
      const index = g * 10 + i;
      const start = new Date(PROJECT_START + (index % 700) * DAY_MS);
      tasks.push({
        id: String(index),
        name: `Task ${index + 1}`,
        parentId,
        startDate: start,
        endDate: new Date(start.getTime() + DAY_MS * 5),
        progress: index % 100,
      });
    }
  }
  return tasks;
}

interface Mounted {
  root: Root;
  api: GanttHandle;
  ids: string[];
  /**
   * Live progress per task. `updateTask` bails out when a patch changes
   * nothing, so writing a value derived from the loop counter would silently
   * degrade into no-ops as soon as the loop laps the fixture — tracking the
   * current value keeps every iteration a real edit.
   */
  progress: Map<string, number>;
}

function mount(count: number): Mounted {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const apiRef = createRef<GanttHandle>();
  const tasks = generateTree(count);
  const root = createRoot(container);
  act(() => {
    root.render(<Gantt tasks={tasks} height={600} apiRef={apiRef} />);
  });
  const leaves = tasks.filter((t) => t.parentId != null);
  return {
    root,
    api: apiRef.current!,
    ids: leaves.map((t) => t.id),
    progress: new Map(leaves.map((t) => [t.id, t.progress ?? 0])),
  };
}

/** The next progress value for `id` — always different from the current one. */
function nextProgress(mounted: Mounted, id: string): number {
  const next = ((mounted.progress.get(id) ?? 0) + 1) % 100;
  mounted.progress.set(id, next);
  return next;
}

for (const size of [100, 1_000, 10_000]) {
  describe(`updateTask — ${size} tasks`, () => {
    let mounted: Mounted;
    let cursor = 0;

    bench(
      "no-op update (bails before setState — harness floor)",
      () => {
        const id = mounted.ids[cursor++ % mounted.ids.length]!;
        act(() => {
          mounted.api.updateTask(id, { progress: mounted.progress.get(id)! });
        });
      },
      {
        setup: () => {
          mounted = mount(size);
          cursor = 0;
        },
        teardown: () => {
          act(() => mounted.root.unmount());
        },
      },
    );

    bench(
      "progress only (no reschedule, no date change)",
      () => {
        const id = mounted.ids[cursor++ % mounted.ids.length]!;
        act(() => {
          mounted.api.updateTask(id, { progress: nextProgress(mounted, id) });
        });
      },
      {
        setup: () => {
          mounted = mount(size);
          cursor = 0;
        },
        teardown: () => {
          act(() => mounted.root.unmount());
        },
      },
    );

    bench(
      "move dates (re-derives the timeline)",
      () => {
        const id = mounted.ids[cursor++ % mounted.ids.length]!;
        // Walks the whole window rather than cycling with the id, so a task is
        // never handed back the dates it already has.
        const start = new Date(PROJECT_START + (cursor % 697) * DAY_MS);
        act(() => {
          mounted.api.updateTask(id, {
            startDate: start,
            endDate: new Date(start.getTime() + DAY_MS * 5),
          });
        });
      },
      {
        setup: () => {
          mounted = mount(size);
          cursor = 0;
        },
        teardown: () => {
          act(() => mounted.root.unmount());
        },
      },
    );
  });
}
