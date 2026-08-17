import { act, createRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { bench, describe } from "vitest";
import { GanttProvider } from "../src/context/GanttContext";
import { GanttGrid } from "../src/components/grid/Grid";
import { TaskList } from "../src/components/taskList/TaskList";
import { DEFAULT_COLUMNS } from "../src/components/taskList/TaskListHeader";
import type { GanttHandle, GanttTask } from "../src/types";

Object.defineProperty(HTMLElement.prototype, "clientHeight", { value: 600, configurable: true });
Object.defineProperty(HTMLElement.prototype, "clientWidth", { value: 1200, configurable: true });

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DAY_MS = 86_400_000;
const PROJECT_START = new Date(2026, 0, 1).getTime();
const SIZE = Number(process.env.BENCH_SIZE ?? 1_000);

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

const TASKS = generateTree(SIZE);
const LEAVES = TASKS.filter((t) => t.parentId != null);
const IDS = LEAVES.map((t) => t.id);

interface Mounted {
  root: Root;
  api: GanttHandle;
  /**
   * Live progress per task. `updateTask` bails out when a patch changes
   * nothing, so a value derived from the loop counter would silently degrade
   * into no-ops once the loop laps the fixture.
   */
  progress: Map<string, number>;
}

function mount(children: ReactNode): Mounted {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const apiRef = createRef<GanttHandle>();
  const root = createRoot(container);
  act(() => {
    root.render(
      <GanttProvider tasks={TASKS} height={600} apiRef={apiRef}>
        {children}
      </GanttProvider>,
    );
  });
  return {
    root,
    api: apiRef.current!,
    progress: new Map(LEAVES.map((t) => [t.id, t.progress ?? 0])),
  };
}

const VARIANTS: Array<[string, ReactNode]> = [
  ["provider only (data layer + contexts)", null],
  ["provider + grid", <GanttGrid key="g" />],
  ["provider + task list", <TaskList key="t" columns={DEFAULT_COLUMNS} />],
  [
    "provider + both",
    <>
      <TaskList key="t" columns={DEFAULT_COLUMNS} />
      <GanttGrid key="g" />
    </>,
  ],
];

describe(`updateTask ablation — ${SIZE} tasks`, () => {
  for (const [name, children] of VARIANTS) {
    let mounted: Mounted;
    let cursor = 0;

    bench(
      name,
      () => {
        const id = IDS[cursor++ % IDS.length]!;
        const next = ((mounted.progress.get(id) ?? 0) + 1) % 100;
        mounted.progress.set(id, next);
        act(() => {
          mounted.api.updateTask(id, { progress: next });
        });
      },
      {
        setup: () => {
          mounted = mount(children);
          cursor = 0;
        },
        teardown: () => {
          act(() => mounted.root.unmount());
        },
      },
    );
  }
});
