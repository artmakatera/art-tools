# Data structures: tasks, logs & resolved list

A quick reference for *what's actually inside* the core data structures, using
concrete values from the playground mock (`apps/playground/src/mock.ts`).

The pipeline is:

```
seed tasks  +  change log (transactions @ cursor)
        │
        ▼
resolveCommittedTasks()   →  effective tasks (replayed, ordered)
        │
        ▼
getTaskList()             →  flattened display list (parents rolled up)
```

---

## 1. `GanttTask` — a single task

```ts
interface GanttTask {
  id: string | number;
  name: string;
  startDate: Date;
  endDate?: Date;          // EXCLUSIVE — the instant work stops
  duration?: number;       // interpreted in the chart's `durationUnit`
  progress?: number;       // 0–100
  type?: "task" | "milestone" | "summary";
  parentId?: Id | null;    // null/undefined = root
}
```

Example (a leaf task):

```jsonc
{
  "id": 12,
  "name": "Configure firewall",
  "startDate": "2022-01-10",
  "endDate":   "2022-01-12",
  "progress":  50,
  "parentId":  1
}
```

A task created by the playground "Add task" button — every field populated,
1-day span (`endDate` is the next midnight, since it is exclusive), progress 0:

```jsonc
{
  "id": "new-1718539200000",
  "name": "New task",
  "startDate": "2022-01-10",
  "endDate":   "2022-01-11",
  "duration":  1,
  "progress":  0,
  "type":      "task",
  "parentId":  1
}
```

---

## 2. The task list (seed `tasks`)

The `tasks` prop is the **stable seed** — it never changes after mount. All
edits live in the change log layered on top of it. The active mock:

```jsonc
[
  { "id": 1000, "name": "Launch SaaS Product", "startDate": "2022-01-10", "endDate": "2022-01-22", "progress": 27, "type": "summary" },
  { "id": 1,    "name": "Setup web server",    "startDate": "2022-01-10", "endDate": "2022-01-14", "progress": 33.3, "parentId": 1000 },
  { "id": 11,   "name": "Install Apache",      "startDate": "2022-01-10", "endDate": "2022-01-11", "progress": 50,   "parentId": 1 },
  { "id": 12,   "name": "Configure firewall",  "startDate": "2022-01-10", "endDate": "2022-01-12", "progress": 50,   "parentId": 1 },
  { "id": 333,  "name": "Application tests",   "startDate": "2022-01-01", "endDate": "2022-01-03", "progress": 0 },
  { "id": 334,  "name": "Monkey tests",        "startDate": "2022-01-20", "endDate": "2022-01-23", "progress": 0 }
]
```

Hierarchy via `parentId`:

```
1000  Launch SaaS Product (summary)
└── 1    Setup web server
    ├── 11   Install Apache
    └── 12   Configure firewall
333   Application tests   (root)
334   Monkey tests        (root)
```

Dependencies are separate (`mockDependencies`):

```jsonc
[ { "from": 11, "to": 12, "type": "FF" } ]   // finish-to-finish
```

---

## 3. The change log (`ChangeLog`) — "logs"

The single source of truth for every mutation. A **transaction** is one user
action (an array of commands); `cursor` is how many transactions are applied.

```ts
type TaskCommand =
  | { type: "create"; task: GanttTask; afterId?: Id | null }  // null/undefined = append
  | { type: "update"; task: GanttTask }
  | { type: "delete"; id: Id };

interface ChangeLog {
  transactions: TaskCommand[][];   // each entry = one undo step
  cursor: number;                  // applied = transactions[0 .. cursor)
}
```

### Empty (fresh mount)

```jsonc
{ "transactions": [], "cursor": 0 }
```

### After: drag "Install Apache" (id 11), which cascades to "Configure firewall" (id 12) via the FF dependency

One transaction, two commands → **one** undo step:

```jsonc
{
  "transactions": [
    [
      { "type": "update", "task": { "id": 11, "name": "Install Apache",     "startDate": "2022-01-12", "endDate": "2022-01-13", "progress": 50, "parentId": 1 } },
      { "type": "update", "task": { "id": 12, "name": "Configure firewall", "startDate": "2022-01-12", "endDate": "2022-01-14", "progress": 50, "parentId": 1 } }
    ]
  ],
  "cursor": 1
}
```

### Then: create a task after id 12, then delete id 334

```jsonc
{
  "transactions": [
    [ /* the drag above */ ],
    [ { "type": "create", "task": { "id": "new-1", "name": "New task", "startDate": "2022-01-12", "endDate": "2022-01-13", "duration": 1, "progress": 0, "type": "task", "parentId": 1 }, "afterId": 12 } ],
    [ { "type": "delete", "id": 334 } ]
  ],
  "cursor": 3
}
```

### Undo / redo = move the cursor (transactions are kept)

```jsonc
// after one undo — the delete is no longer applied, 334 reappears
{ "transactions": [ /* …3 transactions… */ ], "cursor": 2 }

// after a second undo — create also dropped
{ "transactions": [ /* …3 transactions… */ ], "cursor": 1 }
```

A **new** action while `cursor < transactions.length` truncates the redo branch
(everything after the cursor is discarded) before appending.

---

## 4. Resolved + flattened output (`getTaskList`)

`resolveCommittedTasks` replays `transactions[0..cursor)` over the seed (an
ordered id list preserves create/delete position), then `getTaskList` flattens
the tree and **rolls parent rows up** from their children (parent `startDate` =
min child start, `endDate` = max child end, `progress` = mean of non-milestone
children).

Given the empty log, the seed above resolves & flattens to:

```jsonc
[
  // 1000 rolled up from child {1}, which is rolled up from {11,12}
  { "id": 1000, "name": "Launch SaaS Product", "startDate": "2022-01-10", "endDate": "2022-01-14", "progress": 50, "type": "summary" },
  { "id": 1,    "name": "Setup web server",    "startDate": "2022-01-10", "endDate": "2022-01-12", "progress": 50,   "parentId": 1000 },
  { "id": 11,   "name": "Install Apache",      "startDate": "2022-01-10", "endDate": "2022-01-11", "progress": 50,   "parentId": 1 },
  { "id": 12,   "name": "Configure firewall",  "startDate": "2022-01-10", "endDate": "2022-01-12", "progress": 50,   "parentId": 1 },
  { "id": 333,  "name": "Application tests",   "startDate": "2022-01-01", "endDate": "2022-01-03", "progress": 0 },
  { "id": 334,  "name": "Monkey tests",        "startDate": "2022-01-20", "endDate": "2022-01-23", "progress": 0 }
]
```

> Note: rolled-up parent values (the `1000` / `1` rows) are **derived for
> display** by `getParentTaskData` — they are not written back into the log.
> Deleting a parent hides its whole subtree (orphaned children aren't reachable
> from a root).

---

### Where each lives in code

| Structure            | Defined in                          | Built by                                  |
| -------------------- | ----------------------------------- | ----------------------------------------- |
| `GanttTask`          | `src/types.ts`                      | consumer / `createTask`                   |
| seed `tasks`         | consumer (`apps/playground/mock.ts`)| passed to `<Gantt tasks={…} />`           |
| `ChangeLog` (logs)   | `src/types.ts`                      | `src/hooks/useTaskList.ts` (`setLog`)     |
| resolved tasks       | —                                   | `resolveCommittedTasks` (`prepareData.ts`)|
| flattened list       | —                                   | `getTaskList` (`prepareData.ts`)          |
