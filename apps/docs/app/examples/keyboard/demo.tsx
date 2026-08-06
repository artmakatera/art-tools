"use client";

import { useState } from "react";
import { Gantt, type GanttTask } from "@am/react-gantt";
import { linkedDependencies, linkedTasks } from "@/lib/demo-tasks";

const NAV = [
  ["↑ / ↓", "Previous / next row"],
  ["Home / End", "First / last row"],
  ["PageUp / PageDown", "One viewport of rows"],
  ["→", "Expand a branch, else step to its first child"],
  ["←", "Collapse a branch, else step to the parent"],
  ["Enter", "Activate the row (fires onTaskClick)"],
  ["Space", "Toggle a branch; activate a leaf"],
];

const EDIT = [
  ["← / →", "Move the focused bar by one column"],
  ["Shift + ← / →", "Resize the end edge"],
  ["Alt + ← / →", "Resize the start edge"],
  ["Enter", "Start a dependency link from the bar's end"],
  ["Shift + Enter", "Start a link from the bar's start"],
  ["Escape", "Cancel the link"],
];

function Keys({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div style={{ flex: 1, minWidth: 260 }}>
      <h3 style={{ margin: "0 0 6px", fontSize: 12, textTransform: "uppercase", color: "#64748b" }}>
        {title}
      </h3>
      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 12 }}>
        {rows.map(([key, description]) => (
          <div key={key} style={{ display: "contents" }}>
            <dt>
              <kbd style={{ fontFamily: "ui-monospace, monospace", background: "#f1f5f9", padding: "1px 5px", borderRadius: 3, whiteSpace: "nowrap" }}>
                {key}
              </kbd>
            </dt>
            <dd style={{ margin: 0, color: "#475569" }}>{description}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Both panes are ARIA treegrids with a roving tabindex, so Tab goes
 * task list → timeline → out: one stop each, not one per control.
 *
 * Navigation is always on. Editing is opt-in via `keyboardEditing`, because a
 * read-only chart must not reschedule itself on a stray arrow key.
 */
export function KeyboardDemo() {
  const [tasks, setTasks] = useState<GanttTask[]>(linkedTasks);
  const [editing, setEditing] = useState(true);

  return (
    <div>
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
        <label style={{ fontSize: 13, display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={editing} onChange={(e) => setEditing(e.target.checked)} />
          <code>keyboardEditing</code>
        </label>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#475569" }}>
          Click a row, then use the keys below. With editing off, ← / → expand
          and collapse instead of nudging.
        </p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, padding: "12px" }}>
        <Keys title="Navigation (always on)" rows={NAV} />
        <Keys title="Editing (timeline only)" rows={EDIT} />
      </div>
      <Gantt
        tasks={tasks}
        dependencies={linkedDependencies}
        onTasksChange={setTasks}
        onDependencyCreate={() => {}}
        keyboardEditing={editing}
        height={280}
      />
    </div>
  );
}
