# @art-tools/react-gantt

## 0.4.0

### Minor Changes

- Add baseline plans to compare saved schedules with live task dates. Tasks,
  summaries, and milestones accept `baselines`, with the first five plans displayed
  in separate lanes below each live bar. Plans remain consumer-owned and are not
  changed by scheduling, dragging, resizing, or undo/redo of live dates.

  Add `showBaselines` (default `true`) to toggle baseline visibility and
  `baselineLayout` to configure line height, strip padding, and lane gap. Defaults
  are 4px, 1px, and 2px. Rows remain aligned, and the timeline includes visible
  baseline dates.

  Support baseline styling through `--am-gantt-baseline-color` and the
  `bars.baseline` slots, including a custom tooltip. Visible plans are included in
  the task bar's accessible description. Task-list borders span the baseline strip
  while labels and actions stay aligned with the live bar.

- 575b934: **Breaking:** Drop React 18 as a supported peer. `peerDependencies` now requires `react` and
  `react-dom` `^19.0.0` (previously `^18.0.0 || ^19.0.0`).

## 0.3.1

### Patch Changes

- Fixed task bar stacking so row borders stay below dependency links while task,
  project, and milestone bars layer correctly. The z-index now belongs to each
  bar root instead of the row.

## 0.3.0

### Minor Changes

- Added opt-in critical path analysis and highlighting with the `criticalPath`
  prop. Critical tasks and the dependency links that constrain them are styled
  using `--am-gantt-critical-bg` and
  `--am-gantt-critical-dependency-color`, or can be customized through
  `ownerState.isCritical` in the bar and dependency link slots. The feature is
  off by default and computes from the chart's actual schedule using working-time
  float.

## 0.2.1

### Patch Changes

- The bar tooltip no longer closes under a cursor that is sitting on the bar. It
  decided whether the pointer had left by comparing `clientX/clientY` against the
  bar's `getBoundingClientRect()`, and those two do not agree: rect edges are
  fractional (a row lands on 379.25) while `clientY` is an integer, so a pointer the
  browser had just hit-tested onto the bar failed `379 >= 379.25` and read as
  outside. Nothing reopened it either, because reopening needs another `mouseenter`
  and the pointer had never left — so the tooltip stayed gone while the cursor sat
  on the bar.

  It presented as "moving quickly onto a bar sometimes shows no tooltip": a quick
  entry comes to rest in the sub-pixel band at the edge it crossed, where the
  comparison fails, while a slower one drifts a few pixels further in. The check now
  asks `bar.contains(event.target)` — the same hit-test that opened it, so opening
  and closing can no longer disagree, and the bar's children (label, progress fill,
  resizers) count as the bar.

- The tooltip is placed from the pointer that opened it rather than from the first
  `mousemove` after. The mousemove belonging to the entering gesture is dispatched
  before the listener is attached, so it was never seen and the popup's first frame
  used its off-screen starting position.

## 0.2.0

### Minor Changes

- Bar tooltips, as a slot with **no default** (ADR-022). `bars.tooltip` covers all
  three bar types and renders nothing until you fill it, so bars keep their native
  `title` unless you opt in:

  ```tsx
  import { Gantt, GanttBarTooltip } from "@art-tools/react-gantt";

  <Gantt tasks={tasks} height={500} bars={{ tooltip: { slots: { tooltip: GanttBarTooltip } } }} />;
  ```

  `GanttBarTooltip` opens on bar hover with no dwell delay, places from the cursor
  and follows it, flips rather than running off the chart edge, and portals to
  `document.body` so it can paint over the sticky calendar header.

  There is no `open` prop — the chart holds no open state, which is what lets the
  slot be a third-party tooltip that arrives with its own root and trigger. For the
  library's own hover behaviour with different markup, compose the three new
  primitives instead.

  New exports: `GanttBarTooltip`, `BarTooltipRoot`, `BarTooltipTrigger`,
  `useBarTooltip`, and the types `BarTooltipProps`, `BarTooltipOwnerState`,
  `BarTooltipContextValue`, `BarTooltipSlots`, `BarTooltipSlotProps`,
  `BarTooltipSlotConfig`.

- Tooltip theming through eight new custom properties: `--am-gantt-tooltip-bg`,
  `-color`, `-font-size`, `-max-width`, `-padding`, `-radius`, `-shadow` and
  `-z-index`. The popup is portalled out of the chart, so set these on the popup
  itself via `slotProps` or on a global selector — variables declared on an
  ancestor of `<Gantt>` never reach it.

- The actions column takes its layout from a CSS Module rather than an inline
  `style`, so it can be restyled like every other part of the chart.

- `engines.node` is now `>=22`, up from `>=20`.

### Patch Changes

- Connector handles on a milestone bar now sit outside the painted diamond instead
  of on top of it. A milestone is an instant, so its date span is zero pixels wide,
  and the handles were positioned from that span — which put the end handle exactly
  on the diamond's centre and the start handle over its left half.

- The actions column defaults to 100px wide, down from 120px.

- `GanttBarTooltip` no longer throws a "useGanttScroll must be used within a
  GanttProvider" error. It asserted the chart's scroll context to find a rect to
  clamp against, which crashed in two supported cases: a bar rendered standalone — the bar
  components and `GanttSlotsProvider` are both public exports — and any hot reload,
  where re-evaluating the context module leaves the mounted provider offering a
  different context object. It reads the context without asserting it now and falls
  back to the viewport, which is already what an unmeasured grid does.

## 0.1.0

### Minor Changes

- b40b275: Initial public release.

  A composable, virtualized Gantt chart for React: task hierarchy with roll-up,
  task/milestone/summary bars, drag-to-move and resize with cascading reschedules,
  FS/SS/FF/SF dependency links with working-time lag, working-time calendars,
  undo/redo, a slot-based theming API, and an imperative `apiRef`.

  Ships ESM + CJS with type declarations and a single stylesheet at
  `@art-tools/react-gantt/style.css`. React 18 and 19 are supported as peers.
