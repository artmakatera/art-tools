# Changesets

This folder holds the pending release notes. `@art-tools/react-gantt` is the only
publishable package in the monorepo — everything else is `private: true` and is
skipped automatically, so there is no `ignore` list to maintain.

The loop:

```bash
pnpm changeset          # describe the change, pick major/minor/patch
git push                # CI opens (or updates) a "Version Packages" PR
                        # merging that PR stages a version for npm approval
```

Do not hand-edit `version` in `package.json` or write `CHANGELOG.md` yourself;
`changeset version` owns both. See
[the docs](https://github.com/changesets/changesets) for the file format.

## npm trusted publishing setup

The release workflow uses GitHub Actions OIDC on a GitHub-hosted runner. It runs
`./init.sh` before Changesets can open a version PR or stage a package. CI also runs the
same gate on Node 22 and 24. A failed gate prevents that release run from staging.

For `@art-tools/react-gantt`, open npm **Settings → Trusted Publisher**, choose
**GitHub Actions**, and enter:

| Field                | Value                                                     |
| -------------------- | --------------------------------------------------------- |
| Organization or user | `artmakatera`                                             |
| Repository           | `art-tools`                                               |
| Workflow filename    | `release.yml`                                             |
| Environment name     | Leave empty; the workflow does not declare an environment |
| Allowed actions      | Leave direct publishing and dist-tag management unchecked |

Under **Publishing access**, select **Require two-factor authentication and
disallow tokens** (the UI may describe these as bypass-2FA tokens). Trusted
publishing works with this restriction. No `NPM_TOKEN` or `NODE_AUTH_TOKEN`
secret is required by this workflow.

The existing `RELEASE_TOKEN` secret is a **GitHub** token used by Changesets to
create version PRs and push its version branch. It is
not an npm token. Give it Contents and Pull requests read/write permissions for
this repository; its owner must have access to the repository. Keep this token
so PRs it creates can trigger CI. Repository policy must allow the action to
create pull requests.

The runner installs npm `^11.15.0`, the minimum npm 11 version supporting staged
publishing. Node 24 satisfies its Node requirement. The package requests public
access and provenance.

Merge a changeset into `main`, then review and merge the generated Version
Packages PR. When the package version changes and no changesets remain, the
release workflow runs `npm stage publish` from the package directory. Ordinary
pushes that do not change the version do not submit another candidate.

On npmjs.com, open **Staged Packages**, inspect the candidate, and click
**Approve**. npm prompts for 2FA before the version becomes publicly available.
You can also use `npm stage list @art-tools/react-gantt` and
`npm stage approve <stage-id>` locally while authenticated as a maintainer.
The workflow does not create Git tags or GitHub releases; those can be created
once npm approval succeeds.

To retry a failed staging upload, use **Actions → Release → Run workflow** on
`main`. First check npm's Staged Packages tab: an existing pending candidate
should be approved or rejected instead of submitted again. npm rejects duplicate
versions, including versions already staged or published. A manual run stages the
current version only when there are no pending changesets. A failed registry
request remains a failed workflow; it is never treated as successful staging.

Configure the npm trust before attempting a release. Keep **Allow npm publish**
unchecked and retain **Require two-factor authentication and disallow tokens**.
No approval credentials are supplied to CI. This setup does not change npm
account settings or submit a candidate by itself.

The package check excludes `style.css` from `@arethetypeswrong/cli` because it
uses bundler stylesheet resolution; JavaScript entrypoints remain checked.

References: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
[staged publishing](https://docs.npmjs.com/staged-publishing/),
and [Changesets Action](https://github.com/changesets/action).
