# ADR-005 — Resize sets the working-time amount

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** Dragging an edge sets an amount of working time; the other edge is re-derived. A bar
dropped in non-working time visibly settles back.

**Cost accepted.** This is quantization, not snapping, so it happens even with
`snapToWorking={false}`. A real wrinkle in "shade but don't schedule" mode; document it rather
than let it be discovered.
