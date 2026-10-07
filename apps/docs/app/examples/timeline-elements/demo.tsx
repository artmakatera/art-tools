"use client";

import { useState } from "react";
import {
  Gantt,
  Marker,
  type TimelineElementRenderProps,
  type GanttTask,
  type GanttTimelineElement,
  type GanttTimelineSlots,
} from "@art-tools/react-gantt";

const today = new Date();
const day = (offset: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
const tasks: GanttTask[] = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  name: `Task ${i + 1}`,
  startDate: day(-3 + (i % 3)),
  endDate: day(5 + (i % 5)),
}));
const timeline: GanttTimelineSlots = {
  marker: { slotProps: { label: { style: { fontWeight: 600 } } } },
};

function CustomBadge({ top }: { top: number }) {
  const [clicks, setClicks] = useState(0);
  return (
    <button
      onClick={() => setClicks((value) => value + 1)}
      style={{
        position: "absolute",
        top: top + 40,
        pointerEvents: "auto",
        width: 130,
        padding: "0.25rem",
        borderRadius: 4,
        background: "#e0f2fe",
        color: "#0f172a",
      }}
    >
      Review ({clicks})
    </button>
  );
}

const renderMarker = (props: TimelineElementRenderProps) => <Marker {...props} />;

const hoverDate = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const elements: GanttTimelineElement[] = [
  { render: renderMarker, key: "start", date: day(-3), title: "Project start" },
  {
    key: "today",
    date: today,
    title: "Today",
    render: (props) => (
      <Marker
        {...props}
        slotProps={{
          label: { style: { background: "#2e7d32", color: "white" } },
          line: { style: { background: "#2e7d32" } },
        }}
      />
    ),
  },
  {
    key: "deadline",
    date: day(7),
    title: "Deadline",
    render: (props) => (
      <Marker
        {...props}
        slotProps={{
          label: { style: { background: "#ef4444", color: "white" } },
          line: { style: { background: "#ef4444" } },
        }}
      />
    ),
  },
  {
    key: "review",
    date: day(2),
    overscanPx: 400,
    render: ({ visibleTop }) => <CustomBadge top={visibleTop} />,
  },
  {
    key: "hover-date",
    date: "pointer",
    render: (props) => <Marker {...props} title={hoverDate.format(props.date)} />,
  },
];

export function TimelineElementsDemo() {
  return <Gantt tasks={tasks} height={340} timeline={timeline} timelineElements={elements} />;
}
