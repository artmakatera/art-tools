# @art-tools/react-gantt

A high-performance, composable Gantt chart component library for React. It stays
smooth at **100,000 tasks** — rows **and** columns are virtualized, so the row
count barely affects render cost — and ships a full undo/redo transaction model,
cascading dependency scheduling, and a slot system for deep customization.

- **Composable** — drop in the all-in-one `<Gantt />`, or assemble
  `<GanttProvider>` + `<TaskList>` + `<GanttGrid>` yourself.
- **Interactive** — drag to move/resize bars, draw and delete dependency links,
  edit progress, expand/collapse hierarchy.
- **Fast** — windowed rendering with overscan, an incremental resolve cache, and
  purpose-scoped React contexts so hot updates don't re-render stable subtrees.
  See it at [100,000 tasks](https://art-tools-docs.vercel.app/examples/virtualization).

**[Live examples & documentation →](https://art-tools-docs.vercel.app)** — every
example is interactive, with the source that rendered it shown underneath.

---

## Table of contents

- [Install](#install)
- [Quick start](#quick-start)
- [Composable API](#composable-api)
- [`GanttProps` reference](#ganttprops-reference)
- [Data model](#data-model)
- [Working time (calendars)](#working-time-calendars)
- [Task bars](#task-bars)
- [Dependencies & scheduling](#dependencies--scheduling)
- [Columns](#columns)
- [Read-only](#read-only)
- [Imperative API](#imperative-api)
- [Accessibility](#accessibility)
- [Slots & theming](#slots--theming)
- [Architecture (for contributors)](#architecture-for-contributors)
- [Roadmap](#roadmap)

---

## Install

```bash
pnpm add @art-tools/react-gantt
```

Peer dependencies: `react` and `react-dom` (`^18 || ^19`). The only runtime
dependency is [`clsx`](https://github.com/lukeed/clsx).

Import the stylesheet once, near your app root:

```ts
import "@art-tools/react-gantt/style.css";
```

---

## Quick start

```tsx
import { Gantt, type GanttTask } from "@art-tools/react-gantt";
import "@art-tools/react-gantt/style.css";

// Build dates with the (year, monthIndex, day) constructor, never an ISO string —
// `new Date("2023-01-10")` parses as UTC midnight while the geometry reads local
// civil instants. `endDate` is EXCLUSIVE: "Install Apache" occupies Jan 10 alone.
const tasks: GanttTask[] = [
  {
    id: 1000,
    name: "Launch Cloud Platform",
    startDate: new Date(2023, 0, 10),
    endDate: new Date(2023, 0, 22),
    type: "summary",
  },
  {
    id: 1,
    name: "Setup web server",
    startDate: new Date(2023, 0, 10),
    endDate: new Date(2023, 0, 14),
    progress: 33,
    parentId: 1000,
  },
  {
    id: 11,
    name: "Install Apache",
    startDate: new Date(2023, 0, 10),
    endDate: new Date(2023, 0, 11),
    progress: 50,
    parentId: 1,
  },
  {
    id: 12,
    name: "Configure firewall",
    startDate: new Date(2023, 0, 10),
    endDate: new Date(2023, 0, 12),
    progress: 50,
    parentId: 1,
  },
];

export function App() {
  return <Gantt tasks={tasks} height={500} colWidth={60} rowHeight={40} />;
}
```

`height` is **required** — when set, rows scroll vertically inside it while the
calendar header stays pinned.

> The `tasks` prop is a **stable seed**: pass it once and never feed a resolved list
> back into it. All create/update/delete/edit go through the internal change log via
> the [imperative API](#imperative-api) and action columns, keeping undo/redo intact.
> See [`docs/data-structures.md`](./docs/data-structures.md) for the full model.

Complete, interactive examples — [100,000 tasks](https://art-tools-docs.vercel.app/examples/virtualization),
[custom slots](https://art-tools-docs.vercel.app/examples/slots),
[an edit dialog](https://art-tools-docs.vercel.app/examples/task-editing) and
[undo/redo](https://art-tools-docs.vercel.app/examples/imperative-api) — each show
the source that rendered them.

---

## Composable API

`<Gantt>` is a thin wrapper that wires the provider and lays out a resizable split
view (task list pane + calendar/grid). For full layout control, compose the pieces
directly:

```tsx
import { GanttProvider, TaskList, GanttGrid } from "@art-tools/react-gantt";

<GanttProvider tasks={tasks} height={500}>
  <TaskList />
  <GanttGrid />
</GanttProvider>;
```

Set `hideTaskList` on `<Gantt>` to render only the calendar/grid (no task-list pane,
no splitter).

Exported components: `Gantt`, `GanttProvider`, `GanttGrid`, `TaskList`, `TaskBar`,
`ProjectBar`, `MilestoneBar`, `Calendar`.

---

## `GanttProps` reference

Defined in [`src/types.ts`](./src/types.ts).

### Data

| Prop            | Type                          | Description                                                                                                            |
| --------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `tasks`         | `GanttTask[]`                 | **Required.** Stable seed list (see the note in Quick start).                                                          |
| `dependencies`  | `TaskDependency[]`            | Links between tasks (FS/FF/SS/SF, optional lag).                                                                       |
| `criticalPath`  | `boolean`                     | Highlight the critical path — see [Dependencies & scheduling](#dependencies--scheduling). Default `false`.             |
| `columns`       | `ColumnDef[]`                 | Task-list columns. Falls back to built-in default columns.                                                             |
| `readOnly`      | `boolean`                     | Remove every editing affordance — see [Read-only](#read-only).                                                         |
| `calendar`      | `GanttCalendar`               | Working-time definition. Supplying it opts into working-time scheduling — see [Working time](#working-time-calendars). |
| `snapToWorking` | `boolean`                     | Default `true`. `false` keeps non-working shading but leaves dates untouched.                                          |
| `durationUnit`  | `"day" \| "hour" \| "minute"` | How an input `duration` is interpreted and displayed. Default `"day"`.                                                 |

### Layout

| Prop                   | Type      | Description                                                                                    |
| ---------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `height`               | `number`  | **Required.** Total component height in px; enables the pinned header + vertical scroll.       |
| `rowHeight`            | `number`  | Row height in px.                                                                              |
| `colWidth`             | `number`  | Width of one day column in px.                                                                 |
| `scales`               | `Scale[]` | Calendar header rows (defaults to month + day — see [`DEFAULT_SCALES`](./src/core/scales.ts)). |
| `padDays`              | `number`  | Extra day columns padded before/after the task date range.                                     |
| `defaultTaskListWidth` | `number`  | Initial width of the task-list pane.                                                           |
| `hideTaskList`         | `boolean` | Render only the calendar/grid.                                                                 |

### Callbacks

| Prop                 | Signature                       | Fired when                                                      |
| -------------------- | ------------------------------- | --------------------------------------------------------------- |
| `onTaskClick`        | `(task) => void`                | A row/bar is selected.                                          |
| `onDependencyCreate` | `(dep: TaskDependency) => void` | A link is drawn between two tasks.                              |
| `onDependencyDelete` | `(dep: TaskDependency) => void` | A link is deleted.                                              |
| `onTaskCreate`       | `(task, afterId?) => void`      | A task is created.                                              |
| `onTaskDelete`       | `(id: Id) => void`              | A task is deleted.                                              |
| `onTaskEdit`         | `(task) => void`                | A column's edit action fires (e.g. the actions-column pencil).  |
| `onTasksChange`      | `(tasks: GanttTask[]) => void`  | The resolved list changes (after create/delete/edit/undo/redo). |

### Other

| Prop              | Type                     | Description                                                                         |
| ----------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| `apiRef`          | `React.Ref<GanttHandle>` | The [imperative API](#imperative-api) handle.                                       |
| `taskList`        | `GanttTaskListSlots`     | Slot overrides for the task-list pane (`treeCell`, `header`).                       |
| `bars`            | `GanttBarsSlots`         | Slot overrides for timeline bars and their handles.                                 |
| `dependencySlots` | `GanttDependenciesSlots` | Slot overrides for dependency links (named to avoid colliding with `dependencies`). |
| `timeline`        | `GanttTimelineSlots`     | Slot overrides for the calendar/grid chrome.                                        |
| `labels`          | `GanttLabels`            | Overrides for the [accessible strings](#accessibility). Pass a stable object.       |

---

## Data model

```ts
interface GanttTask {
  id: Id; // string | number
  name: string;
  startDate: Date;
  endDate?: Date; // EXCLUSIVE — the instant work stops
  duration?: number;
  progress?: number; // 0–100
  type?: "task" | "milestone" | "summary"; // default: "task"
  parentId?: Id | null; // null/undefined = root
}
```

- **`Id`** — `string | number`.
- **`endDate` is exclusive** — it is the instant work _stops_, not the last day
  worked. A task running Monday through Friday is
  `{ startDate: Mon, endDate: Sat }`, and a 9-to-5 Friday task is
  `Fri 09:00 → Fri 17:00`. This is what makes interval arithmetic work without
  scattered ±1 day corrections. To show a user the inclusive last day, use
  `api.format.endDate(task)` inside a column, or the exported `displayEndDate`
  / `endInstantFromDisplayDate` helpers when bridging a date input.
- **`duration`** — interpreted in the chart's `durationUnit` and, when a
  `calendar` is set, counted in _working_ time. The library never writes this
  field back; it derives dates from it and leaves your data alone.
- **`type`** — `"task"` (default), `"milestone"` (a diamond at `startDate`), or
  `"summary"` (a parent whose dates and progress roll up from its children). See
  [Task bars](#task-bars).
- **Hierarchy** — established via `parentId`. Roots have no `parentId`.

Dependencies are a separate array:

```ts
type TaskDependencyType = "FS" | "FF" | "SS" | "SF";

type TaskDependency = {
  from: Id;
  to: Id;
  type: TaskDependencyType;
  lag?: number; // in `durationUnit`s; WORKING time when a calendar is set
};
```

For the full seed → change-log → resolved-list pipeline (transactions, cursor,
roll-up), see [`docs/data-structures.md`](./docs/data-structures.md).

---

## Working time (calendars)

By default the chart schedules in plain linear time: weekends are shaded but a
five-day task dragged onto a Thursday simply ends on Monday. Pass a `calendar` to
make non-working time real — for the scheduler, for drag, and for the dependency
cascade.

```tsx
<Gantt
  tasks={tasks}
  height={480}
  calendar={{
    hours: ["8:00-12:00", "13:00-17:00"], // lunch is the gap between ranges
    days: {
      0: false,
      6: false, // weekends off (0 = Sunday)
      5: ["8:00-12:00"], // short Friday
    },
    dates: {
      "2026-01-01": false, // holiday
      "2026-01-10": ["9:00-13:00"], // half day
    },
  }}
/>
```

Three scopes resolve in the order **`dates` → `days` → `hours`**, so a specific
date beats a weekday rule, which beats the global default.

| Prop            | Meaning                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `calendar`      | The working-time definition. Supplying it _is_ the opt-in. Safe to write inline — it is keyed by content, not identity. |
| `snapToWorking` | Default `true`. Set `false` to keep the shading but leave dates untouched.                                              |
| `durationUnit`  | `"day"` (default), `"hour"`, or `"minute"` — how an input `duration` is read and displayed.                             |

Things worth knowing before you rely on it:

- **Omitting `hours` means whole days, not business hours.** A calendar that only
  marks weekends off stays day-granular, so `duration: 3` is still three whole
  days rather than three 8-hour shifts.
- **A day off is just a day with no hours** (`false`), so working _days_ are the
  degenerate case of working _time_ — there is no separate concept.
- **One `durationUnit: "day"` is the week's longest working day.** With
  `{ hours: ["8:00-17:00"] }` that is 9 hours. Adding a single longer weekday
  therefore redefines "a day" for the whole chart.
- **Your data is never rewritten.** Snapping applies only to dates the library
  authors — drag commits and cascade results. A task you author ending on a
  Sunday renders where you put it until it is first edited.
- **Moves preserve working time, resizes set it.** Drag a three-working-day task
  onto a Thursday and it stays three working days, growing visually across the
  weekend. Drag its edge onto a Sunday and it settles back onto Friday.
- **Non-working time is shaded, not compressed.** The time axis stays linear.
  Slot consumers get `isNonWorking` and `nonWorkingReason`
  (`"weekend" | "holiday" | "offHours"`) on the grid-column and calendar-cell
  ownerStates.
- **Known gap:** the actions column's "add after" button creates a task without
  snapping it, because a column's `render` has no access to the calendar.

The reasoning behind each of these — including what was rejected — is recorded in
[`docs/adr/`](../../docs/adr/README.md).

## Task bars

`Row` ([`src/components/bars/common/Row.tsx`](./src/components/bars/common/Row.tsx))
computes each row's pixel geometry and dispatches on `type`:

- **`task`** → `TaskBar` — draggable, resizable, with a progress fill and label.
- **`milestone`** → `MilestoneBar` — a diamond marker, movable.
- **`summary`** → `ProjectBar` — a rolled-up parent bar, movable.

**Summary roll-up:** only `summary`-typed parents roll up
(`getParentTaskData` in [`src/core/prepareData.ts`](./src/core/prepareData.ts)):
`startDate` = min child start, `endDate` = max child end, `progress` = weighted mean
of non-milestone children. A parent of any other `type` is left exactly as authored.

> Note: the `summary` bar is still implemented by the component/file named
> `ProjectBar`, and its theme variables are `--am-gantt-project-*` (the `deaf0b7`
> rename covered the public task `type` value only).

---

## Dependencies & scheduling

Hover a bar to reveal start/end **connector handles**
([`ConnectorHandles`](./src/components/bars/common/ConnectorHandles.tsx)); drag from
one bar's handle to another to create a link. The start/end handle combination maps
to the four dependency types (`HANDLE_TO_TYPE` in
[`src/hooks/useDependencyDrag.ts`](./src/hooks/useDependencyDrag.ts)):
Finish-to-Start, Finish-to-Finish, Start-to-Start, Start-to-Finish. Links render as
SVG polylines with arrowheads, a hit-area for selection, a delete button, and a lag
label ([`DependencyLinks`](./src/components/dependency-links/DependencyLinks.tsx));
they're culled to the visible rect.

**Cascading reschedule (ASAP):** when a task moves,
[`scheduleDependents`](./src/core/scheduling.ts) walks the dependency graph and
realigns successors according to each relationship type and its `lag`. The move and
all cascaded updates are committed as **one transaction**, so a drag-plus-cascade
undoes in a single step.

**Critical path:** set `criticalPath` to compute and highlight the chain of
tasks and dependency links currently driving the chart's end date. Float is measured
in working time from each task's _actual_ committed position — not a hypothetical
earliest-possible schedule — so a task the chart visibly shows sitting with slack is
never flagged critical, and dragging a highlighted task or link is guaranteed to move
the end date (see [ADR-023](../../docs/adr/023-critical-path-is-computed-from-the-actual-schedule.md)
for the full reasoning). A dependency link is only highlighted when it is the specific
predecessor actually pinning its successor's start, not merely a link between two
critical tasks. Off by default and computed only on commit, never mid-drag. Styled via
`--am-gantt-critical-bg` (task/project bars) and `--am-gantt-critical-dependency-color`
(links) — see [CSS custom properties](#css-custom-properties) — or through
`ownerState.isCritical` on the `TaskBar`/`ProjectBar`/`MilestoneBar`/`DependencyLinks`
slots for anything beyond a color change.

---

## Columns

```ts
interface ColumnDef<T extends GanttTask = GanttTask> {
  key: string;
  header: string;
  width?: number;
  render: (task: T, api: ColumnApi) => React.ReactNode;
  isTreeColumn?: boolean; // renders the indent + expand/collapse toggle
}
```

Every `render` receives a `ColumnApi` as its second argument — the full
[imperative handle](#imperative-api) plus `editTask(task)` (which fires the
consumer's `onTaskEdit`). This is how columns build inline actions:

```tsx
const columns: ColumnDef[] = [
  { key: "name", header: "Name", isTreeColumn: true, render: (t) => t.name },
  {
    key: "actions",
    header: "",
    render: (task, api) => (
      <>
        <button onClick={() => api.editTask(task)}>✎</button>
        <button onClick={() => api.deleteTask(task.id)}>✖</button>
      </>
    ),
  },
];
```

When `columns` is omitted, `TaskList` renders `DEFAULT_COLUMNS`
([`src/components/taskList/TaskListHeader.tsx`](./src/components/taskList/TaskListHeader.tsx)):
an `__action` column (edit / add-after / delete), a `__name` tree column, `__start`,
`__end`, and `__progress`. Columns are resizable via a header divider (widths are
tracked as session-local overrides).

---

## Read-only

```tsx
<Gantt tasks={tasks} height={500} readOnly />
```

`readOnly` removes every editing affordance rather than disabling one:

| Gone                                           | Kept                                                      |
| ---------------------------------------------- | --------------------------------------------------------- |
| Bar move, resize, progress drag                | Row/bar selection, `onTaskClick`                          |
| Dependency connector handles                   | Dependency links themselves (drawn as usual)              |
| Link selection + its `×` / Delete-key deletion | Expand/collapse, scroll, zoom, column resize              |
| The built-in `__action` column                 | The `__name` / `__start` / `__end` / `__progress` columns |

Nothing is rendered-but-inert: each affordance only exists when its handlers are
wired, so there is no grabbable dead element and no disabled styling.

`apiRef` keeps working — `readOnly` is about the pointer, not the data ([ADR-021](../../docs/adr/021-readonly-removes-affordances-not-the-api.md)).
Drive an otherwise-frozen chart from your own toolbar:

```tsx
<Gantt tasks={tasks} height={500} readOnly apiRef={ref} />;
ref.current?.updateTask(id, { progress: 80 }); // still applies
```

Custom `columns` are yours to gate — `render` receives `api.readOnly`:

```tsx
render: (task, api) =>
  api.readOnly ? null : <button onClick={() => api.editTask(task)}>✎</button>,
```

`GanttProvider` takes the same prop, so the [composable API](#composable-api) behaves
identically.

---

## Imperative API

Pass an `apiRef` to reach the `GanttHandle`:

```tsx
const ref = useRef<GanttHandle>(null);
<Gantt apiRef={ref} tasks={tasks} height={500} />;

ref.current?.createTask(task, afterId); // afterId omitted → append at end
ref.current?.updateTask(id, { progress: 80 });
ref.current?.deleteTask(id);
ref.current?.undo();
ref.current?.redo();
ref.current?.revealTask(id); // vertical; add { horizontal: true } for the bar
ref.current?.revealTask(id, { horizontal: true }); // expands collapsed ancestors first
```

`updateTask` takes a `TaskPatch` (`name`, `startDate`, `endDate`, `progress`); only
the provided fields change. `createTask` runs synchronously (`flushSync`) so the new
task is visible to consumers immediately.

---

## Slots & theming

### CSS custom properties

The default look is driven by `--am-gantt-*` variables in
[`src/index.css`](./src/index.css). Override them in your own CSS to retheme:

```css
:root {
  --am-gantt-task-bg: #0ba5ff; /* task bar fill */
  --am-gantt-project-bg: #16a34a; /* summary bar fill */
  --am-gantt-milestone-bg: #f59e0b; /* milestone diamond */
  --am-gantt-critical-bg: #dc2626; /* critical-path bars, when criticalPath is set */
  --am-gantt-critical-dependency-color: #dc2626; /* critical-path dependency links */
  --am-gantt-calendar-header-bg: #f8fafc;
  --am-gantt-calendar-weekend-bg: #f1f5f9;
  /* …plus task colors, border radii, resizer sizing, z-indices */
}
```

### Slots

Every customizable component follows the MUI `{ slots, slotProps }` pattern with an
`ownerState` function form. `slots` swaps the underlying element/component; `slotProps`
merges props onto the library's defaults — `className` is `clsx`-merged, `style` is
shallow-merged, and any other prop the consumer sets wins
([`mergeSlotProps`](./src/core/slots.ts)).

The `<Gantt>` props group slots into four buckets: **`taskList`** (`treeCell`,
`header`), **`bars`** (`taskBar`, `projectBar`, `milestoneBar`, progress, resizer,
connector handles), **`dependencySlots`** (links, preview), and **`timeline`**
(calendar rows, grid columns, grid, resize handle).

```tsx
// Swap the tree-cell expand button for a custom component, and set its glyph
// from ownerState. Keep the config object referentially stable (module-level or
// memoized) — rows are memoized, so a fresh object each render re-renders them all.
const taskListSlots: GanttTaskListSlots = {
  treeCell: {
    slots: { expandButton: RoundToggle },
    slotProps: {
      expandButton: ({ isExpanded }) => ({ children: isExpanded ? "−" : "+" }),
    },
  },
};

// Restyle task bars via the `root` slot — merged, not replaced.
const barSlots: GanttBarsSlots = {
  taskBar: { slotProps: { root: { style: { borderRadius: 8 } } } },
};

<Gantt tasks={tasks} height={500} taskList={taskListSlots} bars={barSlots} />;
```

Per-component slot types (`*Slots`, `*SlotProps`, `*SlotConfig`, `*OwnerState`) are
all exported from the package entry.

#### Bar tooltips

`bars.tooltip` is one slot covering all three bar types, and it is **empty by
default** — bars carry a native `title` and nothing more until you fill it. Setting
it suppresses that native `title`, so the two do not stack (ADR-022).

```tsx
import { Gantt, GanttBarTooltip } from "@art-tools/react-gantt";

// The built-in tooltip: name, dates, progress.
<Gantt tasks={tasks} height={500} bars={{ tooltip: { slots: { tooltip: GanttBarTooltip } } }} />;
```

It triggers on the **bar**, not the row — a row spans the whole timeline width, so
a row-scoped trigger would fire over empty space far from the task. (The connector
handles still use row hover, so they appear as you approach a bar.)

The bar's default root is what renders it, so **replacing `slots.root` removes the
tooltip**. A custom root can restore it by forwarding the `tooltip` prop it
receives on to a `DraggableBar`.

`GanttBarTooltip` opens immediately on hover, sits bottom-right of the cursor and
follows it, and flips left or up rather than running off the edge.

##### Writing your own

The slot is a **wrapper**: it receives the bar as `children` and has to render it.
There is no `open` prop, because the chart holds no open state — showing and hiding
is entirely the slot's business. That is what lets the slot be a third-party
tooltip, which arrives with its own root and trigger:

```tsx
import { Tooltip } from "@base-ui/react/tooltip";

const Tip = ({ task, children }: BarTooltipProps) => (
  <Tooltip.Root>
    <Tooltip.Trigger render={children as React.ReactElement} />
    <Tooltip.Portal>
      <Tooltip.Popup>{task.name}</Tooltip.Popup>
    </Tooltip.Portal>
  </Tooltip.Root>
);
```

For the library's own hover behaviour with different markup, compose the three
primitives instead. `BarTooltipTrigger` merges onto the element you give it rather
than wrapping it, so it adds no DOM and keeps your handlers:

```tsx
import { BarTooltipRoot, BarTooltipTrigger, useBarTooltip } from "@art-tools/react-gantt";

const Popup = ({ task }: { task: GanttTask }) =>
  useBarTooltip()?.open ? <div className="tip">{task.name}</div> : null;

const Tip = ({ task, children, anchorRef }: BarTooltipProps) => (
  <BarTooltipRoot anchorRef={anchorRef}>
    <BarTooltipTrigger>{children}</BarTooltipTrigger>
    <Popup task={task} />
  </BarTooltipRoot>
);
```

Alongside `children`, the slot receives `task`, the resolved `progress`,
`displayEnd`, and `anchorRef` — the bar's DOM node, for positioning against the
bar rather than the cursor. Read `displayEnd` rather than `task.endDate`: stored
ends are **exclusive** instants, so a Mon–Fri task's raw `endDate` is Saturday
(ADR-014).

Two more things. The tooltip is hover-only, because bars are not focusable yet;
the accessible name stays on the bar, so screen readers are unaffected either way.
And a tooltip rendered **in place cannot paint over the sticky calendar header** —
its row is a stacking context, so no z-index reaches past it. Portal it out, as
`GanttBarTooltip` and the Base UI example above both do; reaching for `z-index`
will not work (ADR-022).

---

## Accessibility

The chart is fully readable by a screen reader in browse / table-navigation mode. It is
**not yet keyboard-operable** — see [Roadmap](#1-keyboard-navigation).

### Structure

The two panes are exposed as two widgets under one labelled `group`:

| Element        | Role & state                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| Widget root    | `group` + `aria-label` (`labels.gantt`)                                                                  |
| Task-list pane | `treegrid` + `aria-label`, `aria-rowcount`, `aria-colcount`                                              |
| Header row     | `row` `aria-rowindex="1"`, cells `columnheader` + `aria-colindex`                                        |
| Task row       | `row` + `aria-rowindex`, `aria-level`, `aria-expanded`, `aria-posinset`, `aria-setsize`, `aria-selected` |
| Task cells     | `gridcell`, or `rowheader` for the tree column; each with `aria-colindex`                                |
| Timeline pane  | `grid` + `aria-label`, `aria-rowcount`, `aria-colcount` (one column per date)                            |
| Calendar row   | `row` + `aria-rowindex`, cells `columnheader` + `aria-colindex`/`aria-colspan`                           |
| Bar            | `gridcell` + `aria-label`, `aria-colindex`/`aria-colspan` for its span on the date axis                  |

Both panes are virtualized, so `aria-rowcount` reports the **full** list while only a
window is in the DOM, and every `aria-rowindex` is absolute. Counts and indices are
1-based, and the timeline's task rows are offset by its calendar header rows.

Two deliberate choices are worth knowing about:

- **A bar is one announcement.** Its `aria-label` carries name, type, dates and progress
  (`"Design phase, summary, 3 Mar 2026 to 12 Mar 2026, 40% complete"`), and its inner
  subtree is `aria-hidden`. So a bar reads as one coherent unit instead of a pile of
  nested `div`s — and the timeline stays usable on its own when `hideTaskList` is set.
- **Pointer-only affordances are hidden.** Bar move, resize, progress and dependency
  creation are mouse-only drags, so the connector handles, resize grips, progress grip
  and dependency-link layer are `aria-hidden` with `tabIndex={-1}`. They are not
  advertised as controls that no key can activate. Tab visits only the tree expand
  toggles and whatever buttons your columns render. Restore any of them through
  `slotProps` if you wire up your own keyboard handling.

Calendar headers announce the full period rather than the abbreviated visible text
(`"31 December 2021"`, not `"31"`). Override per scale with `Scale.ariaFormat`.

### Labels

Every accessible string is overridable — pass a **stable** (memoized) object, since rows
and bars are memoized:

```tsx
const labels = useMemo(
  () => ({
    gantt: "Projektplan",
    taskList: "Aufgabenliste",
    timeline: "Zeitachse",
    expand: "Aufklappen",
    collapse: "Zuklappen",
    editTask: (task) => `${task.name} bearbeiten`,
    bar: (task, { progress }) => `${task.name}, ${progress}% erledigt`,
  }),
  [],
);

<Gantt tasks={tasks} height={400} labels={labels} />;
```

Omitted keys keep their English defaults. `ColumnDef.render` receives the resolved set as
`api.labels`, for naming controls a custom column renders.

### Focus ring

The one keyboard-focusable control the library owns (the tree expand toggle) draws a
focus ring on `:focus-visible`, themeable via `--am-gantt-focus-ring-color`, `-width`
and `-offset`.

---

## Architecture (for contributors)

- **Frequency-split contexts** —
  [`src/context/GanttContext.tsx`](./src/context/GanttContext.tsx) deliberately splits
  state into ~9 purpose-scoped contexts/hooks by update frequency (`useGanttConfig`,
  `useGanttTaskState`, `useGanttTaskActions`, `useGanttSelectedId`, `useGanttScroll`,
  `useGanttViewport`, `useGanttDependency`, `useGanttDragActive`,
  `useGanttDependencyDrag`), so a high-frequency update (e.g. drag coordinates)
  doesn't re-render stable consumers. Grid-side slot groups flow through a separate
  [`GanttSlotsProvider`](./src/context/GanttSlotsContext.tsx); the `taskList` group is
  prop-drilled.
- **Mutation model** — [`src/hooks/useTaskList.ts`](./src/hooks/useTaskList.ts) owns an
  insertion-ordered `ChangeLog` of transactions with a cursor for undo/redo. Each user
  action is one transaction. An incremental resolve cache
  (`resolveCommittedTasksCached` in [`src/core/prepareData.ts`](./src/core/prepareData.ts))
  backed by an [LRU cache](./src/core/lruCache.ts) keeps resolution fast regardless of
  history length.
- **Virtualization** — [`src/core/virtualize.ts`](./src/core/virtualize.ts)
  (`rangeFromOffset`) windows both rows and date columns with overscan (see
  [`src/core/constants.ts`](./src/core/constants.ts)); applied in `Grid` and `TaskList`,
  and dependency links are culled to the visible rect.
- **Scroll sync** — [`useScrollSync`](./src/hooks/useScrollSync.ts) keeps the list and
  grid aligned vertically; [`useScrollToTask`](./src/hooks/useScrollToTask.ts) +
  [`core/scroll.ts`](./src/core/scroll.ts) handle reveal-into-view.

### Styling & build

- **CSS Modules** (`*.module.css`) co-located with each component; theming via the
  `--am-gantt-*` custom properties in `index.css`.
- **Build** — Vite library mode emits ESM (`index.mjs`) + CJS (`index.cjs`) with
  `.d.ts` (via `vite-plugin-dts`) and a single `style.css`; `react`/`react-dom` are
  externalized.
- **Tests** — Vitest + `@testing-library/react` (jsdom) under `src/tests/` and
  `test/`; perf benchmarks run with `pnpm bench`.

---

## Roadmap

Proposed future features. These are **not yet implemented** — they capture gaps in the
current design and a sketch of how each would hook in.

### 1. Baselines

Propose accepting a baseline as data — the consumer supplies
the originally-planned dates, not the chart — and rendering it alongside the live
bar, so schedule drift is visible at a glance instead of reconstructed from memory or
an external doc.

### 2. Custom timeline elements

The grid has no way to place anything on the calendar that isn't a task bar.
Propose a way to render arbitrary elements into it, positioned by date rather than
by row — a "today" line or a deadline marker being the obvious example.

### 3. Export / print

Propose export of the chart to PNG/SVG/PDF, plus a print-friendly render mode that
temporarily disables virtualization and renders the full extent so browser print
captures every row.
