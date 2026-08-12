# ADR-011 — Decision record lives in `docs/` at the monorepo root

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** `docs/adr/NNNN-slug.md` per decision, plus `docs/glossary.md`, generated from this
plan at implementation time.

**Rejected.** `packages/react-gantt/docs/` (travels with the package, poor home for future
monorepo-wide decisions); a single `DESIGN.md` (reads better start-to-finish, but gives no stable
per-decision anchor and handles supersession badly).

**Why.** ADR-007 in particular must be citable from a code comment beside the anchor-projection
helper, because that is exactly where a future reader will try to "fix" the intended asymmetry.

**Cost accepted.** `docs/` does not exist yet and sits confusingly close to `apps/docs/`, the
Next.js examples site. The root `README.md` must distinguish them.
