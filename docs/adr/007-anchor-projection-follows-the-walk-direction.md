# ADR-007 — Anchor projection follows the walk direction

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** A walk anchored in non-working time projects the anchor **toward the walk
direction** first: backward walks to the previous working instant, forward walks to the next.

**The problem this solves.** Working-time walks are not a group under addition. `constrainedStart`
folds two quantities into one expression — `addDays(pred.end, lag - successorDuration)` at
`core/scheduling.ts:42,44` — which is valid for calendar time but not for working-time walks:
`walk(walk(d, −a), +b)` equals `walk(d, b − a)` only when `d` is itself in working time. Anchors
frequently are not: consumer-authored dates are never rewritten (ADR-012), so a predecessor can
end on a Saturday or at 21:00.

**Rejected.** Always project forward (restores composition for all anchors, but silently moves a
predecessor's effective finish later); forbid non-working anchors entirely (strongest invariant,
but requires rewriting consumer dates on mount, which ADR-002 and ADR-012 exist to avoid).

**Cost accepted — the sharpest edge in the design.** The projection is lossy:
`walk(walk(d, −n), +n)` may not return `d` when `d` is non-working, so FS/FF round-trips can drift.
The asymmetry is _intended_ and must be pinned by an explicit test asserting the drift, so a
future reader cannot mistake it for a bug and "fix" it. Composition holds **only** from a
working-time anchor — project once at an operation's boundary, then compose freely inside.
