# ADR-008 — The drag preview stays rigid

- **Status:** Accepted
- **Context:** Working time (days & hours) — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** The bar keeps its pixel width during a drag; working-time geometry resolves on drop.
No calendar reads in the mousemove path.

**Rejected.** Live stretching as the bar crosses non-working time (WYSIWYG, no jump, but `useDrag`
fires once per mousemove with no rAF throttle at `hooks/useDrag.ts:41-47`, so every frame would
run calendar walks per dragged bar); rigid-with-skipped-time-shaded (a third visual state, and the
right edge still lands somewhere other than the drop point).

**Cost accepted.** The bar jumps on release. Mitigating factor: drag already snaps to a `colWidth`
multiple on release (`components/bars/common/DraggableBar.tsx:52`), so a small jump exists today.

**Structural consequence.** `moveAt` and `resizeAt` (`Row.tsx:66-74`) currently serve both preview
and commit. They must split, so that "no calendar in the hot path" is enforced by the shape of the
code rather than by discipline.
