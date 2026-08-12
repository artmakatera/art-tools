# ADR-006 — Dependency lag is measured in working time

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** `lag` counts working time, matching the duration unit.

**Rejected.** Calendar-time lag (defensible for physical wait time, but then the lag term and the
duration term in the same expression use different units); a per-dependency `lagUnit` flag (a
third independent switch, eight combinations to specify and test).

**Why.** "Start two days after this finishes" means two *working* days to every user who says it.
Physical-wait-time lag is better served later by an explicit elapsed flag than by making the
default counter-intuitive.
