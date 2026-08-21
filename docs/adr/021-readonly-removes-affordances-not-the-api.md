# ADR-021 — `readOnly` removes affordances, not the API

- **Status:** Accepted
- **Context:** Editing surface — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** `readOnly?: boolean` on the chart (and on `GanttProvider`) removes every _user_
editing affordance and nothing else. Bars carry no drag listener, the resize grips, progress grip
and dependency connectors are not rendered, link hit areas are gone (so no link can be selected,
which is also what makes the Delete/Backspace shortcut unreachable), and the built-in actions
column is dropped from the default columns. Viewing is untouched: selection, expand/collapse,
scroll, zoom, `onTaskClick`.

`apiRef` still mutates, and the mutating members of `ColumnApi` still work. `readOnly` describes the
pointer, not the data — a consumer who wants an uneditable chart driven by their own toolbar gets
that for free, and a chart whose data must not change at all is expressed by not wiring the
callbacks.

Affordances are removed by **omitting the handlers**, not by handlers that decline: each one renders
only when its callbacks arrive (the pattern `BarProgress` already used for its grip). So there is no
grabbable-but-inert element, and no disabled styling to invent.

Custom `columns` are the consumer's to gate — `ColumnDef.render` receives `api.readOnly`.

**Rejected.** A per-task `editable` flag (the ask is chart-level; a row-level version can be layered
later without changing this prop). Gating on callback _presence_ (`onTasksChange` absent ⇒
read-only) — presence-as-config would silently freeze a chart whose consumer merely does not care to
observe changes, and drag has always worked without any callback wired. `pointer-events: none` on
the bars — it would also kill click-to-select and hover.

**Cost accepted.** Two ways to express "cannot edit" (`readOnly`, or simply not wiring callbacks)
that mean different things. And a consumer passing their own `columns` gets no automatic actions
column removal, because the library cannot know which of their cells mutate.
