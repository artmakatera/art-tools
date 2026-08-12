# ADR-015 — Chart-level `durationUnit`

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** `durationUnit?: 'day' | 'hour' | 'minute'` on the chart. Governs how an input
`duration` is interpreted and how duration is displayed. Per ADR-004, the library still never
writes the field.

**Rejected.** Per-task units (ADR-003's basis flag conflated unit with basis); no unit config at
all with duration purely derived (diverges from dhtmlx and leaves a consumer wanting "5 days" in a
column to convert it themselves).

**Cost accepted.** Elapsed durations are unexpressible in this pass — see ADR-003.
