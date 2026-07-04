# react-gantt-edge

A high-performance, composable Gantt chart component library for React, built as a pnpm/Turborepo monorepo. The core library lives in `packages/react-gantt` (`@am/react-gantt`); `apps/playground` is a local sandbox for testing it against large datasets and running benchmarks.

## Key features

- **Composable API** — use the all-in-one `<Gantt />` wrapper, or assemble the pieces yourself with `<GanttProvider>`, `<TaskList>`, and `<GanttGrid>` for full layout control.
- **Task hierarchy** — parent/child tasks with expand/collapse, automatic progress and date roll-up for parent rows.
- **Task bar types** — regular task bars, milestones, and project (summary) bars, each independently stylable.
- **Drag interactions** — drag to move or resize task bars, with cascading reschedules for dependent tasks.
- **Dependency links** — visualize Finish-to-Start, Finish-to-Finish, Start-to-Start, and Start-to-Finish relationships (with optional lag) between tasks; create and delete links interactively.
- **Undo/redo** — every user action (drag, resize, create, delete, edit) is recorded as a transaction in an undoable/redoable change log.
- **Customizable task list** — configurable, resizable columns via `ColumnDef`, with a `render` API for building custom cell content (e.g. inline edit/add/delete actions).
- **Imperative API** — `apiRef` exposes `createTask`, `updateTask`, `deleteTask`, `undo`, `redo`, and `scrollToTask` for programmatic control.
- **Flexible time scales** — day, week, month, quarter, and year views with configurable formatting.
- **Resizable panes** — draggable divider between the task list and the calendar/grid area.
- **Virtualized rendering** — rows and columns are windowed on both axes with overscan, so charts with thousands of tasks stay smooth.
- **Undo-friendly state model** — an insertion-ordered, cached resolution pipeline keeps undo/redo and edits fast regardless of history length.
- **Theming** — CSS custom properties for colors and sizing, importable via `@am/react-gantt/style.css`.

## Project structure

```
apps/
  playground/         # Vite app for manual testing + benchmarks
packages/
  react-gantt/         # The Gantt chart library (@am/react-gantt)
  config-typescript/   # Shared TypeScript config
  oxlint-config/       # Shared lint config
```

## Getting started

```bash
pnpm install
pnpm dev      # run the playground app
pnpm build    # build all packages
pnpm test     # run the test suite
```
