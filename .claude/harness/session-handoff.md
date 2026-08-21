# Session handoff

Overwrite this whole file at the end of every session. It answers one question:
**what would the next agent need in order to not start over?**

Keep it short. Long-lived history belongs in [`progress.md`](./progress.md);
this is the top of the next session's stack.

---

**Last Updated:** 2026-08-21
**Current Objective:** None — harness just installed, no feature started.

## Where things stand

The harness is in place and the baseline is measured. No feature work has begun.
`./init.sh` currently exits non-zero on `pnpm format:check` only; every other
check is green.

## Blockers

- **`baseline-format-debt`** — `pnpm format:check` fails on
  `packages/react-gantt/README.md`, pre-existing since `8d4c65c`. Not fixed here
  because reformatting a doc is a change the user did not ask for. Until it
  lands, `./init.sh` is red for reasons unrelated to whatever you are building,
  which is exactly how a gate gets ignored. Clear it first.
- **`keyboard-navigation`** is blocked on a design decision, not on code: the
  focus model (roving tabindex across a virtualized treegrid vs. application
  mode) has to be settled in an ADR first. Do not start implementing it.

## Files touched this session

| File                                 | Change                                                    |
| ------------------------------------ | --------------------------------------------------------- |
| `CLAUDE.md`                          | Appended harness sections; existing conventions untouched |
| `init.sh`                            | New — verification gate                                   |
| `.claude/harness/feature_list.json`  | New — backlog seeded from the roadmap                     |
| `.claude/harness/progress.md`        | New — baseline evidence                                   |
| `.claude/harness/session-handoff.md` | New — this file                                           |

Nothing under `packages/` or `apps/` was modified. Nothing was committed.

## Next Session

1. `./init.sh` — confirm the baseline still matches `progress.md`. If it does
   not, reconcile before doing anything else.
2. Take `baseline-format-debt` (`pnpm format`, review the diff, confirm it is
   whitespace only).
3. Then pick one feature from `feature_list.json` whose `dependencies` are all
   `done`, set `activeFeature`, and work only on that.
