# Plan 001: Run persistent docs regression tests in the repository gate

> **Executor instructions:** Read this entire plan, follow the steps in order, and verify each step. Do not implement the audited date bugs in this plan. Leave changes uncommitted. Update the status row in plans/README.md with actual verification evidence; never mark DONE while the mandatory gate fails.
>
> **Drift check:** `git diff --stat 6efd01a..HEAD -- apps/docs/package.json apps/docs/components apps/docs/lib/examples.ts apps/docs/app/examples vitest.config.ts turbo.json pnpm-lock.yaml`
> Also run `git status --short` and inspect uncommitted changes. Recompare the excerpts below if those owners changed. New files listed in Scope must be absent or inspected before use; do not overwrite pre-existing tests.

## Status

- Priority: P1
- Effort: M (approximately one day including test integration)
- Risk: LOW — development dependencies, configuration and tests only
- Depends on: none
- Category: tests
- Planned at: commit `6efd01a`, 2026-10-08
- Status: BLOCKED — implementation complete; full gate blocked by Turbopack worker port restrictions

## Why this matters

The docs app now has searchable examples, active-route navigation and a mobile menu, but none is covered by the repository's test command. Its chart hydration boundary is also important: removing it can introduce locale/date geometry hydration mismatches. Add a small, deterministic component/metadata suite that runs under both the app command and the existing root gate. This provides a home for subsequent date-example regression tests without changing the library or freezing known bugs as expected behavior.

## Current state

- Next.js 16.3, React 19.2.5, TypeScript 6 and pnpm 10.0.0 monorepo. Root `pnpm test` runs `turbo run test`.
- `apps/docs/package.json:7` has dev/build/start/check-types/lint/lint:fix, but no test script or test dependencies.
- `vitest.config.ts:3` currently contains:

  ```ts
  export default defineConfig({
    test: { projects: ["packages/*"] },
  });
  ```

- `turbo.json` has `"test": {}`; dependency libraries expose built dist files, not source. `@am/docs#check-types` already depends on `^build`. Give the new docs test task the same build prerequisite, ready for later real demo tests.
- `packages/react-gantt/vitest.config.ts` is an exemplar only: it uses `@vitejs/plugin-react`, jsdom, a project name, setupFiles and restoreMocks. Its current timezone is Europe/Warsaw. Do not edit or copy its CSS-module behavior into the docs suite; the selected docs tests need no chart CSS.
- `packages/react-gantt/src/tests/setup.ts` imports jest-dom/vitest and runs cleanup after each test. `src/tests/components/taskList/defaultColumns.test.tsx` demonstrates render/fireEvent/screen with explicit Vitest imports. Match this pattern without importing library test files.
- `apps/docs/tsconfig.json` maps `@/*` to the app root and includes all TS/TSX. The new test config must resolve that alias itself; do not rely on Next to run Vitest.
- `apps/docs/components/example-catalog.tsx:9`:

  ```ts
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = EXAMPLES.filter((example) => {
    const text = `${example.title} ${example.blurb} ${example.group}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });
  ```

  Search has a visible label, a role=status result count, an empty message and a Clear search button. Group sections with no matches disappear.

- `apps/docs/components/nav.tsx` gives only an exact pathname match `aria-current="page"`. `EXAMPLES`/`EXAMPLE_GROUPS` in `lib/examples.ts` own route metadata and grouping.
- `apps/docs/components/mobile-nav.tsx` returns null outside `/examples/`; its details element is keyed by pathname. Link clicks close the disclosure. Escape closes it and focuses its summary. This is an inline native disclosure, not a modal; do not introduce a focus trap.
- `apps/docs/components/client-only.tsx`:

  ```ts
  const getSnapshot = () => true;
  const getServerSnapshot = () => false;
  const hydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return <>{hydrated ? children : fallback}</>;
  ```

  Preserve the real implementation. Test the boundary with harmless child content, not the Gantt chart.

- Example routes live in `apps/docs/app/examples/<slug>/{page,demo}.tsx`; no dynamic slug route is used. Each catalog entry must correspond to a directory with both files.
- Existing uncommitted changes at planning time: `apps/docs/app/globals.css` and `apps/docs/components/site-header.tsx`. Preserve them. `plans/` contains advisor artifacts.

Repository conventions: curly braces for conditionals, early-return guards, clsx for conditional class composition, and explanatory comments only where they preserve reasoning. Do not annotate config properties. Tests should assert observable behavior rather than Tailwind classes or large snapshots. Root AGENTS.md prohibits commits and requires `./init.sh` before completion.

## Commands you will need

Run from repository root unless explicitly noted. Existing commands are distinguished from commands enabled by this plan.

| Purpose                                             | Command                                      | Expected result                                               |
| --------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| Baseline/final mandatory gate                       | `./init.sh`                                  | All steps pass; record pre-existing failures separately       |
| Install after manifest edits                        | `pnpm install`                               | Lockfile updated without unrelated dependency upgrades        |
| Validate lockfile                                   | `pnpm install --frozen-lockfile`             | Exit 0, no manifest/lockfile mismatch                         |
| New docs tests with dependency builds               | `pnpm exec turbo run test --filter=@am/docs` | Dependency builds and docs tests pass                         |
| New direct app test command, after dependency build | `pnpm --filter @am/docs test`                | Docs project tests pass                                       |
| Root test integration                               | `pnpm test`                                  | Both docs and existing library tests run and pass             |
| Workspace Vitest discovery                          | `pnpm exec vitest run --project docs`        | Docs tests discovered from root project configuration         |
| Types                                               | `pnpm check-types`                           | All workspace checks pass including test files                |
| Lint                                                | `pnpm lint`                                  | No errors; do not fix unrelated warnings                      |
| Format                                              | `pnpm format:check`                          | No mismatches; format only files changed by this plan         |
| Inner loop                                          | `./init.sh --quick`                          | Lint/types/tests/format pass; not a replacement for full gate |
| Patch hygiene                                       | `git diff --check`                           | No whitespace errors                                          |

The advisor ran read-only lint and tsc on the app successfully. Recent implementation sessions repeatedly hit a local Turbopack worker-port restriction during the docs build. That historical limitation is not permission to skip the executor's baseline or claim the full gate passed.

## Scope

Only modify/create:

- `apps/docs/package.json`
- `apps/docs/vitest.config.ts` (new)
- `apps/docs/tests/setup.ts` (new)
- `apps/docs/tests/example-catalog.test.tsx` (new)
- `apps/docs/tests/nav.test.tsx` (new)
- `apps/docs/tests/mobile-nav.test.tsx` (new)
- `apps/docs/tests/client-only.test.tsx` (new)
- `apps/docs/tests/example-registry.test.ts` (new)
- `vitest.config.ts`
- `turbo.json`
- `pnpm-lock.yaml` (generated dependency changes only)
- `plans/001-docs-regression-tests.md` and `plans/README.md` (status/evidence only)
- Existing ignored `.claude/harness/progress.md` and `session-handoff.md` if recording the required local handoff.

Out of scope: all product components/styles/routes, all library files and library tests, date bug fixes, end-date semantics changes, theme controls, browser-test infrastructure, root package scripts, init.sh, CI workflows, releases, snapshots of markup, general dependency upgrades and unrelated design-plan files. A docs test script integrates into existing CI through root `pnpm test`; do not add a parallel CI job.

## Git workflow

Work on the operator's current checkout, preserving existing edits, or in the isolated worktree supplied by a dispatcher. Do not create commits, merge, push or open a PR. The repository's no-commit instruction overrides any generic executor habit.

## Steps

### 1. Record baseline and establish the docs test project

1. Read AGENTS.md and current local handoff; inspect the files and excerpts above. Run the drift check and baseline gate. Record actual failures before edits.
2. Add `test: "vitest run"` and `test:watch: "vitest"` to the docs scripts.
3. Add docs devDependencies matching the current library's declared versions: `vitest ^4.1.5`, `@vitejs/plugin-react ^6.0.1`, `@testing-library/react ^16.3.2`, `@testing-library/dom ^10.4.1`, `@testing-library/jest-dom ^6.9.1`, and `jsdom ^29.1.1`. Recheck manifests first; if versions drift, report before changing the toolchain. Use the existing lockfile resolution; do not install testing dependencies into the library or use transitive imports.
4. Create docs Vitest config with React plugin, explicit root from `fileURLToPath(new URL(".", import.meta.url))`, `@` alias pointing at that root, name `docs`, environment `jsdom`, setup `./tests/setup.ts`, include `tests/**/*.{test,spec}.{ts,tsx}`, restoreMocks true, and test timezone `Europe/Warsaw` to match the existing test environment for later date cases. Do not add comments explaining config properties.
5. Setup imports jest-dom/vitest, registers RTL cleanup after each test, and restores any stubbed globals. Use explicit imports rather than globals mode. Do not globally mock the application, chart, dates, or navigation state.
6. Add the registry tests in step 2 before attempting the first test run; do not enable passWithNoTests to hide an empty suite.
7. Add `apps/docs` alongside `packages/*` in root Vitest projects. Add `"@am/docs#test": { "dependsOn": ["^build"] }` to turbo.json, preserving existing tasks. Update the lockfile with `pnpm install`.

**Verify:** `pnpm install --frozen-lockfile` exits 0; after step 2's registry tests exist, `pnpm exec turbo run test --filter=@am/docs` discovers the docs project and passes. No product code or library manifest changes.

### 2. Protect catalog/route ownership

Create `tests/example-registry.test.ts` using the Node test environment via Vitest's per-file environment directive. Import the real EXAMPLES and EXAMPLE_GROUPS. Use paths resolved from import.meta.url, never the shell's current directory.

Write three tests:

1. All slugs are unique and all groups refer to declared EXAMPLE_GROUPS.
2. Every metadata slug has page.tsx and demo.tsx in its example directory.
3. Every example directory containing page.tsx appears exactly once in EXAMPLES. Ignore files such as layout.tsx; do not snapshot the current count or prohibit future examples.

Do not import Next route modules or regex their implementation. This test protects the manually maintained catalog without trying to reimplement Next's routing.

**Verify:** `pnpm --filter @am/docs exec vitest run tests/example-registry.test.ts` → three tests pass from app cwd; root discovery also includes them.

### 3. Cover search and navigation behavior

Use real ExampleCatalog, Nav, MobileNav and metadata. Mock only framework boundaries: `next/navigation.usePathname` with per-test controllable pathname, and next/link with a plain anchor preserving children/href/aria and normal event propagation. Prevent default anchor navigation in the link mock so jsdom does not attempt a document navigation. Do not assert Next prefetching, routing or browser history from these tests. Use vi.hoisted for mutable mock state and reset it before each test.

`example-catalog.test.tsx` — five tests:

1. Initially renders every example destination, in group order, with the correct contextual count derived from EXAMPLES.length.
2. Query `  CUSTOM   ZOOM  ` normalizes case/whitespace and finds the custom-zoom entry using all terms, not OR matching.
3. A group query such as `Interaction` finds entries through their group field; groups with no results are omitted.
4. An unmatched query produces zero links, the empty-state message and a zero-result status.
5. Clear search empties the input, restores the catalog/count and removes the reset button.

`nav.test.tsx` — two tests:

1. Exact current route receives aria-current=page; only one example is current.
2. Changing pathname updates the marker; a prefix-only route does not activate the wrong example. Compare destinations with real metadata.

`mobile-nav.test.tsx` — four tests:

1. Absent on `/`, present on an example route.
2. After explicitly opening details, clicking a real descendant link closes it (use its text child to exercise closest("a")). Do not claim jsdom models native summary toggling.
3. Escape closes an open disclosure and returns focus to summary; unrelated keys leave it open.
4. Change mocked pathname and rerender: keyed disclosure resets closed and its real Nav marks the new route current.

Prefer render/screen/fireEvent/within as in the existing library test exemplar. Assert labels, links, status text, focus and details.open; do not assert CSS utility strings, layout, contrast or animation timing.

**Verify:** `pnpm --filter @am/docs exec vitest run tests/example-catalog.test.tsx tests/nav.test.tsx tests/mobile-nav.test.tsx` → eleven tests pass without React act warnings or jsdom navigation errors.

### 4. Protect the hydration boundary without mounting the chart

`client-only.test.tsx` — two tests using the real component:

1. renderToString produces fallback content and no child content.
2. Insert that server output into a host, hydrateRoot with matching props inside React act, and assert the child replaces fallback after hydration. Capture onRecoverableError and assert no recoverable hydration error. Explicitly unmount the hydration root and remove its host during cleanup.

Use a plain text/span child, no Date or Gantt dependency. Do not mock useSyncExternalStore or replace ClientOnly with a stub. This protects its actual SSR/client contract, not a mock implementation.

**Verify:** `pnpm --filter @am/docs exec vitest run tests/client-only.test.tsx` → two tests pass with clean hydration and no leaked root/act warnings.

### 5. Verify integration and record the result

Run direct docs tests, `pnpm exec vitest run --project docs`, root `pnpm test`, then `./init.sh`. The docs suite must contain at least sixteen tests across the five test files above (3 registry + 5 search + 2 nav + 4 mobile + 2 hydration). Do not add meaningless tests just to increase a count.

Review generated lockfile changes for only the declared test dependencies. Confirm the library tests still run. Check modified-file scope against the initial dirty tree so existing user changes are not misattributed. Update the plan/index with commands, counts and any blocker. If the known environment failure persists after unaffected checks pass, mark BLOCKED with the build reason rather than DONE.

**Verify:** `pnpm test` includes a successful `@am/docs:test` task and the existing library task; `pnpm exec vitest run --project docs` passes; `./init.sh` exits 0 before DONE; `git diff --check` is clean.

## Done criteria

- [ ] Both docs scripts exist and resolve local declared test dependencies.
- [ ] Five test files contain at least sixteen meaningful passing cases listed above, with no skipped/todo expected regressions.
- [ ] Root Vitest discovers docs and root pnpm test runs docs plus library tests.
- [ ] No product component, fixture, library file, date behavior or CI script was modified.
- [ ] Frozen install, types, lint, formatting, tests and full `./init.sh` pass.
- [ ] plans/README.md records actual status/evidence; no commits or pushes.

## STOP conditions

- Current component contracts differ from excerpts; reconcile before writing assertions.
- The known date bugs are encountered: report them as deferred, do not fix them or assert the broken behavior as desired.
- A test requires changes to product components or library implementation; report the failing contract before broadening scope.
- New tests fail twice after reasonable test/config corrections; report the exact failure rather than skipping tests, weakening assertions or adding global mocks.
- Registry access prevents installing the already-selected dependencies; report the blocker, do not change versions or use undeclared transitive packages.
- The final gate is blocked by the existing Turbopack environment restriction; preserve successful evidence and request a suitable verification environment. Do not modify Next config or bypass the gate.

## Maintenance notes

Metadata additions should naturally expand registry coverage; only intentional search fixtures should require test updates. The framework mocks deliberately do not validate real Next navigation, responsive layout or native browser hit testing; those remain browser-review responsibilities. Future date-fix plans should add tests under apps/docs/tests, consume the established timezone and validate unchanged editor submissions, inclusive-display/exclusive-storage conversion and invalid input. Do not move those tests into packages/react-gantt or change library semantics.

## Implementation evidence — 2026-10-08

Implemented in the working tree at the maintainer’s request. Docs: 39 passing tests across eight files (16 foundation, 23 date/column regressions). Root pnpm test also passes all 587 library tests. Root Vitest project discovery passes. Frozen install, types, lint (six existing warnings), formatting and patch hygiene pass. Full ./init.sh reaches docs build and fails on Turbopack worker port binding with Operation not permitted, including an escalated retry. No library source changes or commits.

Additional build evidence: `pnpm --filter @am/docs exec next build --webpack` passed and prerendered 23 pages. This does not replace the mandatory Turbopack gate.
