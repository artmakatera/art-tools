# ADR-010 — Slot consumers get `isNonWorking` plus a reason

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** `GridColumnOwnerState` and `CalendarCellOwnerState` gain `isNonWorking: boolean` and
`nonWorkingReason?: 'weekend' | 'holiday'`. `isWeekend` is retained as a deprecated alias so the
contract test at `src/tests/components/gridSlots/GridSlots.test.tsx:71` keeps passing.

**Rejected.** Two independent booleans (they overlap confusingly for a Saturday the calendar marks
as _working_); replacing `isWeekend` outright (permissible on an unpublished package, but discards
the weekend-vs-holiday distinction styling wants).

**Cost accepted.** A named holiday plainly wants a _label_, and this shape invites that
expectation without satisfying it. If labels are wanted later, `nonWorkingReason` should widen to
a small object rather than gaining a parallel `holidayName` field.
