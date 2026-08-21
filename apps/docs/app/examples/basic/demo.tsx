"use client";

import { Gantt } from "@art-tools/react-gantt";
import { mockTasks } from "@am/mock-data/sample";

export function BasicDemo() {
  return <Gantt tasks={mockTasks} height={420} />;
}
