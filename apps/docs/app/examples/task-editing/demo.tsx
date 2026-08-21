"use client";

import { useCallback, useRef, useState } from "react";
import { Gantt, type GanttHandle, type GanttTask, type TaskPatch } from "@art-tools/react-gantt";
import { simpleTasks } from "@/lib/demo-tasks";

/** `<input type="date">` wants YYYY-MM-DD in *local* time, not an ISO UTC string. */
function toInputValue(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function fromInputValue(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

/**
 * The library has no built-in editor: `onTaskEdit` just hands you the task and
 * gets out of the way. Send back a *minimal* TaskPatch — `updateTask` skips the
 * undo step entirely when nothing actually changed.
 *
 * The default action column's ✎ button calls `api.editTask(task)`, which is what
 * fires `onTaskEdit`.
 */
export function TaskEditingDemo() {
  const api = useRef<GanttHandle>(null);
  const [tasks, setTasks] = useState<GanttTask[]>(simpleTasks);
  const [editing, setEditing] = useState<GanttTask | null>(null);

  const save = useCallback(
    (form: { name: string; start: string; end: string; progress: number }) => {
      if (!editing) {
        return;
      }
      const patch: TaskPatch = {};
      if (form.name !== editing.name) {
        patch.name = form.name;
      }
      const start = fromInputValue(form.start);
      if (start.getTime() !== editing.startDate.getTime()) {
        patch.startDate = start;
      }
      const end = fromInputValue(form.end);
      if (end.getTime() !== editing.endDate?.getTime()) {
        patch.endDate = end;
      }
      if (form.progress !== (editing.progress ?? 0)) {
        patch.progress = form.progress;
      }

      api.current?.updateTask(editing.id, patch);
      setEditing(null);
    },
    [editing],
  );

  return (
    <div>
      <p style={{ margin: 0, padding: "8px 12px", fontSize: 12, color: "#475569" }}>
        Click the ✎ button on any row.
      </p>
      <Gantt
        apiRef={api}
        tasks={tasks}
        onTasksChange={setTasks}
        onTaskEdit={setEditing}
        height={320}
      />
      {editing ? (
        <EditForm key={editing.id} task={editing} onCancel={() => setEditing(null)} onSave={save} />
      ) : null}
    </div>
  );
}

function EditForm({
  task,
  onSave,
  onCancel,
}: {
  task: GanttTask;
  onSave: (form: { name: string; start: string; end: string; progress: number }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(task.name);
  const [start, setStart] = useState(toInputValue(task.startDate));
  const [end, setEnd] = useState(toInputValue(task.endDate ?? task.startDate));
  const [progress, setProgress] = useState(task.progress ?? 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, start, end, progress });
      }}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "flex-end",
        borderTop: "1px solid #e2e8f0",
        padding: 12,
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 2 }}>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 2 }}>
        Start
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 2 }}>
        End
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 2 }}>
        Progress {progress}%
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
        />
      </label>
      <button type="submit">Save</button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}
