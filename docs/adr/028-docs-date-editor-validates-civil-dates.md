# ADR-028 — Docs task editor validates local civil dates

- **Status:** Accepted
- **Context:** The task-editing consumer example, following [ADR-014](./014-enddate-becomes-an-exclusive-instant.md).

**Decision.** Start and End inputs represent local civil dates. End is the last
occupied day; explicitly changing it uses the public `endInstantFromDisplayDate`
helper to store the following local midnight. Start edits use local midnight.
The editor validates complete, real dates and their order before emitting any
patch. Invalid inputs retain the form and show associated accessible errors.
Supported input years are 0100–9999; earlier years are rejected visibly because
the public end-date helper uses a constructor that interprets years 0–99 as
1900–1999.

Untouched date strings preserve exact stored instants and an absent endDate.
The converted candidate span is also checked against preserved instants. Opening
and saving an instant or intraday task must not turn it into an all-day span.
Name and progress edits remain independent minimal patches after validation.

**Rejected.** Parsing ISO input strings as UTC shifts civil dates in local zones.
Adding 24 elapsed hours fails across DST. Rebuilding every date on Save destroys
untouched intraday precision and optionality. Native input constraints alone do
not guard programmatic submission.

**Cost accepted.** This example edits days, not times: explicitly changing a date
loses that field's time precision. It does not define a duration-only or
working-calendar editor. Library scheduling and exclusive-end contracts are
unchanged. The custom Days column delegates to `ColumnApi.format.duration` so
its values follow the chart's duration unit and calendar rather than independent
elapsed-time arithmetic.
