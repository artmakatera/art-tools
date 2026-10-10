# apps/docs audit index

Audited 2026-10-08 against commit `6efd01a` plus existing uncommitted changes in apps/docs/app/globals.css and apps/docs/components/site-header.tsx. Standard-depth audit, limited to apps/docs and directly relevant build/test/library contracts. The audit was read-only; the subsequent implementation changed the scoped docs files and test integration. The maintainer selected docs tests first; plan 001 is implemented; full-gate verification remains blocked. The maintainer also selected date-example findings 2–4; plan 002 follows plan 001. Finding 5 was also implemented at the maintainer’s request.

## Execution order & status

| Plan                                | Title                                                       | Priority | Effort | Depends on | Status                               |
| ----------------------------------- | ----------------------------------------------------------- | -------- | ------ | ---------- | ------------------------------------ |
| [001](001-docs-regression-tests.md) | Run persistent docs regression tests in the repository gate | P1       | M      | None       | BLOCKED: Turbopack build environment |
| [002](002-date-example-fixes.md)    | Correct date editing and duration display in docs examples  | P1       | M      | 001        | BLOCKED: Turbopack build environment |

Plan 001 establishes coverage before plan 002 fixes date examples. Both plans are implemented in the working tree. All 39 docs and 587 library tests pass, as do types, lint and formatting. Full ./init.sh is blocked by the environment’s Turbopack worker-port restriction, including an escalated retry. No library source changed and nothing was committed.

## Vetted findings

| ID  | Finding                                              | Evidence                                                                                             | Impact                                                                                         | Effort | Fix risk                                   | Confidence | Status                                        |
| --- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------ | ------------------------------------------ | ---------- | --------------------------------------------- |
| 1   | Add docs regression coverage                         | apps/docs/package.json:7; vitest.config.ts:5; no docs test files                                     | New navigation/search and demo date behavior are outside the test gate                         | M      | Low: test/config only                      | High       | Planned: 001                                  |
| 2   | Validate task-editor date input                      | apps/docs/app/examples/task-editing/demo.tsx:14,41,53,113,117                                        | Empty dates become Invalid Date patches; inverted spans are accepted                           | S      | Low: editor boundary only                  | High       | Planned: 002                                  |
| 3   | Correct the custom duration column                   | apps/docs/app/examples/custom-columns/demo.tsx:51; apps/docs/lib/demo-tasks.ts:25                    | Jan 5 to exclusive Jan 10 displays six instead of five days                                    | S      | Low: demo renderer only                    | High       | Planned: 002                                  |
| 4   | Align editor End with the chart's final occupied day | apps/docs/app/examples/task-editing/demo.tsx:45,89; packages/react-gantt/src/core/taskDates.ts:51,64 | Chart displays Jan 9 while editor shows Jan 10; selecting Jan 9 stores a boundary ending Jan 8 | S      | Low: date conversion needs DST/no-op tests | High       | Planned: 002                                  |
| 5   | Correct working-time labels across presets           | apps/docs/app/examples/working-time/demo.tsx:20,79                                                   | Office-hours preset interprets 3/2 as hours while names still say working days                 | S      | Low: keep scheduling behavior unchanged    | High       | Implemented; full gate blocked by environment |

Suggested plan grouping: (1) persistent docs tests, (2) date-example corrections covering findings 2–4 with regression tests, (3) working-time label correction with a preset regression test. Establish the docs test integration first; the other plans can then proceed independently. Do not modify library implementations.

## Direction options

- Self-contained example source bundles: ExamplePage currently includes demo.tsx and colocated extras only (apps/docs/components/example-page.tsx:34); demos import hidden shared fixtures (e.g. apps/docs/app/examples/basic/demo.tsx:4). Provide the fixture/setup files alongside examples so consumers can reproduce them. M effort; requires keeping displayed dependencies synchronized with real source rather than duplicating hand-written snippets.
- Expose the existing docs dark theme: apps/docs/app/globals.css:24,45,61 supports class-based dark styling but app/layout.tsx and site-header.tsx provide no preference control. S–M effort; handle initial paint and persistence deliberately, and keep docs theme distinct from chart-specific theme examples.

## Considered and rejected

- Shiki HTML as XSS: source is trusted repository text processed by the escaping highlighter; no user-controlled HTML boundary was found.
- Source-reader path traversal: callers supply trusted build-time route/file constants, not request paths.
- ClientOnly as an unnecessary SSR workaround: it intentionally avoids locale/date geometry hydration mismatch; preserve it.
- ignoreBuildErrors as a missing CI type gate: init.sh runs check-types before build. The separated checks are deliberate.
- Repeated filtering of the 20-entry catalog: no meaningful performance evidence; not worth refactoring for speed.
- Turbopack port restriction as a product defect: prior task verification identifies a local execution-environment restriction. No new build was run in this read-only audit.
- Dependency lag/advisories: pnpm audit --prod --json failed with registry DNS ENOTFOUND. No verified advisory or upgrade recommendation.

## Verification and limits

Passed read-only checks: `pnpm exec oxlint apps/docs` (0 warnings/errors), `pnpm exec tsc --project apps/docs/tsconfig.json --noEmit --incremental false`. Pure arithmetic reproduction confirms the custom Days calculation returns 6 for a 5-day span and empty input parsing yields Invalid Date. No new tests, installs, formatters or builds were run.

Not audited: library internals beyond direct contracts, playground, live production configuration, rendered responsive/accessibility behavior, dependency advisories unavailable from the registry, and comprehensive performance profiling. No confirmed security finding in inspected source; this is not a security certification.

For future executors: exact repository gate is `./init.sh`; inner loop `./init.sh --quick`; individual checks `pnpm test`, `pnpm check-types`, `pnpm lint`, `pnpm format:check`, `pnpm build`. Full gate must pass before calling implementation complete; prior environment failures must be recorded separately from new regressions.

## Finding 5 implementation — 2026-10-08

Working-time task names are unit-neutral; explanatory text follows the active duration unit and distinguishes plain days from working days. Two regression tests cover all presets and retention of edited task state. No scheduling/library changes. Full gate passes 41 docs tests, 587 library tests, types, lint and formatting, then fails at the existing Turbopack worker-port restriction.
