# Progress log

Append-only. Newest entry at the top. Chat history does not survive a session;
this file does.

**Last Updated:** 2026-08-21
**Current Objective:** None — no feature is in progress. Pick one from
[`feature_list.json`](./feature_list.json).
**Recommended Next Step:** `baseline-format-debt` — it is the only thing keeping
`./init.sh` from passing on a clean checkout, and it is a one-command fix.

---

## Current State

|                 |                                                                |
| --------------- | -------------------------------------------------------------- |
| Active feature  | none                                                           |
| Branch          | `main`                                                         |
| Baseline commit | `8d4c65c` — docs: update roadmap                               |
| Gate status     | **red** — `pnpm format:check` fails on one file (pre-existing) |

Everything else is green. The red is documented debt, not a regression: see
`baseline-format-debt` in the feature list.

---

## Verification Evidence

Recorded 2026-08-21 against `8d4c65c`. Re-run `./init.sh` and replace this block
when you change anything.

| Command             | Result                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`         | 0 errors, 1 warning — `clsx` default-import in `packages/react-gantt/src/components/bars/taskBar/TaskResizer.tsx:1` |
| `pnpm check-types`  | 5/5 workspaces pass                                                                                                 |
| `pnpm test`         | **485 passed** across 43 files (`@am/react-gantt`)                                                                  |
| `pnpm format:check` | **FAIL** — `packages/react-gantt/README.md`. Fix: `pnpm format`                                                     |

```
Test Files  43 passed (43)
     Tests  485 passed (485)
```

---

## Log

### 2026-08-21 — Harness installed

**What changed:** Added the agent harness — `init.sh` at the repo root,
`feature_list.json`, `progress.md`, and `session-handoff.md` under
`.claude/harness/`, plus Startup / Verification / Scope / Definition-of-done /
End-of-session sections appended to `CLAUDE.md`. Existing code-style and comment
conventions in `CLAUDE.md` were left verbatim.

**Why:** The repo already had an unusually strong reasoning layer — 21 ADRs, a
glossary, thorough READMEs — but nothing telling an agent where to start, what
"done" means, or how to hand off. Docs answered _why the code is shaped this
way_ and nothing answered _what should I do now_.

**Evidence:** The table above. `./init.sh` was not run end-to-end as a script;
each command in it was run individually and its real output is recorded above.

**Findings worth keeping:**

- `pnpm format:check` has been failing since `8d4c65c` on
  `packages/react-gantt/README.md`. Filed as `baseline-format-debt`. Left
  unfixed deliberately — it is a content change nobody asked for.
- `packages/react-gantt/README.md:502` links to `#1-keyboard-navigation`, a
  heading that does not exist. The roadmap once had a keyboard-navigation entry
  and now has only Critical path and Export/print, so the accessibility caveat
  points at nothing. Filed as `roadmap-keyboard-anchor`.

**Next:** Nothing is in progress. Take `baseline-format-debt` first so the gate
goes green.
