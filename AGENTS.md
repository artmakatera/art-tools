# Project conventions

Conventions for anyone changing this repo — human or agent. This is the
canonical file; `CLAUDE.md` points here so Claude Code picks it up, and other
agent tools read `AGENTS.md` directly. Edit this one.

Two rules that override the rest:

- **Do not commit.** Leave changes in the working tree; committing is the
  maintainer's call.
- **`./init.sh` is the gate.** Nothing is done until it passes. See
  [Verification commands](#verification-commands).

## Read the reasoning before changing behaviour

This repo keeps its _why_ in [`docs/adr/`](docs/adr/README.md) (23 records) and
its vocabulary in [`docs/glossary.md`](docs/glossary.md). Both are short. An ADR
that reads like a bug — ADR-007's asymmetric anchor projection, ADR-017's
accepted behaviour change at coarse zoom — is a deliberate trade-off, and
"fixing" it is a regression.

## Code style

- Always use curly brackets for `if`/`else if`/`else` blocks, even single-statement
  ones. Do not write braceless one-line conditionals.

  ```ts
  // Bad
  if (cond) doThing();
  else doOther();

  // Good
  if (cond) {
    doThing();
  } else {
    doOther();
  }
  ```

- Prefer early returns (guard clauses) to validate inputs/preconditions up front
  and keep the main logic flat. Avoid wrapping the body in a deep `if` / nesting.

  ```ts
  // Bad — happy path nested inside conditionals
  function scrollToTask(task: GanttTask) {
    const grid = gridRef.current;
    const range = getMinMaxDates(visibleTasks);
    if (grid && range) {
      const origin = addDays(range.min, -padDays);
      // ...rest of the logic, indented one level deeper
    }
  }

  // Good — bail out early, then proceed unindented
  function scrollToTask(task: GanttTask) {
    const grid = gridRef.current;
    const range = getMinMaxDates(visibleTasks);
    if (!grid || !range) {
      return;
    }
    const origin = addDays(range.min, -padDays);
    // ...rest of the logic at the top level
  }
  ```

## Comments

Comments here carry the reasoning, not a narration of the code. Roughly a fifth
of `src/` is comment, and that is deliberate: it is where the non-obvious
decisions live. Before deleting one, work out which kind it is.

**Keep — these are load-bearing:**

- **Why, not what.** Anything explaining a decision, a rejected alternative, or
  a bug that was fixed. If the comment would let a future reader tell a
  deliberate trade-off from an oversight, it stays.
- **ADR citations.** 26 sites cite `docs/adr/`, and for 12 of the 21 ADRs that
  citation is the _only_ path from the code to the reasoning. The ADR index asks
  for exactly this: "Cite these from code comments where the reasoning is
  non-obvious." Note the ADRs' own line references drift; the citations in code
  do not, so they are the durable half of the link.
- **Invariants a type cannot express and a test cannot catch.** "Pass a
  referentially stable object", "identity-stable forever", "do not convert to an
  effect", "must match the CSS", and the `startTransition` pairing in `Bar.tsx`
  (no test can observe it — `act()` collapses transition and urgent lanes). These
  are the comments whose deletion causes a silent regression.
- **Performance rationale**, especially with a measured number in it.
- **Decoders for domain shorthand** — e.g. what `FS`/`SS`/`FF`/`SF` mean at the
  branch that implements them. A naive "restates the code" reading flags these;
  they are the opposite.
- **Section dividers** (`// --- Config ---`) in long files.

**Delete:** comments that restate the next line and nothing more
(`// Use plain records for safe indexing`, `// Depth map: how many levels deep
each task is` above a `depthMap`). If removing it loses no claim, it was noise.

**Do not annotate config properties.** Settings in `package.json`,
`tsconfig*.json`, `vite.config.ts`, `.gitignore`, and
`.github/workflows/*.yml` get no explanatory comment — not for what the option
does, not for why it was chosen, not for what would break without it. That
belongs in `docs/adr/` or in `progress.md`, both of which hold it better and
neither of which goes stale beside a line someone edits. A config file should
read as a list of settings.

```jsonc
// Bad — three lines of rationale on one setting
{
  // The shared react-library config turns this on, which is right for local
  // development but wrong for the published tarball: the maps resolve to
  // ../src/*, and `files` ships only dist.
  "declarationMap": false
}

// Good
{ "declarationMap": false }
```

The narrow exception is a hand-written build step whose correctness depends on
another setting — the `bundleTypes` / `emitCjsTypes` pairing in
`packages/react-gantt/vite.config.ts`. That is an invariant, and it goes on the
function, not on the property.

Two consequences worth stating plainly: a rule of the form "remove comments
except JSDoc" does not apply here — much of the rationale above lives in `//`
comments (nearly all of `GanttContext.tsx`'s architecture notes do), while
`types.ts` is mostly JSDoc, so syntax and value are uncorrelated. And when a
comment and the code disagree, the comment is a bug: fix or delete it, do not
leave it. `dateUtils.resolveOrigin` carried a false "cannot drift" claim for
exactly this reason.

## Verification commands

`./init.sh` is the gate. Run it before claiming anything is done; its output is
the evidence.

| Command                                                  | What it settles                                                                                                  |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `./init.sh`                                              | Everything below, in order. Fails fast.                                                                          |
| `./init.sh --quick`                                      | Skips install and build — the inner loop while iterating.                                                        |
| `pnpm test`                                              | 485 tests across 43 files in `packages/react-gantt`.                                                             |
| `pnpm check-types`                                       | `tsc --noEmit` across all 5 workspaces.                                                                          |
| `pnpm lint`                                              | oxlint. Warnings do not fail; errors do.                                                                         |
| `pnpm format:check`                                      | oxfmt. Warnings do not exist; a mismatch fails.                                                                  |
| `pnpm build`                                             | Turborepo build of every package.                                                                                |
| `pnpm --filter @art-tools/react-gantt test -- <pattern>` | A single test file, while iterating.                                                                             |
| `pnpm bench`                                             | Perf benchmarks in `apps/playground`. Run these for anything touching virtualization or the resolution pipeline. |

Two things about running the apps:

- `pnpm dev` builds `@art-tools/react-gantt` **before** either app starts. Both consume
  its `dist`, so skipping that ordering makes a clean checkout fail to resolve
  the import. It is not optional sequencing.
- `docs/` is prose; `apps/docs/` is the runnable Next.js gallery. The names
  collide and the distinction matters constantly.

## Testing expectations

- Behaviour changes need a test in `packages/react-gantt/src/tests/`. Date
  arithmetic, working-time walks, and dependency scheduling in particular: they
  are where the subtle breakage lives, and they are cheap to test.
- Any new public export must be reflected in `src/tests/publicApi.test.ts` — that
  test is the API surface guard, and passing it accidentally is not the same as
  deciding to widen the API.
- A decision about _behaviour_ — snapping, duration, working time, focus, the
  shape of the axis — needs an ADR in `docs/adr/`, and any new domain term
  belongs in `docs/glossary.md`. Filing the reasoning is part of the work, not
  cleanup afterward.
