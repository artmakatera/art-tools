# @art-tools/react-gantt

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

## 0.1.0

### Minor Changes

- b40b275: Initial public release.

  A composable, virtualized Gantt chart for React: task hierarchy with roll-up,
  task/milestone/summary bars, drag-to-move and resize with cascading reschedules,
  FS/SS/FF/SF dependency links with working-time lag, working-time calendars,
  undo/redo, a slot-based theming API, and an imperative `apiRef`.

  Ships ESM + CJS with type declarations and a single stylesheet at
  `@art-tools/react-gantt/style.css`. React 18 and 19 are supported as peers.
