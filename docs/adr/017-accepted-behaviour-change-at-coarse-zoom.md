# ADR-017 — Accepted behaviour change at coarse zoom

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** The move-commit path changes at month/quarter/year zoom **even with no calendar**.
Today `dateAtOffset` interpolates fractionally, so a move can produce non-midnight dates and a
slightly distorted span; the new commit produces aligned dates and an exactly preserved span.

**Why.** The alternative is maintaining two move paths forever, one of which exists solely to
bit-preserve a fractional-interpolation artifact that is arguably already a bug.

**Cost accepted.** ADR-002's byte-for-byte guarantee gains an asterisk at coarse zoom. Both the
calendar and no-calendar cases must be pinned by test.
