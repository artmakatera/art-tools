# ADR-009 — Milestones snap; a milestone is an instant

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** A milestone moves to the closest working time.

**Rejected.** Milestones never snap (a contract deadline can legitimately fall on a Sunday — but
then a milestone becomes a non-working *anchor* for every successor, the ambiguous case ADR-007
has to paper over); a per-milestone snap override.

**Precondition.** Forces reconciliation of an existing inconsistency: `core/scheduling.ts:104-108`
moves a milestone's `startDate` and leaves its `endDate` untouched, while
`hooks/useTaskList.ts:96` writes `endDate` for milestones. These must agree, in one place.
