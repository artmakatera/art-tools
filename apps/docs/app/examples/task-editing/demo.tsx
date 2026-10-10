"use client";

import { useCallback, useId, useRef, useState } from "react";
import {
  Gantt,
  displayEndDate,
  endInstantFromDisplayDate,
  type GanttHandle,
  type GanttTask,
  type TaskPatch,
} from "@art-tools/react-gantt";
import { simpleTasks } from "@/lib/demo-tasks";

/** `<input type="date">` wants YYYY-MM-DD in *local* time, not an ISO UTC string. */
function toInputValue(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${String(date.getFullYear()).padStart(4, "0")}-${m}-${d}`;
}

type DateErrors = { start?: string; end?: string };

function fromInputValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  if (
    year < 100 ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
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
      const start = fromInputValue(form.start);
      const end = fromInputValue(form.end);
      if (!start || !end) {
        return {
          start: start ? undefined : "Enter a valid start date (year 0100–9999).",
          end: end ? undefined : "Enter a valid end date (year 0100–9999).",
        };
      }
      if (end < start) {
        return { end: "End must be on or after Start." };
      }
      const patch: TaskPatch = {};
      if (form.name !== editing.name) {
        patch.name = form.name;
      }
      if (form.start !== toInputValue(editing.startDate)) {
        patch.startDate = start;
      }
      // ADR-028: change civil-day boundaries only for edited fields; preserve untouched instants.
      if (
        form.end !==
        toInputValue(displayEndDate(editing.startDate, editing.endDate ?? editing.startDate))
      ) {
        patch.endDate = endInstantFromDisplayDate(end);
      }
      const candidateEnd = patch.endDate ?? editing.endDate;
      if (candidateEnd && candidateEnd < (patch.startDate ?? editing.startDate)) {
        return { end: "End must not precede the stored start time." };
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
  onSave: (form: {
    name: string;
    start: string;
    end: string;
    progress: number;
  }) => DateErrors | undefined;
  onCancel: () => void;
}) {
  const [name, setName] = useState(task.name);
  const [start, setStart] = useState(toInputValue(task.startDate));
  const [end, setEnd] = useState(
    toInputValue(displayEndDate(task.startDate, task.endDate ?? task.startDate)),
  );
  const [progress, setProgress] = useState(task.progress ?? 0);

  const [errors, setErrors] = useState<DateErrors>({});
  const errorId = useId();

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setErrors(onSave({ name, start, end, progress }) ?? {});
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
        <span id={`${errorId}-start-label`}> Start </span>
        <input
          aria-labelledby={`${errorId}-start-label`}
          type="date"
          value={start}
          aria-invalid={Boolean(errors.start)}
          aria-describedby={errors.start ? `${errorId}-start` : undefined}
          onChange={(e) => {
            setStart(e.target.value);
            setErrors({});
          }}
        />
        {errors.start ? <span id={`${errorId}-start`}>{errors.start}</span> : null}
      </label>
      <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 2 }}>
        <span id={`${errorId}-end-label`}> End </span>
        <input
          aria-labelledby={`${errorId}-end-label`}
          type="date"
          value={end}
          aria-invalid={Boolean(errors.end)}
          aria-describedby={errors.end ? `${errorId}-end` : undefined}
          onChange={(e) => {
            setEnd(e.target.value);
            setErrors({});
          }}
        />
        {errors.end ? <span id={`${errorId}-end`}>{errors.end}</span> : null}
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
