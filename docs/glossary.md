# Glossary

Terms that must mean exactly one thing in code, tests, and docs. Decisions behind them
live in [`docs/adr/`](./adr/README.md).

| Term                      | Meaning                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Working time**          | Any instant the calendar marks as available for work. The scheduler's only primitive concept.                                                                                                                |
| **Non-working time**      | Its complement: a weekend, a holiday, an evening, a lunch gap. Weekend-vs-holiday matters only for styling (ADR-010).                                                                                        |
| **Working day / day off** | A day with, or without, any working hours. Not a separate concept — the degenerate case of working time (ADR-013).                                                                                           |
| **Calendar**              | The chart-level object defining working time. One per chart (ADR-001). Resolution order: specific date → weekday → global.                                                                                   |
| **Hour range**            | `"H:MM-H:MM"`, minute precision. Gaps _between_ ranges in a day are non-working (that is how lunch is expressed).                                                                                            |
| **Span**                  | The interval `[startDate, endDate)` — start inclusive, **end exclusive** (ADR-014). A one-day task is `Mon 00:00 → Tue 00:00`.                                                                               |
| **Duration**              | Working time within a span, expressed in the chart's `durationUnit` (ADR-015). Derived, never written by the library (ADR-004).                                                                              |
| **Walk**                  | Moving N units of _working_ time from an anchor, skipping non-working time. Not addition — see ADR-007.                                                                                                      |
| **Anchor projection**     | Normalizing a non-working anchor onto working time before a walk, in the walk's direction (ADR-007). Lossy by design.                                                                                        |
| **Snapping**              | Moving a _library-authored_ date onto working time. Governed by `snapToWorking`. Never applied to consumer input (ADR-012).                                                                                  |
| **Quantization**          | Re-deriving the far edge of a span from a working-time amount on resize. Distinct from snapping, and happens regardless of `snapToWorking` (ADR-005).                                                        |
| **Tooltip**               | The hover-only overlay on a bar. A slot with no default; the native `title` is the zero-config baseline and is suppressed once the slot is set. Placed from the cursor in JS, after a dwell delay (ADR-022). |
