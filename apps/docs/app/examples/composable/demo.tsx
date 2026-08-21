"use client";

import { GanttGrid, GanttProvider, TaskList, type ColumnDef } from "@art-tools/react-gantt";
import { treeTasks } from "@/lib/demo-tasks";

const columns: ColumnDef[] = [
  { key: "name", header: "Task", width: 180, isTreeColumn: true, render: (t) => t.name },
];

/**
 * `<Gantt>` is a convenience wrapper. Underneath it is a provider plus two
 * independent panes, and you can arrange them yourself — here the timeline is
 * placed *above* the task list, which the wrapper cannot express.
 *
 * Everything still works: the two panes share one provider, so scrolling,
 * selection, the keyboard cursor and the undo log stay in lockstep.
 */
export function ComposableDemo() {
  return (
    <GanttProvider tasks={treeTasks} height={200} rowHeight={32}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ borderBottom: "2px solid #e2e8f0" }}>
          <GanttGrid />
        </div>
        <TaskList columns={columns} />
      </div>
    </GanttProvider>
  );
}
