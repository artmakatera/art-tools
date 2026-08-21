# Progress log

Append-only. Newest entry at the top. Chat history does not survive a session;
this file does.

**Last Updated:** 2026-08-21
**Current Objective:** `npm-publish-readiness` — all code work landed; blocked
only on `baseline-format-debt` for the final gate criterion.
**Recommended Next Step:** `baseline-format-debt` — still a one-command fix
(`pnpm format`), and it is now the single thing standing between
`npm-publish-readiness` and done.

---

## Current State

|                 |                                                                |
| --------------- | -------------------------------------------------------------- |
| Active feature  | `npm-publish-readiness`                                        |
| Branch          | `critical-path` (nothing committed)                            |
| Baseline commit | `8d4c65c` — docs: update roadmap                               |
| Gate status     | **red** — `pnpm format:check` fails on one file (pre-existing) |

The red is the same single pre-existing file it was before this session, not a
regression: see `baseline-format-debt`. Lint, types, tests and build are green.

---

## Verification Evidence

Recorded 2026-08-21 against the working tree (uncommitted, on `critical-path`).
Re-run `./init.sh` and replace this block when you change anything.

| Command             | Result                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`         | 0 errors, 1 warning — `clsx` default-import in `packages/react-gantt/src/components/bars/taskBar/TaskResizer.tsx:1` |
| `pnpm check-types`  | 5/5 workspaces pass                                                                                                 |
| `pnpm test`         | **485 passed** across 43 files (`@am-tools/react-gantt`)                                                            |
| `pnpm format:check` | **FAIL** — `packages/react-gantt/README.md`. Pre-existing. Fix: `pnpm format`                                       |
| `pnpm build`        | 3/3 tasks successful — library + both consumer apps                                                                 |

```
Test Files  43 passed (43)
     Tests  485 passed (485)

 Tasks:    3 successful, 3 total     (pnpm build)
```

`./init.sh` fails fast at `format:check`, so it never reaches its own build step;
`pnpm build` above was run separately.

### Package checks

| Command                                                          | Result                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `pnpm dlx publint packages/react-gantt`                          | **All good!**                                                      |
| `@arethetypeswrong/cli --pack … --exclude-entrypoints style.css` | **No problems found** — green on node10, node16 CJS + ESM, bundler |
| `npm pack --dry-run`                                             | 11 files, 256.5 kB packed / 974.1 kB unpacked                      |
| `pnpm changeset status`                                          | one pending **minor** for `@am-tools/react-gantt`                  |

```
📦  @am-tools/react-gantt@0.0.0
   1.1kB  LICENSE
  28.0kB  README.md
  62.2kB  dist/index.cjs
 352.4kB  dist/index.cjs.map
  40.9kB  dist/index.d.cts
  40.9kB  dist/index.d.ts
  84.0kB  dist/index.mjs
 351.0kB  dist/index.mjs.map
  10.5kB  dist/style.css
   670B   dist/style.css.d.ts
   2.4kB  package.json
```

No `src/`, no tests, no tsconfig, no `.turbo/`. The two `.js.map` files are 703 kB
of the 974 kB unpacked and are shipped deliberately — see the comment in
`vite.config.ts`.

---

## Log

### 2026-08-21 — npm publish readiness (`npm-publish-readiness`)

**What changed:** Made `packages/react-gantt` publishable to the public npm
registry as `@am-tools/react-gantt`, and wired the release path. Nothing was
published and nothing was committed.

- **Renamed** `@am/react-gantt` → `@am-tools/react-gantt`, 59 occurrences across
  39 files, plus a `pnpm install` to relink. The other six `@am/*` packages are
  `private: true` and were left alone.
- **Manifest**: removed `private`, added `publishConfig.access: public` +
  `provenance`, `license`, `author`, `repository` (with `directory`), `homepage`,
  `bugs`, `keywords`, `engines`, a real `description`, `exports["./package.json"]`,
  and a `prepublishOnly` build guard.
- **MIT LICENSE** at the repo root and inside the package.
- **Build output**: `dist/style.css.d.ts` is now emitted so no export condition
  escapes `dist`, and `files` is just `["dist"]`. `declarationMap` is off for the
  build tsconfig. Declarations are bundled into one file and copied to
  `index.d.cts` for the `require` condition.
- **Changesets** at the root with one pending minor changeset, plus
  `changeset` / `version-packages` / `release` scripts.
- **CI**: `.github/workflows/ci.yml` (lint, types, test, build on Node 20 + 24,
  plus a publint/attw package job) and `release.yml` (changesets action, npm
  provenance via `id-token: write`).
- **Ignore hardening**: `.gitignore` gained `.env*`/`!.env.example`, `*.tgz`,
  `*.key`, `.npmrc.local`, and `.claude/settings.local.json`. The tracked root
  `.npmrc` is still credential-free and now says so.

**Why:** The package had never been published and could not be. It was
`private: true`, unlicensed, and had no `prepublishOnly` — and since `dist/` is
gitignored, a publish from a fresh clone would have shipped an empty tarball.

**Verification:** see the evidence table above. `publint` reports "All good!";
`attw` is green on all four resolution modes.

**Findings worth keeping:**

- **`publint` caught a real defect the plan did not anticipate.** With
  `"type": "module"`, a plain `dist/index.d.ts` is read as ESM types, so the
  `require` condition was handing CJS consumers types describing an ES module.
  Fixed by bundling declarations and emitting an `index.d.cts` twin, with the
  `types` condition split per import/require. This is why both `publint` and
  `attw` are in CI — neither would have been caught by tests or `tsc`.
- **The dts rollup option is `bundleTypes`, not `rollupTypes`.**
  `vite-plugin-dts@5` delegates to `unplugin-dts@1`, which renamed it, and the
  old name is _silently ignored_ rather than rejected — the build succeeds and
  emits an unbundled tree. Verify with
  `grep -c 'from "\./' dist/index.d.ts` (must be 0). Requires
  `@microsoft/api-extractor`, added as a devDep.
- **`attw` flags the `./style.css` subpath and always will.** It applies Node
  module resolution to a stylesheet: node10 predates `exports`, and the CJS row
  objects to ESM-flavoured types for a file only ever imported for side effect by
  a bundler. CI excludes that one entrypoint rather than the _rule_, so a real
  regression on the JS entry still fails.
- **The rename broke `format:check` on five files** (longer specifier reflowed
  three `package.json`s and a markdown table). Those five were formatted; the
  sixth, `packages/react-gantt/README.md`, was left red because it is
  `baseline-format-debt` and not this feature's to fix.
- The plan called for `version: 0.1.0` _and_ a pending minor changeset, which
  compose to `0.2.0`. Version is `0.0.0` so the first release lands on `0.1.0`.

**Not done:** the last `doneCriteria` entry — `./init.sh` passes — is unmet,
because the gate still exits 1 at `format:check` on the pre-existing file. No
further code change is needed for this feature; clearing `baseline-format-debt`
satisfies it.

**Two things only the repo owner can do**, both outside this work: create an npm
granular-access token and add it as the `NPM_TOKEN` repository secret, and make
the GitHub repo public (provenance attestation requires it). Also worth running
`npm login && npm access list packages @am-tools` early — scope ownership cannot
be checked from here, and a second rename is far cheaper before the first release
than after.

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
