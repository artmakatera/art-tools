# Refactoring `packages/react-gantt` for extensibility

## Context

The ask was: apply development best practices, remove unnecessary comments (except JSDoc), and open the
library up to future features (e.g. a plugin pattern) without changing current behaviour.

**The comment-removal goal is not supported by the evidence, and we are dropping it.** I counted every
non-JSDoc comment block in `src/` (excluding tests): 121 blocks, of which **six are genuinely redundant**
— and two of those are in `hooks/usePropsWatcher.ts`, a dead file. Against that:

- **26 code sites cite ADRs**, and **12 of the 21 ADRs are reachable from code only through those
  comments**. `docs/adr/README.md:6` instructs exactly this: _"Cite these from code comments where the
  reasoning is non-obvious."_ The ADR→code line references are already stale; the code→ADR citations are
  the durable half of the link.
- "Except JSDoc" cuts along the wrong axis: it would gut `GanttContext.tsx` (98 comment lines, nearly all
  `//`, holding the entire "contexts split by update frequency" architecture) while sparing `types.ts`
  (135 lines, mostly JSDoc).
- Comments are the only record of **four fixed bugs**, one accepted known gap
  (`TaskListHeader.tsx:124-132`), the only measured perf datum (`virtualize.ts:14`), and the
  `startTransition` pairing invariant in `Bar.tsx` — which **no test can catch**, because `act()` collapses
  transition and urgent lanes.

Instead we write down a comment policy so "unnecessary" stops being subjective, delete the six, and spend
the effort on the real problem: **navigability**. A 586-line provider doing eleven jobs, 42 violations of
the project's own brace rule, origin derivation hand-rolled in five places, two accidental test
directories, and 230 lines of pure routing math with zero tests.

**A latent bug was found while verifying this and it changes one phase.** `dateUtils.ts:228-232` claims
"Grid and TaskList both derive their origin from this so their pixel math cannot drift." They do drift.
`addDays` zeroes to local midnight then adds fixed ms, so `addUnit(x, "day", 0)` is not identity — it
re-zeroes the time. Grid's origin passes through that re-zeroing (`buildDates` → `addUnit(start, unit, 0)`),
TaskList's and `useZoom`'s do not. Verified in `Europe/Warsaw` with a task starting `2026-03-30`
(day after spring-forward):

```
taskList/useZoom origin = Sat Mar 28 2026 23:00   grid/bars origin = Sat Mar 28 2026 00:00
Δ = 23h → 38.3px at colWidth 40 ≈ one full column.   In UTC: Δ = 0.
```

It is invisible in UTC, and **no timezone is pinned in `vitest.config.ts`**, so a UTC CI can never see it.
Consequences: row-select reveals the grid to the wrong offset, and cursor-anchored zoom anchors on the
wrong date, in any DST timezone.

### Decisions taken (settled — do not relitigate)

| Question       | Decision                                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comments       | Keep all rationale/invariant/ADR citations. Delete the six verified-redundant blocks; add a policy to `CLAUDE.md`.                                                |
| Extension axes | All four, sequenced cheapest-first behind one contract (ADR-022).                                                                                                 |
| Calendars      | **Declarative data only.** No injectable `isWorking()` — it voids the whole-week binary skip (`workingTime.ts:239-241`) and the content-key cache simultaneously. |
| Vetoes         | **Synchronous only.** An async veto reintroduces the measured ~130ms drag snap-back.                                                                              |
| Verification   | Characterization tests **first** for anything untested that a later phase touches.                                                                                |
| Public API     | Free to change (package is `0.0.0`, pre-1.0).                                                                                                                     |
| Existing work  | Land the uncommitted `startTransition` change and re-apply the reverted perf work **before** refactoring.                                                         |

---

## Phase A — land existing work first

Both touch files every later phase moves, so landing them first avoids guaranteed conflicts.

1. **Commit the `startTransition` change** already in the tree: `components/bars/common/Bar.tsx` +
   `hooks/useTaskList.ts`. Verified this session: no snap-back (bar holds at the preview position through
   mouseup, then commits once), 406 tests green.
2. **Re-apply the reverted O(n)-per-edit perf work**: split `computeDependencyLinks` into
   `computeLinkGeometry` + `reRouteOverrides` with a lazily-built task→link index
   (`components/dependency-links/geometry.ts`, `DependencyLinksContext.tsx`); `overlayOf`/`TaskWorkingSet`
   in `core/scheduling.ts` replacing the defensive `new Map(resolved)` in `hooks/useTaskList.ts`; lazy
   `taskById` in `hooks/useExpand.ts`. Measured: drag frames 116ms → 0.4ms at 100k, one edit 233ms → 160ms.
   This also brings 8 `geometry.ts` tests, which is most of the Phase B geometry safety net.

---

## Phase B — safety net (no production code changes)

3. **Pin the timezone** in `vitest.config.ts` (`test.env.TZ`) to a DST zone such as `Europe/Warsaw`.
   Nothing pins it today, so every date test is machine-dependent. **Run the full suite immediately after
   and expect fallout** — treat whatever breaks as discovery, not as a regression introduced here.
4. **Context cadence test** — `src/tests/context/contextCadence.test.tsx`. The linchpin of Phase D: mount
   `GanttProvider` with 13 probes, each calling exactly one consumer hook and counting renders. Record the
   vector under: mount, grid scroll, row click, `toggleExpand`, `zoomIn`, drag start, drag move, and
   **rerender with identical props (expect all +0)**. This turns the comment at `GanttContext.tsx:52-59`
   into an executable contract. Without the identical-props case a churning memo slips through.
5. **Remaining characterization tests**, cheapest first:
   - `apiRef`'s 9 members + exact `columnApi.format.endDate` / `.duration` values (with and without a
     calendar, and `durationUnit: "hour"`).
   - Exact `scrollLeft` in `test/scrollOnSelect.test.tsx` (currently only asserts `> 0`) — this is the
     guard for moving TaskList's horizontal math, and it will need updating once the DST fix lands.
   - The default column catalogue: 5 columns, 3 action-button `aria-label`s, `READ_ONLY_COLUMNS` dropping
     exactly one.
   - `hooks/useZoom.ts` cursor anchoring — note its `useLayoutEffect` has a deliberately incomplete dep
     array and an **inert** `eslint-disable` (this package lints with oxlint, not ESLint).
   - Pure and cheap: `core/slots.ts` `mergeSlotProps` (publicly exported, contains an `as Props` cast),
     `core/utils.ts` `memoize` (caches `getMinMaxDates` at size 3), `core/queue.ts` `Queue` (backs the
     cascade BFS including a `dequeue()!`).

---

## Phase C — mechanical cleanup (behaviour-preserving)

6. **Comment policy** in `CLAUDE.md`: comments record _why_, not _what_; cite ADRs where reasoning is
   non-obvious; invariants that no test can express must be commented. Then delete the six redundant
   blocks (`hooks/usePropsWatcher.ts:9,13` — moot once the file goes; `TaskList.tsx:93,126`;
   `GanttContext.tsx:421`; trim the restating half of `useExpand.ts:32-34`).
7. **Brace rule + make it enforceable.** 42 violations across 13 files (`core/scheduling.ts` ×12,
   `hooks/useTaskList.ts` ×7, `hooks/useExpand.ts` ×5, `hooks/useAutoScroll.ts` ×4, and 9 others).
   The drift exists _because_ `@am/oxlint-config/react.json` sets `"style": "off"` — try enabling `curly`
   in `packages/react-gantt/.oxlintrc.json`; if oxlint can't, say so in the commit so nobody re-derives it.
8. **Dead code**: delete `hooks/usePropsWatcher.ts` (zero importers) and the unused `Overrides` type
   (`types.ts:280`) — or better, use it at `Grid.tsx:116`, which spells the same shape inline.
   `revealAncestors` is **not** dead-and-deletable: `types.ts:111-112` documents ancestor auto-expansion
   that `useScrollToTask.ts:38-40` never implements. Fix the doc here; implement it in Phase D.
9. **Formatting**: `pnpm format:check` reports 126 of 223 files unformatted because oxfmt has no config.
   Add a config and do a one-time pass **as its own commit** — it is unreviewable mixed with logic changes.
   Folds in the quote-style split (`index.ts`, `core/utils.ts`, all of `test/` use single quotes vs 57
   files double) and the broken indentation at `dateUtils.ts:257,259`, `GanttContext.tsx:559-562,581-583`.
10. **Consolidate the two test directories.** `vitest.config.ts` globs both `test/` (10 files, barrel
    imports) and `src/tests/` (22 files, direct imports); both hold unit _and_ integration tests, so the
    split is history, not design. Pick one layout, keep `test/setup.ts` wired, and check whether
    `src/tests/` is excluded from declaration emit.

---

## Phase D — structural refactor

Ordered by navigability-per-unit-of-risk. Each is its own commit; the cadence vector from step 4 must be
byte-identical after every one.

11. **`GanttSlotsProvider` + `useGanttSlots` exports** — one line, do it first. Today the composable
    `GanttProvider` path (a headline README feature) **cannot supply the `bars`/`dependencySlots`/`timeline`
    slot groups at all**; only `<Gantt>` can mount the provider. This is a bug, not hygiene.
12. **Extract the default columns.** `TaskListHeader.tsx` (229 lines) holds the header component _plus_
    `DEFAULT_COLUMNS`/`READ_ONLY_COLUMNS` with inline button JSX — so `Gantt.tsx:9` imports column _data_
    from a leaf presentation file. Move to `components/taskList/defaultColumns.tsx` (+ an `ActionsCell`
    component), and export `DEFAULT_COLUMNS`, `READ_ONLY_COLUMNS`, `ACTION_COLUMN_KEY`. That last one is
    what lets consumers _extend_ rather than replace the column set.
13. **Split `GanttContext.tsx`** (586 lines, eleven jobs) into: `context/contexts.ts` (12 context objects,
    13 hooks, the value interfaces, the cadence table), `context/GanttProvider.tsx` (composition + memos +
    the provider pyramid), `context/useGanttHandle.ts`, `context/useColumnApi.ts`. Move `columnApi`'s
    date-math bodies into `core/taskDates.ts` as `displayEndOf`/`workingDurationOf` (pure, unit-testable).
    Deduplicate `apiRef` and `columnApi`, which share nine members that _are_ `GanttHandle`.
    - **Preserve all 12 context boundaries and the nesting order.** Order is not semantically significant
      today (no layer derives its value from another, all wrap `children`), but it documents the
      architecture and becomes load-bearing the moment a layer becomes a component.
    - **Preserve both error conventions** — 7 hooks throw, 6 return defaults so components render bare in
      slot tests. Consider a `useRequiredContext` helper so the distinction is visible at the call site
      rather than only in a comment.
    - **`useColumnApi` must destructure its args at the top**, or a fresh args object churns `columnApi` →
      `taskActionsValue` → every row. This is the easiest way to silently destroy the perf architecture;
      the identical-props cadence case is what catches it.
    - Resolve `GanttProps` vs `GanttProviderProps` (49 near-duplicate props, already drifted) with a shared
      `GanttEngineProps` base in `types.ts`. Make `height` optional — required-with-doc-saying-"omit" is a
      typing bug; the runtime has always supported `undefined`.
14. **Fix the DST origin drift and unify origin derivation.** Add `core/timeline.ts` owning
    `getMinMaxDates`/`resolveOrigin`/`buildDatesFromTasks` plus a single `timelineOrigin(tasks, scales,
padDays)`, and route all five current derivations through it (`dateUtils.ts:281-284`, `Grid.tsx:133-142`,
    `TaskList.tsx:57-60`, and the two byte-identical copies at `useZoom.ts:84-88` and `:125-129`).
    **This is a deliberate behaviour change** — make `resolveOrigin` normalise to the unit boundary after
    padding so it matches what `dates[0]` produces (Grid is authoritative; bars are positioned from it).
    Correct the false comment at `dateUtils.ts:228-232`. Regression test must pin a DST timezone and use a
    post-spring-forward start date. `dateUtils.ts` then keeps only unit/instant math and `periodKey`, and
    becomes a dependency-free leaf.
15. **One `revealTask(id, { horizontal, vertical })`.** Today `TaskList.tsx:55` declares a component-local
    `scrollToTask(task)` doing _horizontal_ reveal while the context publishes `scrollToTask(id)` doing
    _vertical_ — same name, different axis — and the vertical one is published through four channels of
    which **no component reads two**. Consolidate into `hooks/useRevealTask.ts`; default
    `{ vertical: true, horizontal: false }` so a bare call is byte-identical to today. Drop the two dead
    context channels, rename on `GanttHandle`/`ColumnApi` (breaking, pre-1.0), update
    `apps/docs/app/examples/imperative-api/demo.tsx` and `README.md`. Leave `core/scroll.ts` alone.
16. **Implement ancestor auto-expansion** — separate commit, **deliberate behaviour change**: it makes
    `types.ts:111-112` true for the first time. Use a pending-ref + `useLayoutEffect` keyed on
    `visibleTasks` (the pattern `useZoom.ts:114-132` already uses), not `flushSync` — `revealTask` is
    public and a consumer may call it from an effect. Clear the pending entry unconditionally or a later
    unrelated expand fires a phantom scroll.
17. **Export surface**, last (paths must be final). Rule to write into `index.ts`: _a context hook is
    exportable iff every type transitively reachable from its value type is also exportable._ That admits
    7 hooks and excludes the 6 pane-wiring ones without arbitrariness. Also export `CalendarProps` +
    `IndexRange` (without which the exported `Calendar` is unusable), `GanttProviderProps`, the 5
    `DependencyLinks` ownerStates plus `DependencyLink`/`Point`; collapse the three `export type ... from
'./types'` statements into one; remove `mergeSlotProps` (internal plumbing, zero usage in `apps/`).
    Add a sorted-export-keys snapshot test so the next asymmetry can't land unnoticed.

---

## Phase E — ADR-022, the extension contract

Write the contract before implementing any axis, so four axes don't grow four conventions. Match the
existing ADR format (chosen / rejected / cost knowingly accepted).

**Recommendation: four separate typed extension points governed by one contract — not a `plugins[]` prop.**
A plugin array would be a second way to do slots (15 components already resolve
`slotsProp ?? ganttSlots.<group>?.<key>?.slots`), it is the worst possible shape for this codebase's
identity discipline (plugin objects hold closures, so unlike `GanttCalendar` they cannot be content-keyed),
and one churning member would invalidate all four axes — the exact churn the 12-context split exists to
avoid. Distribution is solved without a runtime prop by a `GanttPreset` props-factory + `useGanttPreset`
merge helper, so composition happens at the consumer's boundary and the render path keeps zero merge logic.

Contract rules to record: three kinds of extension (render override / notification-veto / behaviour
registration), one identity technique per kind (data content-keyed, functions latest-ref'd, component types
documented-stable + dev-warned), nearer-wins resolution, everything synchronous, and _a closed union opens
only when the `switch` is the whole cost_.

---

## Phase F — implement the axes, cheapest first

18. **Slots.** Dev-only `useStableProp` warner (modelled on the deleted `usePropsWatcher`),
    `mergeSlotConfigs` for preset composition, `GanttPreset`/`useGanttPreset`, export the slot-author
    hooks. Explicitly not allowed: render props (a new component type per render remounts the subtree and
    loses the `hovered` state `ConnectorHandles` rides on), structural slots (geometry, virtualization
    windows and `aria-*` arithmetic assume the tree shape), and direct data mutation from a slot.
19. **Events.** `GanttEventProps` in `types.ts`, with one choke point: a private `commit(commands, intent)`
    in `hooks/useTaskList.ts` that every mutator funnels through — build transaction → no-op check → fire
    the one typed veto → write the log → fire the notification. Naming law: `onBeforeX(e) => boolean | void`
    cancels, `onX(e) => void` reports; one event object per handler so payloads grow additively; `void`
    proceeds so a handler that forgets to return can't freeze the chart. Vetoes fire **per transaction, not
    per command** — accepting a drag but rejecting its cascade would leave the schedule violating its own
    dependencies with no undo step to escape by. Read handlers through the existing `optionsRef` so inline
    handlers stay free. Migrate all 8 existing callbacks to object payloads (breaking, pre-1.0).
    A synchronous veto slots into the `Bar.tsx` transition pairing on the already-tested path: `onCommit`
    becomes a no-op, the preview clear is the only thing in the transition, the bar settles in one commit.
20. **Commands.** Open `TaskCommand` with a `` `${string}:${string}` `` reserved namespace (built-ins stay
    bare words, so shadowing is unrepresentable); `core/commands.ts` + `hooks/useCommandRegistry.ts`;
    `applyCommands` keeps its three bare-word cases as the fast path and falls through to the registry.
    Correctness rests on: **no inverse is ever needed** (the log is forward-replay with a cursor, so undo
    just decrements), handlers must therefore be **pure** with all inputs captured in the payload at
    production time, and **the registry key joins the resolve-cache key** (`ResolveCache.registryKey`), so
    registering or removing a command drops snapshots and replays — the same dump-and-replay
    `seedTasks !== tasks` already does. Unknown types are a deterministic dev-warned skip, never a throw
    (resolution happens in render). A command may not schedule, dispatch, or read the log; cascading is the
    producer's job via `dispatch(commands, { cascadeFrom })`.
21. **Scheduling.** Per-resource calendars as **data**: `GanttCalendarSet` + `GanttTask.calendarId`,
    `calendarSetKey`/`buildCalendarSet`, `useResolvedCalendars` mirroring `useResolvedCalendar`. One
    resolution rule, to go in the glossary: **every walk uses the calendar of the task whose date it
    produces** — which for FS/FF means the _successor's_, keeping ADR-007's decomposition intact. Shading
    stays chart-level (`GridColumns` renders one strip for all rows; ADR-016 keeps one linear axis).
    Keep `CalendarUnit` **closed** — opening it demands five mutually-consistent implementations including
    the `unitOffset`/`dateAtOffset` inverse pair that every drag frame round-trips through; the real gap is
    grouping offset, closed by one data field `Scale.offset` (`{unit:"month", step:3, offset:1}` for a
    February fiscal year). Keep `TaskDependencyType` **closed** — FS/SS/FF/SF is already the complete cross
    product; what people want is a per-task _constraint_, which is data for a later ADR.

### Explicitly not doing

Splitting `contexts.ts` into 12 files (the value is seeing all boundaries and the cadence table at once) ·
abstracting the provider pyramid into a `reduceRight` (loses per-context typing and the architecture it
documents) · exporting all 13 context hooks (would freeze `SchedulingContext`, `ResolvedCalendar`,
`ViewportMetrics` as public API for hooks nobody outside the panes can use) · async vetoes · injectable
`isWorking` · injectable scheduler · per-command vetoes · calendar inheritance · per-task `durationUnit`.

---

## Verification

Run after **every** commit — never accept fewer tests than the previous count:

```
pnpm --filter @am/react-gantt check-types
pnpm --filter @am/react-gantt test          # 406 baseline, + new tests
npx oxlint packages apps                    # 2 known pre-existing warnings
```

- `pnpm lint` at the repo root currently **fails** for an unrelated reason: it scans into
  `.claude/worktrees/perf-update-task/`, a locked worktree whose `node_modules` symlinks are broken. Use
  `npx oxlint packages apps` until that worktree is removed.
- **Phase D commits additionally**: the cadence vector from step 4 must be identical, and
  `git show <sha> --color-moved=zebra -M -C` should render the 9 context-value memos as pure moves. Never
  retype a `useMemo` dep array — move the lines. Any coloured non-move line inside a dep array is a bug
  until proven otherwise.
- **Export commits additionally**: `pnpm --filter @am/react-gantt build` and read `dist/index.d.ts` for
  references to unexported names.
- **End-to-end in the real app** (a dev server is already running on `:3000`): drive
  `/examples/dependencies` and `/examples/virtualization`. Drag a bar and confirm via a `MutationObserver`
  on the bar's `style` that there is **no intermediate frame at the pre-drag position** — the invariant
  from Phase A, which no unit test can express. Check `/examples/imperative-api` after the `revealTask`
  rename, and `/examples/working-time` after Phase F step 21.
- **DST regression** (step 14): assert `timelineOrigin` equals `buildDatesFromTasks(...)[0]` for a task
  starting the day after a spring-forward transition, under a pinned DST timezone.

### Deliberate behaviour changes — call these out in commit messages

1. DST origin drift fix (step 14) — corrects reveal and zoom anchoring in DST timezones.
2. Ancestor auto-expansion on reveal (step 16) — makes documented behaviour true.
3. `height` required → optional (step 13) — type-level only, source-compatible.
4. Event payload migration to objects and the `scrollToTask` → `revealTask` rename (steps 15, 19) —
   breaking, pre-1.0.
