# ADR-023 — Critical path is computed from the actual schedule, not an idealized one

- **Status:** Accepted
- **Context:** Dependency scheduling — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** `highlightCriticalPath` computes float (slack) from each task's _actual, currently
committed_ `startDate`/`endDate` — never from a hypothetical earliest-possible schedule. A task is
critical when it has zero working-time float before the chart's actual current end date would move.
A dependency link is critical only when it is the specific predecessor whose constraint exactly pins
the successor's actual start — not merely a link between two tasks that both happen to be critical.
Off by default; the computation and its context are skipped entirely when the prop is unset.

**Rejected.** Textbook CPM: a forward pass computing each task's _hypothetical_ earliest start from
duration and the dependency graph alone, ignoring where it is actually parked. Rejected because
`scheduleDependents` (`core/scheduling.ts`) never auto-compacts a schedule — it pushes a violated
successor later but never pulls one earlier when a predecessor moves back — so tasks routinely sit
later than their theoretical earliest position with nobody having "collected" that slack. A textbook
pass would flag a task critical while the chart visibly shows a gap before it, and dragging that task
would move nothing: the highlight would lie about what the chart actually does. ADR-002 already
commits to consumer/library-authored dates being ground truth; computing float against a schedule
that doesn't exist on screen contradicts that.

**Why working days, not calendar days.** Float is measured with `countWorkingMs`, matching every
other scheduling calculation in this codebase — duration (ADR-004), lag (ADR-006), quantization
(ADR-005). A task separated from its predecessor by a weekend has zero working-day float and is
critical, even though a calendar-day count would show slack that isn't real: nobody can start the
task any earlier, working-time-wise.

**Why the target is the chart's actual end date, not a computed makespan.** The backward pass anchors
sink tasks (no successors) directly to `max(endDate)` over the resolved task map — the real, currently
rendered end — not to whatever a forward pass would compute as theoretically achievable. This is a
direct consequence of the "actual schedule" decision above: there is no second, idealized schedule to
target.

**Why a dependency link needs its own criticality check, distinct from its endpoints.** A task can
have two predecessors where only one actually pins its start (the other finishes with slack to
spare). Flagging every edge between two critical tasks would light up a link that constrains nothing
— dragging its predecessor would not move the successor. The check reuses `constrainedStart`, the
same forward constraint `scheduleDependents` already enforces: a link is critical only when that
predecessor's constraint exactly equals the successor's actual start.

**Why the backward pass is a new, hand-derived inversion (`constrainedLateFinish` in
`core/criticalPath.ts`) rather than reusing `constrainedStart` directly.** `constrainedStart` solves
the forward direction — a successor's earliest start from a predecessor's span. The critical-path
backward pass needs the mirror: a predecessor's latest finish from a successor's late start. Each of
the four dependency types (`FS`/`SS`/`FF`/`SF`) reuses the exact anchor direction (`anchorDir` in
`addWorkingMs`) `constrainedStart` uses for that type, because it is solving the same equation for the
other variable — the anchor is a property of which point (start or finish) the relationship treats as
its constraint, not of which side happens to be unknown. Like `constrainedStart`, this is lossy when
an intermediate value lands in non-working time (ADR-007) — accepted for the same reason, and pinned
by the round-trip-shaped tests in `tests/core/criticalPath.test.ts` (one per dependency type, plus a
working-time-crossing case) rather than by inspection, since hand-verifying working-time arithmetic by
eye is exactly the kind of mistake ADR-007 already warns about.

**Why `highlightCriticalPath` is opt-in, off by default.** The computation walks the whole dependency
graph (a Kahn's-algorithm-style reverse-topological pass, bounded against cycles the same way
`scheduleDependents` is). A chart with no interest in critical path — most consumers, at least
initially — pays nothing: `useTaskList` skips the memo entirely when the flag is unset, and
`GanttCriticalPathContext` publishes `null` rather than an empty result, so bars and dependency links
skip the lookup rather than checking an empty set. This also means upgrading the library never changes
existing consumers' rendered output.

**Why the computed critical set is not a public export.** Consumers get the result only as applied
styling (a CSS class on critical bars/links, driven by `--am-gantt-critical-bg` and
`--am-gantt-critical-dependency-color`, following the existing CSS-custom-property convention) —
there is no `criticalTaskIds`/`criticalDependencyKeys` export, and `ownerState.isCritical` on
`TaskBar`/`ProjectBar`/`MilestoneBar`/`DependencyLinks` slots is the only way a consumer observes it.
Keeping the result internal-only avoids committing to a public shape (`Set<Id>` vs. array, key format)
before there is a real second consumer of it.

**Why recompute is commit-only, not live during a drag.** `scheduleDependents` itself only cascades at
commit time (drag end, or `updateTask`), never per pointer-move frame. Critical path recomputes on the
same cadence — a `useMemo` keyed on the resolved task map and dependency graph, not on any in-flight
drag override — so highlighting never adds a graph walk to the drag path.
