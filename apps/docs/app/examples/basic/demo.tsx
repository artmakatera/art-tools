"use client";

import { Gantt } from "@am/react-gantt";
import { mockTasks } from "@am/mock-data/sample";

export function BasicDemo() {
  return <Gantt tasks={mockTasks} height={420} />;
}
