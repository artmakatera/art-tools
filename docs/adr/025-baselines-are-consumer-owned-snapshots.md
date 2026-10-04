# ADR-025: Baselines are consumer-owned snapshots

Status: Accepted

## Decision

Each task may carry an ordered `baselines: GanttBaseline[]`. A baseline has an id
unique within that task, an optional title, a start instant, and an exclusive end
instant for tasks and summaries. A milestone baseline is an instant. Summary
baselines are explicit; they are never rolled up from children.

Only the first five entries per task are eligible for rendering. Invalid entries
among those five are skipped with a development warning; later entries do not
replace them. All eligible baselines are shown in separate thin lanes below the
live bar. The consumer's `rowHeight` remains the height of the live-bar area; a
strip sized from the maximum number of rendered lanes is added equally to every
row. Each 3px line has a 2px gap before the next, and those gaps count toward
the strip height. The date axis, zoom origin, and reveal geometry include only rendered
baselines. The live bar, task scheduling, dependency constraints, and critical
path continue to use only current task dates.

`showBaselines` is a chart-level boolean on both `Gantt` and `GanttProvider`,
defaulting to `true` to preserve existing charts. When false, baseline lines and
accessible descriptions are omitted, the row strip is removed, and baseline
spans are excluded from axis, zoom-origin, and reveal geometry. The flag controls
presentation only; toggling it does not mutate tasks or add an undo step. Keeping
hidden plans in the axis or reserving empty lanes would waste space and leave
geometry inconsistent with the rendered schedule.

Baselines are display-only. They do not drag, resize, select a task, or enter
`TaskPatch`. The latest `tasks` prop owns their values even when the local change
log contains a whole-task snapshot from an earlier edit. Updating baselines from
outside the chart does not create an undo step; undo and redo of live edits do
not restore older baseline values. An existing task can therefore receive a new
plan without resetting its locally edited schedule.

One CSS variable colors all baselines by default. The baseline slot can customize
appearance and wrap the visual root in a tooltip; without a tooltip slot the
native `title` shows the version name and dates. Visible plans are also described
on the task's existing accessible bar, without adding focus stops.

## Reason

A baseline represents a plan captured by the consumer, not a date the chart can
derive from today's schedule. Multiple plans make drift across revisions visible.
Task-local ids allow partial plans without requiring every task to participate in
the same chart-wide version. The cap keeps five lanes usable within ordinary row
heights and bounds rendering work at a large row count.

## Alternatives and cost

Deriving summary plans from children would require a chart-wide version identity
and rules for missing child plans. A single active baseline would hide other
revisions. Rendering every supplied plan would make rows arbitrarily tall. The
five-entry cap means later plans remain in consumer data but are absent from the
chart and do not expand its axis; consumers must order the five they want shown
first. A shared color is less distinct than a palette but avoids encoding display
choices in schedule data; custom styling remains available through the slot.

The chart's command log stores whole tasks. Keeping baselines in that log would
let undo resurrect stale plans or a local drag mask a newer `tasks` prop. The
rendered task list instead takes baselines from the latest seed task for each id.
Tasks created only through the imperative API keep the baselines they were
created with until the consumer supplies that task in `tasks`.
