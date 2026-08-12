# @am/react-gantt

A high-performance, composable Gantt chart component library for React. It renders
thousands of tasks smoothly (rows **and** columns are virtualized on both axes),
ships a full undo/redo transaction model, cascading dependency scheduling, and a
MUI-style slot system for deep customization.

- **Composable** — drop in the all-in-one `<Gantt />`, or assemble
  `<GanttProvider>` + `<TaskList>` + `<GanttGrid>` yourself.
- **Interactive** — drag to move/resize bars, draw and delete dependency links,
  edit progress, expand/collapse hierarchy.
- **Fast** — windowed rendering with overscan, an incremental resolve cache, and
  purpose-scoped React contexts so hot updates don't re-render stable subtrees.

---

## Table of contents

- [Install](#install)
- [Quick start](#quick-start)
- [Composable API](#composable-api)
- [`GanttProps` reference](#ganttprops-reference)
- [Data model](#data-model)
- [Task bars](#task-bars)
- [Dependencies & scheduling](#dependencies--scheduling)
- [Columns](#columns)
- [Imperative API](#imperative-api)
- [Accessibility](#accessibility)
- [Slots & theming](#slots--theming)
- [Architecture (for contributors)](#architecture-for-contributors)
- [Roadmap](#roadmap)

---

## Install

```bash
pnpm add @am/react-gantt
```

Peer dependencies: `react` and `react-dom` (`^18 || ^19`). The only runtime
dependency is [`clsx`](https://github.com/lukeed/clsx).

Import the stylesheet once, near your app root:

```ts
import "@am/react-gantt/style.css";
```

---

## Quick start

```tsx
import { Gantt, type GanttTask } from "@am/react-gantt";
import "@am/react-gantt/style.css";

const tasks: GanttTask[] = [
  { id: 1000, name: "Launch SaaS Product", startDate: new Date("2023-01-10"), endDate: new Date("2023-01-21"), type: "summary" },
  { id: 1,    name: "Setup web server",    startDate: new Date("2023-01-10"), endDate: new Date("2023-01-13"), progress: 33, parentId: 1000 },
  { id: 11,   name: "Install Apache",      startDate: new Date("2023-01-10"), endDate: new Date("2023-01-10"), progress: 50, parentId: 1 },
  { id: 12,   name: "Configure firewall",  startDate: new Date("2023-01-10"), endDate: new Date("2023-01-11"), progress: 50, parentId: 1 },
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

A complete, interactive example (10,000 tasks, custom slots, edit modal, undo/redo)
lives in [`apps/playground/src/App.tsx`](../../apps/playground/src/App.tsx).

---

## Composable API

`<Gantt>` is a thin wrapper that wires the provider and lays out a resizable split
view (task list pane + calendar/grid). For full layout control, compose the pieces
directly:

```tsx
import { GanttProvider, TaskList, GanttGrid } from "@am/react-gantt";

<GanttProvider tasks={tasks} height={500}>
  <TaskList />
  <GanttGrid />
</GanttProvider>
```

Set `hideTaskList` on `<Gantt>` to render only the calendar/grid (no task-list pane,
no splitter).

Exported components: `Gantt`, `GanttProvider`, `GanttGrid`, `TaskList`, `TaskBar`,
`ProjectBar`, `MilestoneBar`, `Calendar`.

---

## `GanttProps` reference

Defined in [`src/types.ts`](./src/types.ts).

### Data

| Prop           | Type                | Description |
| -------------- | ------------------- | ----------- |
| `tasks`        | `GanttTask[]`       | **Required.** Stable seed list (see the note in Quick start). |
| `dependencies` | `TaskDependency[]`  | Links between tasks (FS/FF/SS/SF, optional lag). |
| `columns`      | `ColumnDef[]`       | Task-list columns. Falls back to built-in default columns. |

### Layout

| Prop                   | Type      | Description |
| ---------------------- | --------- | ----------- |
| `height`               | `number`  | **Required.** Total component height in px; enables the pinned header + vertical scroll. |
| `rowHeight`            | `number`  | Row height in px. |
| `colWidth`             | `number`  | Width of one day column in px. |
| `scales`               | `Scale[]` | Calendar header rows (defaults to month + day — see [`DEFAULT_SCALES`](./src/core/scales.ts)). |
| `padDays`              | `number`  | Extra day columns padded before/after the task date range. |
| `defaultTaskListWidth` | `number`  | Initial width of the task-list pane. |
| `hideTaskList`         | `boolean` | Render only the calendar/grid. |

### Callbacks

| Prop                 | Signature                                | Fired when |
| -------------------- | ---------------------------------------- | ---------- |
| `onTaskClick`        | `(task) => void`                         | A row/bar is selected. |
| `onDependencyCreate` | `(dep: TaskDependency) => void`          | A link is drawn between two tasks. |
| `onDependencyDelete` | `(dep: TaskDependency) => void`          | A link is deleted. |
| `onTaskCreate`       | `(task, afterId?) => void`               | A task is created. |
| `onTaskDelete`       | `(id: Id) => void`                       | A task is deleted. |
| `onTaskEdit`         | `(task) => void`                         | A column's edit action fires (e.g. the actions-column pencil). |
| `onTasksChange`      | `(tasks: GanttTask[]) => void`           | The resolved list changes (after create/delete/edit/undo/redo). |

### Other

| Prop              | Type                   | Description |
| ----------------- | ---------------------- | ----------- |
| `apiRef`          | `React.Ref<GanttHandle>` | The [imperative API](#imperative-api) handle. |
| `taskList`        | `GanttTaskListSlots`   | Slot overrides for the task-list pane (`treeCell`, `header`). |
| `bars`            | `GanttBarsSlots`       | Slot overrides for timeline bars and their handles. |
| `dependencySlots` | `GanttDependenciesSlots` | Slot overrides for dependency links (named to avoid colliding with `dependencies`). |
| `timeline`        | `GanttTimelineSlots`   | Slot overrides for the calendar/grid chrome. |
| `labels`          | `GanttLabels`          | Overrides for the [accessible strings](#accessibility). Pass a stable object. |

---

## Data model

```ts
interface GanttTask {
  id: Id;                                   // string | number
  name: string;
  startDate: Date;
  endDate?: Date;                           // inclusive last day (chart is day-granular)
  duration?: number;
  progress?: number;                        // 0–100
  type?: "task" | "milestone" | "summary";  // default: "task"
  parentId?: Id | null;                     // null/undefined = root
}
```

- **`Id`** — `string | number`.
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
  lag?: number;  // days
};
```

For the full seed → change-log → resolved-list pipeline (transactions, cursor,
roll-up), see [`docs/data-structures.md`](./docs/data-structures.md).

---

## Task bars

`Bar` ([`src/components/bars/common/Bar.tsx`](./src/components/bars/common/Bar.tsx))
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

---

## Columns

```ts
interface ColumnDef<T extends GanttTask = GanttTask> {
  key: string;
  header: string;
  width?: number;
  render: (task: T, api: ColumnApi) => React.ReactNode;
  isTreeColumn?: boolean;  // renders the indent + expand/collapse toggle
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

## Imperative API

Pass an `apiRef` to reach the `GanttHandle`:

```tsx
const ref = useRef<GanttHandle>(null);
<Gantt apiRef={ref} tasks={tasks} height={500} />;

ref.current?.createTask(task, afterId);  // afterId omitted → append at end
ref.current?.updateTask(id, { progress: 80 });
ref.current?.deleteTask(id);
ref.current?.undo();
ref.current?.redo();
ref.current?.scrollToTask(id);           // auto-expands collapsed ancestors first
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
  --am-gantt-task-bg: #0ba5ff;            /* task bar fill */
  --am-gantt-project-bg: #16a34a;         /* summary bar fill */
  --am-gantt-milestone-bg: #f59e0b;       /* milestone diamond */
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

---

## Accessibility

The chart is fully readable by a screen reader in browse / table-navigation mode. It is
**not yet keyboard-operable** — see [Roadmap](#1-keyboard-navigation).

### Structure

The two panes are exposed as two widgets under one labelled `group`:

| Element | Role & state |
| ------- | ------------ |
| Widget root | `group` + `aria-label` (`labels.gantt`) |
| Task-list pane | `treegrid` + `aria-label`, `aria-rowcount`, `aria-colcount` |
| Header row | `row` `aria-rowindex="1"`, cells `columnheader` + `aria-colindex` |
| Task row | `row` + `aria-rowindex`, `aria-level`, `aria-expanded`, `aria-posinset`, `aria-setsize`, `aria-selected` |
| Task cells | `gridcell`, or `rowheader` for the tree column; each with `aria-colindex` |
| Timeline pane | `grid` + `aria-label`, `aria-rowcount`, `aria-colcount` (one column per date) |
| Calendar row | `row` + `aria-rowindex`, cells `columnheader` + `aria-colindex`/`aria-colspan` |
| Bar | `gridcell` + `aria-label`, `aria-colindex`/`aria-colspan` for its span on the date axis |

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
const labels = useMemo(() => ({
  gantt: "Projektplan",
  taskList: "Aufgabenliste",
  timeline: "Zeitachse",
  expand: "Aufklappen",
  collapse: "Zuklappen",
  editTask: (task) => `${task.name} bearbeiten`,
  bar: (task, { progress }) => `${task.name}, ${progress}% erledigt`,
}), []);

<Gantt tasks={tasks} height={400} labels={labels} />
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
  `test/`; benchmarks (`vitest bench`) live in the playground.

---

## Roadmap

Proposed future features. These are **not yet implemented** — they capture gaps in the
current design and a sketch of how each would hook in.



### 1. Keyboard navigation

ARIA semantics are implemented (see [Accessibility](#accessibility)) — a screen reader
can read the whole chart. What is still missing is a **keyboard model**: there is no way
to move focus between rows and bars, and no way to edit without a pointer. Propose
roving-tabindex focus across the two panes, keyboard move/resize (arrow keys nudge the
selected bar by one column), Enter/Space to expand/collapse, and focus management for the
dependency connector handles so links can be created without a pointer. Adding it means
un-hiding the drag affordances that are currently `aria-hidden` precisely because no key
can operate them.

### 2. Export / print

Propose export of the chart to PNG/SVG/PDF, plus a print-friendly render mode that
temporarily disables virtualization and renders the full extent so browser print
captures every row.

### 3. Critical path

The scheduling engine already builds the dependency graph
(`buildDependencyGraph` in [`src/core/scheduling.ts`](./src/core/scheduling.ts)).
Propose layering CPM (critical path method) analysis on top — compute the longest
zero-slack chain, expose a `highlightCriticalPath` option, and add slot hooks / an
`ownerState` flag so critical bars and links can be styled distinctly.
