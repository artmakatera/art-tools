# react-gantt-edge

A high-performance, composable Gantt chart component library for React, built as a pnpm/Turborepo monorepo. The core library lives in `packages/react-gantt` (`@am/react-gantt`); `apps/playground` is a local sandbox for testing it against large datasets and running benchmarks.

> **📖 Full library documentation:** [`packages/react-gantt/README.md`](packages/react-gantt/README.md) — install, API reference, data model, slots & theming, architecture, and roadmap. This root readme is just a monorepo overview.

## Key features

- **Composable API** — use the all-in-one `<Gantt />` wrapper, or assemble the pieces yourself with `<GanttProvider>`, `<TaskList>`, and `<GanttGrid>` for full layout control.
- **Task hierarchy** — parent/child tasks with expand/collapse, automatic progress and date roll-up for parent rows.
- **Task bar types** — regular task bars, milestones, and summary bars, each independently stylable.
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
  docs/                # Next.js examples gallery (port 3000) — a running app
  playground/          # Vite app for manual testing + benchmarks (port 5173)
packages/
  react-gantt/         # The Gantt chart library (@am/react-gantt)
  mock-data/           # Shared fixtures: a sample project + a large-dataset generator
  config-typescript/   # Shared TypeScript config
  oxlint-config/       # Shared lint config
docs/                  # Written design docs — not an app, despite the name clash
  adr/                 # Architecture decision records
  glossary.md          # Terms with exactly one meaning across code, tests, and docs
```

> **`docs/` vs `apps/docs/`** — `apps/docs` is the runnable examples gallery.
> [`docs/`](docs/adr/README.md) is prose: why the library is shaped the way it is, what was
> rejected, and which costs were accepted deliberately.

## Getting started

```bash
pnpm install
pnpm dev      # build the library, then start the docs site (:3000) and playground (:5173)
pnpm build    # build all packages
pnpm test     # run the test suite
```

`pnpm dev` builds `@am/react-gantt` before either app starts — both consume its
`dist`, so without that ordering a clean checkout fails to resolve it. The library
then stays in watch mode, so edits rebuild automatically.

To work on just one:

```bash
pnpm --filter @am/docs dev         # examples gallery
pnpm --filter @am/playground dev   # perf sandbox
```

## Examples

`apps/docs` is a gallery of 13 runnable examples — custom columns, slots, theming
(CSS variables _and_ CSS Modules), dependencies, a custom zoom ladder, the
imperative API, task editing, and 100k-row virtualization. Each page renders a
live chart beside the exact source file that produced it, read from disk at build
time so the two can never drift.
