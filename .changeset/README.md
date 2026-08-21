# Changesets

This folder holds the pending release notes. `@art-tools/react-gantt` is the only
publishable package in the monorepo — everything else is `private: true` and is
skipped automatically, so there is no `ignore` list to maintain.

The loop:

```bash
pnpm changeset          # describe the change, pick major/minor/patch
git push                # CI opens (or updates) a "Version Packages" PR
                        # merging that PR publishes to npm
```

Do not hand-edit `version` in `package.json` or write `CHANGELOG.md` yourself;
`changeset version` owns both. See
[the docs](https://github.com/changesets/changesets) for the file format.
