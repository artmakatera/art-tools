"use client";

import { useRef, useState } from "react";
import { Gantt, type GanttHandle, type ZoomLevel } from "@am/react-gantt";
import { treeTasks } from "@/lib/demo-tasks";

/**
 * A zoom ladder is an array of rungs, coarse → fine. Each rung owns the
 * calendar rows (`scales`) and the width of one column.
 *
 * The BOTTOM-most scale row defines what a column means: its `unit` and `step`
 * are what a keyboard nudge moves by, and what bar geometry converts against.
 */
const zoomLevels: ZoomLevel[] = [
  {
    colWidth: 52,
    scales: [
      { unit: "year", step: 1, format: (d) => String(d.getFullYear()) },
      { unit: "quarter", step: 1, format: (d) => `Q${Math.floor(d.getMonth() / 3) + 1}` },
    ],
  },
  {
    colWidth: 44,
    scales: [
      { unit: "year", step: 1, format: (d) => String(d.getFullYear()) },
      { unit: "month", step: 1, format: (d) => d.toLocaleString(undefined, { month: "short" }) },
    ],
  },
  {
    colWidth: 34,
    scales: [
      {
        unit: "month",
        step: 1,
        format: (d) => d.toLocaleString(undefined, { month: "long", year: "numeric" }),
      },
      { unit: "day", step: 1, format: (d) => String(d.getDate()) },
    ],
  },
];

export function CustomZoomDemo() {
  const api = useRef<GanttHandle>(null);
  const [zoom, setZoom] = useState({ index: 0, count: 0 });

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <button type="button" onClick={() => api.current?.zoomOut()} disabled={zoom.index <= 0}>
          − Out
        </button>
        <button
          type="button"
          onClick={() => api.current?.zoomIn()}
          disabled={zoom.index >= zoom.count - 1}
        >
          In +
        </button>
        <span style={{ fontSize: 12, color: "#475569" }}>
          rung {zoom.index + 1} / {zoom.count}
        </span>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>
          (Ctrl/Cmd + wheel over the chart also zooms, anchored on the cursor)
        </span>
      </div>
      <Gantt
        apiRef={api}
        tasks={treeTasks}
        zoomLevels={zoomLevels}
        defaultZoomIndex={2}
        onZoomChange={setZoom}
        zoomWheel
        zoomKeyboard
        height={360}
      />
    </div>
  );
}
