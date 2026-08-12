# ADR-014 — `endDate` becomes an exclusive instant

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** `endDate` is the instant work stops, public *and* internal. A Mon–Fri all-day task is
`startDate: Mon 00:00, endDate: Sat 00:00`. A 9-to-5 Friday task is `Fri 09:00 → Fri 17:00`. A
display-layer formatter renders inclusive dates in task-list columns and tooltips; stored and
emitted dates are always exclusive instants.

**This replaces the current convention** — `endDate` as the last occupied day, inclusive — stated
at `core/scheduling.ts:7`, encoded in the bar geometry as "right edge measured at the exclusive
next day" (`core/barUtils.ts:32`, `:53-56`), and documented in `packages/mock-data/src/sample.ts:6-7`.

**Rejected — inclusive days plus separate time fields.** Zero migration, but two representations
of when work stops that can contradict each other; the scheduler would recombine date and time on
every operation. The shape that produces "correct in the grid, wrong in the cascade" bugs.

**Rejected — exclusive internally, inclusive at the API boundary.** Initially chosen, then
withdrawn on analysis. Reading is salvageable; **writing is not**. Once hours exist, a consumer
passing `endDate: Friday` may mean "through end of Friday" or "at midnight starting Friday", and
both are legal — the library cannot tell. `Fri 17:00` has no inclusive-day representation at all,
so any task with real hours cannot round-trip. Prior art hit this problem and resolved it the
same way: store exclusive, expose exclusive, convert only in the display template, warning
explicitly against adjusting stored dates instead.

**Why this is cheaper than it looks.** The `+1`/`−1` day adjustments scattered through
`constrainedStart` exist *because* the end is inclusive; exclusive ends are what makes interval
arithmetic clean, so they disappear rather than being ported.

**Cost accepted.** Every `endDate` in `packages/mock-data` (21 occurrences) and the docs examples
shifts meaning by one day and must be migrated. One-time and mechanical, on an unpublished package.
