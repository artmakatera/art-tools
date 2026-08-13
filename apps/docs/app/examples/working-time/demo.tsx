"use client";

import { useMemo, useState } from "react";
import { Gantt, type GanttCalendar, type GanttTask } from "@am/react-gantt";

/**
 * A `calendar` makes non-working time real: the scheduler, drag, and the
 * dependency cascade all honour it. Passing the prop at all is the opt-in — with
 * no calendar the chart schedules in plain linear time.
 *
 * Three scopes resolve `dates` → `days` → `hours`, so a specific date beats a
 * weekday rule, which beats the global default. A day off is just a day with no
 * hours (`false`), so working *days* are the degenerate case of working *time*.
 *
 * Note `endDate` is EXCLUSIVE — the instant work stops — so "Kickoff" below
 * occupies Jan 5 alone.
 */
const BASE_TASKS: GanttTask[] = [
  { id: 1, name: "Kickoff", startDate: new Date(2026, 0, 5), endDate: new Date(2026, 0, 6) },
  { id: 2, name: "Build (3 working days)", startDate: new Date(2026, 0, 6), duration: 3 },
  { id: 3, name: "Review (2 working days)", startDate: new Date(2026, 0, 8), duration: 2 },
];

const WEEKENDS_OFF: GanttCalendar = { days: { 0: false, 6: false } };

const WITH_HOLIDAY: GanttCalendar = {
  days: { 0: false, 6: false },
  dates: { "2026-01-07": false },
};

const OFFICE_HOURS: GanttCalendar = {
  hours: ["8:00-12:00", "13:00-17:00"],
  days: { 0: false, 6: false, 5: ["8:00-12:00"] },
};

const PRESETS = [
  { key: "none", label: "No calendar", calendar: undefined },
  { key: "weekends", label: "Weekends off", calendar: WEEKENDS_OFF },
  { key: "holiday", label: "Weekends + Jan 7 holiday", calendar: WITH_HOLIDAY },
  { key: "hours", label: "Office hours + short Friday", calendar: OFFICE_HOURS },
] as const;

export function WorkingTimeDemo() {
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["key"]>("weekends");
  const [tasks, setTasks] = useState<GanttTask[]>(BASE_TASKS);

  const active = useMemo(() => PRESETS.find((p) => p.key === preset)!, [preset]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "8px 12px" }}>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPreset(p.key)}
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 6,
              cursor: "pointer",
              border: "1px solid #cbd5e1",
              background: p.key === preset ? "#0f172a" : "#fff",
              color: p.key === preset ? "#fff" : "#0f172a",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p style={{ margin: 0, padding: "0 12px 8px", fontSize: 12, color: "#475569" }}>
        Non-working columns are shaded. Drag a bar across a weekend: it keeps its
        working duration and grows visually. Drag an edge onto a Sunday and it
        settles back onto the last working day.
      </p>
      <Gantt
        tasks={tasks}
        calendar={active.calendar}
        durationUnit={preset === "hours" ? "hour" : "day"}
        onTasksChange={setTasks}
        height={260}
      />
    </div>
  );
}
