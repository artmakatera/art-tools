# ADR-012 — Library-authored dates snap; consumer input is never rewritten

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** Snapping applies only to dates the library authors — drag commits and cascade
results. A task authored ending in non-working time renders as authored until first edited. The
cascade is a relaxation, not a normalizer: a task nothing pushes is never moved onto working time.

**Rejected.** Quantize-on-read for rendering (bars would look right immediately, but the visible
chart and the `onTasksChange` payload would disagree, and a consumer reading their own data back
could not explain the bar they see); normalize-on-mount (rewrites consumer data, contradicting
ADR-002).

**Cost accepted.** The first render can visibly contradict the chart's own rule, and the
non-working *anchor* case is reachable straight from input — which is precisely why ADR-007's
lossy projection convention is needed at all.

**Known gap, accepted.** `buildActionTask` (`components/taskList/TaskListHeader.tsx:125`) is
library-authored and can land on a Saturday. Quantizing it means threading the calendar into
`ColumnApi`. Left as-is and documented rather than plumbed.
