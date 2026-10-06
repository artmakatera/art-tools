"use client";

import { useId, useState } from "react";
import { NumberField } from "@base-ui/react/number-field";
import {
  Gantt,
  type BaselineTooltipProps,
  type GanttBarsSlots,
  type GanttTask,
} from "@art-tools/react-gantt";

function PlannedDates({ baseline, displayEnd, children }: BaselineTooltipProps) {
  const start = baseline.startDate.toLocaleDateString();
  const end = (displayEnd ?? baseline.startDate).toLocaleDateString();
  return <span title={`${baseline.title ?? baseline.id}: ${start} – ${end}`}>{children}</span>;
}

const bars: GanttBarsSlots = { baseline: { slots: { tooltip: PlannedDates } } };

const initialTasks: GanttTask[] = [
  {
    id: "release",
    name: "Release",
    type: "summary",
    startDate: new Date(2026, 5, 8),
    endDate: new Date(2026, 6, 4),
    baselines: [
      {
        id: "v1",
        title: "Original plan",
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 5, 20),
      },
      {
        id: "v2",
        title: "Revised plan",
        startDate: new Date(2026, 5, 1),
        endDate: new Date(2026, 5, 27),
      },
    ],
  },
  {
    id: "design",
    parentId: "release",
    name: "Design",
    startDate: new Date(2026, 5, 8),
    endDate: new Date(2026, 5, 18),
    baselines: [
      {
        id: "v1",
        title: "Original plan",
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 5, 5),
      },
      {
        id: "v2",
        title: "Revised plan",
        startDate: new Date(2026, 5, 1),
        endDate: new Date(2026, 5, 12),
      },
    ],
  },
  {
    id: "build",
    parentId: "release",
    name: "Build",
    startDate: new Date(2026, 5, 18),
    endDate: new Date(2026, 6, 4),
    baselines: [
      {
        id: "v1",
        title: "Original plan",
        startDate: new Date(2026, 5, 5),
        endDate: new Date(2026, 5, 20),
      },
      {
        id: "v2",
        title: "Revised plan",
        startDate: new Date(2026, 5, 12),
        endDate: new Date(2026, 5, 27),
      },
    ],
  },
  {
    id: "launch",
    name: "Launch",
    type: "milestone",
    startDate: new Date(2026, 6, 4),
    baselines: [
      { id: "v1", title: "Original plan", startDate: new Date(2026, 5, 20) },
      { id: "v2", title: "Revised plan", startDate: new Date(2026, 5, 27) },
    ],
  },
];

const layoutFields = [
  { key: "height", label: "Height", min: 1 },
  { key: "padding", label: "Padding", min: 0 },
  { key: "gap", label: "Gap", min: 0 },
] as const;

export function BaselinesDemo() {
  const [tasks, setTasks] = useState(initialTasks);
  const [showBaselines, setShowBaselines] = useState(true);
  const [baselineLayout, setBaselineLayout] = useState({ height: 4, padding: 1, gap: 2 });
  const layoutId = useId();

  return (
    <>
      <div className="flex flex-wrap items-end gap-4 p-3">
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
          }}
        >
          <input
            type="checkbox"
            checked={showBaselines}
            onChange={(event) => setShowBaselines(event.target.checked)}
          />
          Show baselines
        </label>
        <fieldset className="flex flex-wrap gap-3">
          <legend className="mb-1 text-xs text-slate-500 dark:text-slate-400">
            Baseline layout (px)
          </legend>
          {layoutFields.map(({ key, label, min }) => (
            <NumberField.Root
              key={key}
              id={`${layoutId}-${key}`}
              value={baselineLayout[key]}
              min={min}
              step={1}
              onValueChange={(value) => {
                if (value === null) {
                  return;
                }
                setBaselineLayout((previous) => ({ ...previous, [key]: value }));
              }}
            >
              <label htmlFor={`${layoutId}-${key}`} className="mb-1 block text-sm">
                {label}
              </label>
              <NumberField.Group className="flex h-8 overflow-hidden rounded-md border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-600 dark:bg-slate-900">
                <NumberField.Decrement
                  aria-label={`Decrease baseline ${key}`}
                  className="w-8 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                >
                  −
                </NumberField.Decrement>
                <NumberField.Input className="w-10 border-x border-slate-300 text-center text-sm outline-none dark:border-slate-600" />
                <NumberField.Increment
                  aria-label={`Increase baseline ${key}`}
                  className="w-8 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                >
                  +
                </NumberField.Increment>
              </NumberField.Group>
            </NumberField.Root>
          ))}
        </fieldset>
      </div>
      <Gantt
        tasks={tasks}
        onTasksChange={setTasks}
        bars={bars}
        showBaselines={showBaselines}
        baselineLayout={baselineLayout}
        height={340}
      />
    </>
  );
}
