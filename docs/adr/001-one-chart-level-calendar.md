# ADR-001 — One chart-level calendar

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** A single `calendar` prop on `Gantt` and `GanttProvider`. Every task obeys it.

**Rejected.** Per-task calendar overrides; per-resource calendars (both of which dhtmlx supports
via `task.calendar_id` and `resource_calendars`).

**Why.** Column shading and scheduling read the same object, so they cannot disagree. A per-task
calendar makes the *grid background* ambiguous — the background is drawn per column
(`GridColumns.tsx:75`), so a chart with two calendars either shades one and lies about the other,
or moves shading per-row and forces a change to column virtualization.

**Cost accepted.** Cannot model a Sunday–Thursday crew alongside a Monday–Friday one.
