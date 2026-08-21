# ADR-016 — The timeline axis stays linear; non-working time is shaded, not compressed

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** Non-working time remains on the axis, greyed. Skipping off-time — which
removes non-working time from the scale entirely — is out of scope.

**Why.** Compression makes date↔pixel **non-linear**. `unitOffset`/`dateAtOffset`
(`core/dateUtils.ts:169-210`) and the column virtualizer (`core/virtualize.ts`) both assume a
uniform axis; compression would require replacing both with a working-time index. Tools that
offer it gate it behind a paid tier, which is a fair signal of its cost.

**Cost accepted.** At hour zoom, an 8-hour workday occupies a third of a 24-hour axis. Compression
stays available as a later opt-in — the calendar engine is its prerequisite either way, since you
cannot compress an axis until you can say which time is non-working.
