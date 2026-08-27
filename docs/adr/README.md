# Architecture decision records

One file per decision. Each records what was chosen, what was rejected, and the cost
knowingly accepted — so a future reader can tell a deliberate trade-off from an oversight.

Cite these from code comments where the reasoning is non-obvious. [ADR-007](./007-anchor-projection-follows-the-walk-direction.md)
in particular documents an _intentional_ asymmetry that reads like a bug.

| #                                                                                            | Decision                                                                   | Status                |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------- |
| [ADR-001](./001-one-chart-level-calendar.md)                                                 | One chart-level calendar                                                   | Accepted              |
| [ADR-002](./002-calendar-presence-is-the-opt-in.md)                                          | Calendar presence is the opt-in                                            | Accepted              |
| [ADR-003](./003-duration-basis-is-a-per-task-flag.md)                                        | Duration basis is a per-task flag                                          | Superseded by ADR-013 |
| [ADR-004](./004-duration-is-derived-never-written.md)                                        | `duration` is derived, never written                                       | Accepted              |
| [ADR-005](./005-resize-sets-the-working-time-amount.md)                                      | Resize sets the working-time amount                                        | Accepted              |
| [ADR-006](./006-dependency-lag-is-measured-in-working-time.md)                               | Dependency lag is measured in working time                                 | Accepted              |
| [ADR-007](./007-anchor-projection-follows-the-walk-direction.md)                             | Anchor projection follows the walk direction                               | Accepted              |
| [ADR-008](./008-the-drag-preview-stays-rigid.md)                                             | The drag preview stays rigid                                               | Accepted              |
| [ADR-009](./009-milestones-snap-a-milestone-is-an-instant.md)                                | Milestones snap; a milestone is an instant                                 | Accepted              |
| [ADR-010](./010-slot-consumers-get-isnonworking-plus-a-reason.md)                            | Slot consumers get `isNonWorking` plus a reason                            | Accepted              |
| [ADR-011](./011-decision-record-lives-in-docs-at-the-monorepo-root.md)                       | Decision record lives in `docs/` at the monorepo root                      | Accepted              |
| [ADR-012](./012-library-authored-dates-snap-consumer-input-is-never-rewritten.md)            | Library-authored dates snap; consumer input is never rewritten             | Accepted              |
| [ADR-013](./013-calendar-model-global-hours-per-weekday-per-date.md)                         | Calendar model: global hours, per-weekday, per-date                        | Accepted              |
| [ADR-014](./014-enddate-becomes-an-exclusive-instant.md)                                     | `endDate` becomes an exclusive instant                                     | Accepted              |
| [ADR-015](./015-chart-level-durationunit.md)                                                 | Chart-level `durationUnit`                                                 | Accepted              |
| [ADR-016](./016-the-timeline-axis-stays-linear-non-working-time-is-shaded-not-compressed.md) | The timeline axis stays linear; non-working time is shaded, not compressed | Accepted              |
| [ADR-017](./017-accepted-behaviour-change-at-coarse-zoom.md)                                 | Accepted behaviour change at coarse zoom                                   | Accepted              |
| [ADR-018](./018-one-durationunit-day-is-the-week-s-longest-working-day.md)                   | One `durationUnit: 'day'` is the week's longest working day                | Accepted              |
| [ADR-019](./019-the-display-list-materializes-enddate-for-every-task.md)                     | The display list materializes `endDate` for every task                     | Accepted              |
| [ADR-020](./020-starts-always-snap-forward.md)                                               | Starts always snap forward                                                 | Accepted              |
| [ADR-021](./021-readonly-removes-affordances-not-the-api.md)                                 | `readOnly` removes affordances, not the API                                | Accepted              |
| [ADR-022](./022-bar-tooltip-is-a-null-default-slot.md)                                       | The bar tooltip is a slot with no default                                  | Accepted              |
| [ADR-023](./023-critical-path-is-computed-from-the-actual-schedule.md)                       | Critical path is computed from the actual schedule, not an idealized one   | Accepted              |

## Settled without a full ADR

- **`nonWorkingReason` gains `'offHours'`** — off-hours inside a working day fit neither `'weekend'`
  nor `'holiday'`. Purely additive to an already-optional field.
- **`calendar.dates` is keyed `"YYYY-MM-DD"`** (local civil date). Object keys are strings anyway,
  and a `Date` key would carry a time component that must then be ignored.
- **`snapToWorking` is a top-level prop, not a `GanttCalendar` field** — it is behaviour, not
  calendar data, so it stays out of the content key and cannot invalidate the resolved calendar.
- **DST: working time is civil time, not elapsed time.** A spring-forward day is 23 hours. The
  cheaper alternative (elapsed minutes from local midnight) breaks the midnight alignment the span
  model rests on. Walks step by civil day index + minutes-from-local-midnight, never by adding
  86,400,000 ms.
- **Tests stay zone-agnostic** rather than pinning `TZ` in `vitest.config.ts`, matching the repo's
  existing convention.
- **`padDays` is unit-scaled** (`resolveOrigin` pads by `padDays * step` _units_, so at hour zoom
  `padDays: 1` is one hour). Pre-existing; becomes visible at hour zoom. Documented, not fixed.
- **`snapToWorking: false` means shading on, date _snapping_ off.** Lag, duration, and span are
  still measured in working time (ADR-005, ADR-006 are unconditional).
