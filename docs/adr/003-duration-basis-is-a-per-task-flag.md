# ADR-003 — Duration basis is a per-task flag

- **Status:** Superseded by [ADR-013](./013-calendar-model-global-hours-per-weekday-per-date.md)
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Original decision.** `GanttTask.durationUnit?: 'working' | 'calendar'`, defaulting to
`'working'`, so a task could declare an elapsed duration that ignores the calendar.

**Superseded because** ADR-013 adopts a chart-level `durationUnit` naming a _unit_
(day/hour/minute), which cannot also express a _basis_. Elapsed durations therefore drop out of
this pass.

**Reasoning retained.** Real projects mix work durations with elapsed ones — concrete curing and
shipping lead times don't pause for weekends. That need is real and unmet; it is re-addable later
as an orthogonal per-task `elapsed?: boolean` flag without a breaking change, which is arguably a
cleaner factoring than overloading one field with both unit and basis.
