# `@am/oxlint-config`

Shared [oxlint](https://oxc.rs/docs/guide/usage/linter) configs. The repo uses oxlint + oxfmt;
there is no ESLint anywhere.

| Config       | Extends      | For                                     |
| ------------ | ------------ | --------------------------------------- |
| `base.json`  | —            | any package                             |
| `react.json` | `base.json`  | React packages and apps                 |
| `next.json`  | `react.json` | Next.js apps (adds the `nextjs` plugin) |

Consume via the path form, which is what every package here already does:

```json
{ "extends": ["./node_modules/@am/oxlint-config/react.json"] }
```

## Why specific rules are off

oxlint's config schema is strict — unknown keys are a hard parse error, so these notes cannot
live as comments in the JSON.

- **`import/no-unassigned-import`** — side-effect imports are load-bearing in this repo, not
  oversights. Stylesheets (`@am/react-gantt/style.css`, `./globals.css`) and Next's `server-only`
  poison pill exist purely for their side effect and have nothing to assign.
- **`jsx-a11y/click-events-have-key-events`**, **`jsx-a11y/no-static-element-interactions`** — the
  Gantt's rows _are_ keyboard-operable, but through a `keydown` handler delegated to the pane
  container. The rules only look at the element with `onClick` and cannot see the delegation, so
  they fire on every row. Satisfying them would mean scattered disables or misleading roles.
- **`jsx-a11y/prefer-tag-over-role`** — the connector handles must stay positioned `div`s with
  `role="button"`; a real `<button>` cannot be placed the same way, and a test pins the role.
- **`react/react-in-jsx-scope`** — automatic JSX runtime.
