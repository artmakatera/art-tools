# ADR-020 — Starts always snap forward

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** A start snaps to the next working instant regardless of drag direction. Ends snap
backward. A task dragged backward onto a Saturday lands on Monday.

**Why structural, not preferential.** It maintains the invariant that every library-authored task
has a **forward-anchored `startDate` and a backward-anchored `endDate`**. That invariant is the
precondition for ADR-007's composition rule — it is what makes span-preserving moves round-trip
exactly and FF/SF backward walks exact. Nearest-in-either-direction lets a start land
backward-anchored, which makes ADR-007's lossy round-trip reachable during ordinary dragging
rather than only from odd input.

**Cost accepted.** A backward drag onto a weekend appears to do nothing, which reads as a broken
drag. Also: snapping forward means a task never grows _into_ non-working time by snapping.
