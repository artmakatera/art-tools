# ADR-019 — The display list materializes `endDate` for every task

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** `getTaskList` emits a concrete exclusive `endDate` on every task, not just summaries.
A task authored `{startDate, duration}` therefore comes back from `onTasksChange` carrying a
resolved `endDate`, with its original `duration` untouched.

**Why.** This is the load-bearing architectural simplification: the calendar is applied **once**,
at the `resolved → display list` boundary. Downstream, `computeTaskPixels`, `geometry.ts`,
`getMinMaxDates`, `useZoom`, and `buildDatesFromTasks` need **zero** calendar awareness, and the
entire render path stays calendar-free except shading.

**Rejected.** Stripping the derived field before emit (preserves round-trip fidelity, but either
costs a second traversal or pushes the calendar into the geometry path, losing the win);
materialize-internally-strip-at-callback (keeps both properties, but puts two task shapes in
flight, so "which list am I looking at" becomes a live question when debugging).

**Relation to ADR-004.** Not a contradiction: ADR-004 forbids writing **`duration`**. Writing a
derived `endDate` into the display list is what summary rows already do today
(`core/prepareData.ts:215-259`), and that list is already what `onTasksChange` emits.
