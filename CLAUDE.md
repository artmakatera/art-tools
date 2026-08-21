# Project conventions

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

Two consequences worth stating plainly: a rule of the form "remove comments
except JSDoc" does not apply here — much of the rationale above lives in `//`
comments (nearly all of `GanttContext.tsx`'s architecture notes do), while
`types.ts` is mostly JSDoc, so syntax and value are uncorrelated. And when a
comment and the code disagree, the comment is a bug: fix or delete it, do not
leave it. `dateUtils.resolveOrigin` carried a false "cannot drift" claim for
exactly this reason.

DO Not commit by itself!
