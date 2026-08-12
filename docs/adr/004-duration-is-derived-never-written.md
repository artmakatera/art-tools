# ADR-004 — `duration` is derived, never written

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** The library never writes `duration`. Consumers may pass it as input. The quantity
preserved across a move is the **working time spanned**, recomputed on demand.

**Rejected.** Making `duration` authoritative and writing it back on every edit; writing it back
only for tasks that supplied it.

**Why.** `duration` is currently never written by library code — the only assignment anywhere is
the new-task template at `components/taskList/TaskListHeader.tsx:131`. Writing it back would push
a brand-new field into every `{type:'update', task}` snapshot in the change log and every
`onTasksChange` payload, and would force `sameTask` (`hooks/useTaskList.ts:100`) — the gate
deciding whether a drag records an undo step at all — to learn about it.

**Held against dhtmlx.** dhtmlx *does* store integer durations
(*"Internally Gantt always stores the duration of tasks in integer values"*). That is right for
dhtmlx, which owns its data; this library treats consumer tasks as an immutable seed replayed
through a change log, so the same choice would be wrong here. ADR-013's `durationUnit` therefore
governs interpretation of *input* duration and *display* only.
