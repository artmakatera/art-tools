# ADR-002 — Calendar presence is the opt-in

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** No `calendar` → today's behaviour exactly. `calendar` supplied → working-time
scheduling is **on**. `snapToWorking={false}` keeps shading and disables date snapping.

**Rejected.** A default calendar applied with no prop (would silently change every existing
chart's cascade output); scheduling as a separate opt-in on top of the calendar (a flag that does
nothing until a second prop is set).

**Why.** Opting into the calendar *is* the opt-in signal. Requiring a second prop to get the
behaviour the first prop implies is a trap. The second prop survives only as an escape hatch for
shade-but-don't-schedule.

**Note.** The package is `0.0.0`, `private: true`, unpublished, with no changelog — so this was
*not* forced by backward-compatibility pressure. It stands on its own merits.
