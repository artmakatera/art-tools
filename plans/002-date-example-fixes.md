# Plan 002: Correct date editing and duration display in docs examples

> **Executor instructions:** Implement findings 2–4 together after the docs test foundation is complete. Preserve existing working-tree changes. Do not commit. Update plans/README.md with actual verification evidence; a failing mandatory gate cannot be marked DONE.
>
> **Drift check:** `git diff --stat 6efd01a..HEAD -- apps/docs/app/examples/task-editing apps/docs/app/examples/custom-columns apps/docs/tests docs/adr`
> Also inspect `git status --short` and uncommitted diffs. Reconcile changed contracts before implementation.

## Status

- Priority: P1
- Effort: M
- Risk: MED — date conversion and no-op preservation need explicit regressions
- Depends on: 001-docs-regression-tests.md
- Category: bug
- Planned at: commit `6efd01a`, 2026-10-08
- Status: BLOCKED — implementation complete; full gate blocked by Turbopack worker port restrictions

## Why this matters

The task editor currently submits invalid dates and reversed spans. Its End field also exposes an exclusive boundary as if it were the last occupied day. Separately, the custom Days column adds an extra day: Write spec occupies January 5–9 but displays six days. Correct these consumer examples without changing library scheduling or stored fixtures.

## Current state and contracts

- `apps/docs/app/examples/task-editing/demo.tsx` owns local date-input parsing, EditForm, and the minimal TaskPatch submitted through updateTask. Its parser is currently unchecked:

  ```ts
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
  ```

  Save parses both strings, compares timestamps, calls updateTask, then closes the editor. Empty strings become Invalid Date. EditForm initializes End with `toInputValue(task.endDate ?? task.startDate)` and accepts any ordering.

- `apps/docs/app/examples/custom-columns/demo.tsx` declares a stable module-level columns array. Its Days renderer checks endDate, then returns `Math.round(ms / 86_400_000) + 1`.
- `apps/docs/lib/demo-tasks.ts` supplies Write spec with local `new Date(2026, 0, 5)` and exclusive `new Date(2026, 0, 10)`. Preserve these dates and fixture identities.
- ADR-014 states: stored and emitted endDate values are exclusive instants; presentation displays the last occupied day. Glossary defines span as `[startDate, endDate)`. A one-day task is Monday midnight to Tuesday midnight.
- Public exports already include `displayEndDate` and `endInstantFromDisplayDate` in `packages/react-gantt/src/index.ts:201`. The former returns the civil day containing endInstant minus one millisecond, with a start-day fallback for instants. The latter constructs the following local midnight using calendar components. Import these from the public package, never a private source path.
- `ColumnApi.format.duration(task)` returns a number in the chart's duration unit and owns working-time/DST semantics. Use it instead of reimplementing elapsed-millisecond arithmetic.
- The existing editor's comment promises minimal patches and no undo entry on unchanged submission. Preserve that behavior, including unchanged intraday timestamps and absent endDate.
- Test exemplar: `packages/react-gantt/src/tests/components/taskList/defaultColumns.test.tsx` imports render/fireEvent/screen and explicit Vitest functions; it asserts observable text and callbacks. Plan 001 creates the corresponding docs suite, with jsdom, cleanup, alias resolution, and Europe/Warsaw timezone.
- Follow curly braces, guard clauses, clsx for conditional class names, and preserve rationale comments. Explain conversion at its use with an ADR reference. No new domain term is needed.

## Scope

Only change:

- `apps/docs/app/examples/task-editing/demo.tsx`
- `apps/docs/app/examples/custom-columns/demo.tsx`
- `apps/docs/tests/task-editing.test.tsx` (new)
- `apps/docs/tests/custom-columns.test.tsx` (new)
- `docs/adr/028-docs-date-editor-validates-civil-dates.md` (new; use the next free number if 028 is occupied)
- `docs/adr/README.md` (index entry)
- This plan and plans/README.md (status/evidence)
- Existing ignored local harness progress/handoff files if used.

Exclude all library source/tests, fixtures, other examples, dependency/config changes, working-time preset labels (finding 5), global CSS, header/navigation, releases, and browser-test infrastructure. Plan 001 owns the test configuration. Keep helpers in demo.tsx so the displayed example remains self-contained; no generic date framework or new public API.

## Commands

| Purpose                          | Command                                                                                            | Expected result                   |
| -------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------- |
| Baseline and final gate          | `./init.sh`                                                                                        | Exit 0 before DONE                |
| Docs tests with dependency build | `pnpm exec turbo run test --filter=@am/docs`                                                       | Docs and prerequisite builds pass |
| Focused regressions after build  | `pnpm --filter @am/docs exec vitest run tests/task-editing.test.tsx tests/custom-columns.test.tsx` | All new cases pass                |
| Workspace integration            | `pnpm test`                                                                                        | Library and docs suites pass      |
| Types                            | `pnpm check-types`                                                                                 | Exit 0                            |
| Lint / formatting                | `pnpm lint` and `pnpm format:check`                                                                | No errors or format mismatches    |
| Patch hygiene                    | `git diff --check`                                                                                 | Exit 0                            |

The earlier audit passed read-only docs lint and typechecking. Prior full gates failed during the docs Turbopack build because worker-port binding was prohibited. Re-run the baseline, record the actual result, and do not call that historical failure a new regression or bypass the gate.

## Git workflow

Use the supplied checkout or dispatcher worktree. Preserve unrelated edits, particularly existing globals.css and site-header.tsx changes. No commits, pushes, merges or PRs.

## Steps

### 1. Establish baseline and date-editor decision

Read AGENTS.md, local harness state, ADR-014, the glossary, and current files. Confirm plan 001's docs test script/config exists and its suite passes. Run the baseline gate before edits. Record the chosen editor boundary in a short ADR: fields represent local civil dates, End means the last occupied day, invalid/reversed inputs stay in the editor, and untouched date fields preserve exact stored instants. This is a consumer UI decision, not a change to scheduling or exclusive-end semantics.

**Verify:** `pnpm exec turbo run test --filter=@am/docs` passes with existing tests. Record `./init.sh` baseline result. If plan 001 is absent, stop; do not silently implement its infrastructure here.

### 2. Validate both dates before emitting any patch

Replace unchecked parsing with a strict local civil-date parser returning Date or null. Require a full YYYY-MM-DD value, valid finite components, and a component round trip to reject rollovers such as February 30. Avoid ISO parsing and valueAsDate (UTC). Handle years 1–99 correctly rather than letting the Date constructor reinterpret them as 1901–1999; use setFullYear on an initialized date or explicitly reject unsupported years with visible feedback.

Validate both inputs together before calling updateTask or closing the form. Require End civil date >= Start civil date, allowing a same-day task. Mark invalid fields with aria-invalid and connect inline error text via aria-describedby. Keep values and form open after failure. Native required/min constraints may supplement this but must not be the only guard: a direct submit event must also reject invalid input. Clear obsolete errors on correction or successful resubmission. Cancel remains usable and emits no patch.

Retain existing name/progress behavior. Do not send a partial name/progress patch when dates are invalid. Arrange validation in the existing form/save path so there is one authoritative validation pass and failure cannot fall through into the close operation.

**Verify:** Focused task-editing tests reject empty Start, empty End, and End before Start with zero updateTask calls and a still-open form; correction permits save. `pnpm check-types` passes.

### 3. Convert display End only when the field changes

Initialize End with `displayEndDate(task.startDate, task.endDate ?? task.startDate)` formatted using existing local toInputValue. Compare submitted date strings with those original display strings before constructing date patch properties. Only changed Start writes parsed local midnight. Only changed End writes `endInstantFromDisplayDate(parsedEnd)`.

This string comparison is essential: an untouched intraday end must not silently become next midnight, and an absent endDate must not become an invented one-day span. Unchanged Save must have no date properties in its patch. Keep the existing empty-patch call behavior if desired; the library skips its undo entry. A name-only or progress-only change must not include either date.

After conversion, also validate the candidate stored span using preserved original values for unchanged fields: when an end exists it must not precede candidate start. Do not implicitly turn a zero-length task into a full-day task just because it was opened. This demo remains a date-only editor: an explicitly edited date intentionally uses a civil-day boundary; untouched time components remain exact.

**Verify:** January 5 → exclusive January 10 opens as Start January 5 / End January 9; unchanged save excludes both dates; selecting January 10 as End writes local January 11 midnight; same-day selection stores the next midnight. Spring/fall DST cases use the next calendar day, not 24 elapsed hours. Run focused task-editing tests.

### 4. Delegate duration rendering to the column API

Replace the custom duration renderer with `(task, api) => api.format.duration(task)`. Keep the column key, Days header, width, stable columns array and other cells. The demo uses default durationUnit=day; do not change its chart settings or round away fractional formatter results. Let the API resolve duration-only and instant tasks instead of returning a dash solely because endDate is absent.

**Verify:** custom-columns tests render Write spec as 5 and prove the renderer returns a distinctive formatter value unchanged (including a fraction). No +1 or 86_400_000 arithmetic remains in the renderer. Run focused tests and typechecking.

### 5. Verify the complete change

Run both docs regression files, all docs tests, root tests and full gate. Review the diff against the allowed scope and baseline. Update plan/index and local handoff with actual commands, counts, and remaining blockers.

**Verify:** `pnpm test`, `./init.sh`, and `git diff --check` pass before marking DONE. An environment-blocked build means BLOCKED, with successful test evidence retained.

## Test design

Use a small Gantt boundary mock in the editor tests to capture its real props, expose an Edit button invoking onTaskEdit, and populate apiRef with an updateTask spy. Exercise the exported TaskEditingDemo and its actual form through labeled fields and submit events. Do not mock date helpers or export private functions just for tests. Reset mocks between cases. Use fresh test-owned tasks for edge cases rather than mutating shared fixtures; invoke the captured onTaskEdit callback inside act.

Cover: initial inclusive End; unchanged Save; name/progress-only changes; empty Start; empty End; reversed dates; correction after error; Cancel; changed Start; changed End; same-day task; month/year rollover; leap day; unchanged intraday timestamps; missing endDate; and no accidental full-day conversion for an instant. Date inputs sanitize malformed values in jsdom, so assert their actual empty/invalid state instead of assuming arbitrary text survives type=date. Validate rollover rejection through the parser's reachable form path without adding test-only product exports.

Use Europe/Warsaw transition dates March 29 and October 25, 2026: choosing those End dates must produce March 30 and October 26 at local 00:00. Assert local components and next-midnight timestamps; do not assert a fixed 24-hour difference.

For custom-columns, capture columns through a Gantt boundary mock and invoke the real duration render callback with a typed ColumnApi formatter spy. Assert delegation and exact return value, including 0 and a fractional result. Add one integration test with the real CustomColumnsDemo and real Gantt, following the library defaultColumns exemplar, asserting the Write spec row's duration is 5. Use scoped row queries, not a global getByText("5") that may match axis ticks. Separate mocked and real-library tests if module mocking requires a distinct file (allow `apps/docs/tests/custom-columns.integration.test.tsx` for this purpose). Do not import private library internals or reproduce its duration algorithm in a mock and call that integration evidence.

## Done criteria

- [ ] Invalid or reversed dates never call updateTask; errors are accessible and the form remains editable.
- [ ] Last-occupied End round-trips to exclusive storage correctly, including DST, leap-day and year rollover.
- [ ] Untouched dates retain exact timestamps and optionality; minimal patches remain minimal.
- [ ] The Days cell uses ColumnApi.format.duration and Write spec displays 5.
- [ ] Docs regression tests cover the above and root tests discover them.
- [ ] The consumer editor decision is recorded and indexed in an ADR.
- [ ] Full `./init.sh` passes, patch hygiene passes, scope is clean and status reflects evidence.
- [ ] No library changes or commits.

## STOP conditions

- Plan 001 is not ready or its test integration is failing.
- Public date helper signatures or formatter contracts have drifted; reconcile before coding.
- The solution appears to require library changes, new dependencies or fixture rewrites.
- A focused verification still fails after two reasonable correction attempts; report the failure instead of weakening assertions.
- Full gate remains environment-blocked; record the blocker rather than editing Next config or claiming completion.

## Maintenance notes

Date-only input intentionally loses time precision only for explicitly changed fields. Keep untouched-field regression tests if the editor grows. Working-time calendars, duration-only editing workflows and a datetime editor are separate features; never silently infer those semantics here. Finding 5 (working-time labels) is deferred. The default Days header remains accurate only while this example uses the default day duration unit.

## Implementation evidence — 2026-10-08

Implemented in the working tree at the maintainer’s request. Docs: 39 passing tests across eight files (16 foundation, 23 date/column regressions). Root pnpm test also passes all 587 library tests. Root Vitest project discovery passes. Frozen install, types, lint (six existing warnings), formatting and patch hygiene pass. Full ./init.sh reaches docs build and fails on Turbopack worker port binding with Operation not permitted, including an escalated retry. No library source changes or commits.

Additional build evidence: `pnpm --filter @am/docs exec next build --webpack` passed and prerendered 23 pages. This does not replace the mandatory Turbopack gate.
