import { useCallback, useState } from "react";
import type { GanttTask, TaskPatch } from "@am-tools/react-gantt";

interface TaskEditModalProps {
  task: GanttTask;
  onSave: (patch: TaskPatch) => void;
  onClose: () => void;
}

// Local-time safe conversions so the date inputs don't drift by a day.
function toInputValue(date: Date | undefined): string {
  if (!date) {
    return "";
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromInputValue(value: string | Date): Date | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value;
  }
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d); // local midnight
}

export function TaskEditModal({ task, onSave, onClose }: TaskEditModalProps) {
  const [name, setName] = useState(task.name);
  const [startDate, setStartDate] = useState(toInputValue(task.startDate));
  const [endDate, setEndDate] = useState(toInputValue(task.endDate));
  const [progress, setProgress] = useState(task.progress ?? 0);

  const handleSave = useCallback(() => {
    const patch: TaskPatch = {};
    if (name !== task.name) {
      patch.name = name;
    }

    const nextStart = fromInputValue(startDate);
    if (nextStart && nextStart.getTime() !== task.startDate.getTime()) {
      patch.startDate = nextStart;
    }

    const nextEnd = fromInputValue(endDate);
    if (nextEnd && nextEnd.getTime() !== (task.endDate?.getTime() ?? NaN)) {
      patch.endDate = nextEnd;
    }

    if (progress !== (task.progress ?? 0)) {
      patch.progress = progress;
    }

    onSave(patch);
  }, [name, startDate, endDate, progress, task, onSave]);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
    [],
  );
  const handleStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value),
    [],
  );
  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value),
    [],
  );
  const handleProgressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setProgress(Number(e.target.value)),
    [],
  );
  const stopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={stopPropagation}>
        <h3 style={{ margin: "0 0 12px" }}>Edit task</h3>

        <label style={fieldStyle}>
          <span style={labelStyle}>Name</span>
          <input type="text" value={name} onChange={handleNameChange} style={inputStyle} />
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Start date</span>
          <input type="date" value={startDate} onChange={handleStartChange} style={inputStyle} />
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>End date</span>
          <input type="date" value={endDate} onChange={handleEndChange} style={inputStyle} />
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Progress: {progress}%</span>
          <input type="range" min={0} max={100} value={progress} onChange={handleProgressChange} />
        </label>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 8,
  padding: 20,
  width: 320,
  maxWidth: "90vw",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
  fontFamily: "system-ui, sans-serif",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  marginBottom: 12,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  padding: "6px 8px",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: 14,
};
