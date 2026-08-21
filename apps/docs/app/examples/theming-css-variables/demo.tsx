"use client";

import { useState } from "react";
import { Gantt } from "@am-tools/react-gantt";
import { treeTasks } from "@/lib/demo-tasks";

/**
 * Every colour and size in the chart reads from an `--am-gantt-*` custom
 * property with a fallback, so theming is plain CSS — set the variables on any
 * ancestor and the whole subtree retints. No props, no rebuild.
 */
const DARK: React.CSSProperties = {
  ["--am-gantt-calendar-bg" as string]: "#0f172a",
  ["--am-gantt-calendar-border" as string]: "#1e293b",
  ["--am-gantt-calendar-header-bg" as string]: "#1e293b",
  ["--am-gantt-calendar-header-color" as string]: "#e2e8f0",
  ["--am-gantt-calendar-color" as string]: "#cbd5e1",
  ["--am-gantt-calendar-weekend-bg" as string]: "#172033",
  ["--am-gantt-tasklist-bg" as string]: "#0f172a",
  ["--am-gantt-tasklist-color" as string]: "#cbd5e1",
  ["--am-gantt-grid-bg" as string]: "#0f172a",
  ["--am-gantt-row-selected-bg" as string]: "#1e3a5f",
  ["--am-gantt-task-bg" as string]: "#38bdf8",
  ["--am-gantt-project-bg" as string]: "#34d399",
  ["--am-gantt-milestone-bg" as string]: "#fbbf24",
};

export function CssVariablesDemo() {
  const [dark, setDark] = useState(false);

  return (
    <div>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>
        <label style={{ fontSize: 13, display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
          Dark palette
        </label>
      </div>
      {/* The variables go on a wrapper, not the chart — anything inside inherits. */}
      <div style={dark ? DARK : undefined}>
        <Gantt tasks={treeTasks} height={360} />
      </div>
    </div>
  );
}
