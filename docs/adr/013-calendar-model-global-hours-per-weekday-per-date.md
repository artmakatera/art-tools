# ADR-013 — Calendar model: global hours, per-weekday, per-date

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** Modeled on dhtmlx `setWorkTime`, three scopes resolving `date → weekday → global`:

- global working hours, e.g. `["8:00-12:00", "13:00-17:00"]`
- per-weekday override (0 = Sunday … 6 = Saturday), e.g. a short Friday, or `false` for a day off
- per-specific-date override, e.g. a holiday `false`, or a half day `["9:00-13:00"]`

Gaps *between* ranges are the non-working hours — that is how a lunch break is expressed. Minute
precision is required (`"8:30-12:00"`). `hours: false` marks a non-working day, so **working days
are the degenerate case of working hours**, not a separate feature.

**Rejected.** Seasonal `customWeeks` (dhtmlx supports date-ranged rule sets; deferred as no
concrete requirement exists, and it adds a fourth resolution tier).

**Default when `calendar` is supplied but `hours` is omitted: full days (00:00–24:00).** Not
dhtmlx's 8:00–12:00/13:00–17:00 default. Rationale: `calendar={{ days: { 0: false, 6: false } }}`
must stay day-granular, so a chart adding a calendar only to mark weekends does not silently
acquire 8-hour days.
