# ADR-018 — One `durationUnit: 'day'` is the week's longest working day

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** Derived as the maximum working time across the seven weekday shapes. With
`{ days: { 0: false, 6: false } }` and full days that is 24h, so `duration: 3` means three whole
working days. With 8:00–12:00/13:00–17:00 it is 8h.

**Rejected.** An explicit `hoursPerDay` config (predictable and immune to
an outlier weekday, but a fourth knob that can contradict the calendar); derive-with-override
(covers both, but makes the effective day length two different things depending on a prop, in the
subtlest part of the model).

**Cost accepted.** A single odd weekday silently redefines "a day" chart-wide — add one 10-hour
Saturday and every duration-authored task shortens. Document prominently; this is the most
surprising derived value in the design.
