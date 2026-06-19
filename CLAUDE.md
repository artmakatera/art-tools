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
