"use client";

import { useState } from "react";
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

export function BaselinesDemo() {
  const [tasks, setTasks] = useState(initialTasks);
  return <Gantt tasks={tasks} onTasksChange={setTasks} bars={bars} height={340} />;
}
