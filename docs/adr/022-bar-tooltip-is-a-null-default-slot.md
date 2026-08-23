# ADR-022 — The bar tooltip is a slot with no default

- **Status:** Accepted
- **Context:** Slots & theming — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** `GanttBarsSlots` gains `tooltip?: BarTooltipSlotConfig`, rendered by `DraggableBar`,
and empty by default. `GanttBarTooltip` is exported as an opt-in
implementation. The slot component receives the task, the resolved progress, an already-inclusive
`displayEnd`, an `anchorRef` (the bar's DOM node), and an optional `delayMs`. An `anchorName` ident
was part of this shape while placement was CSS-anchored; it is gone, along with `anchor-name` on the
three bar classes and the row's `--am-gantt-bar-anchor`.

**`DraggableBar` is the render site.** The tooltip sits inside the bar element, so it is scoped to
the bar's own hover — a row spans the whole timeline width — and anchors to that element without a
ref threaded down. `Row` keeps its own row-level `hovered` for `ConnectorHandles`.

**The cost, accepted knowingly: `DraggableBar` is only the _default_ root.** Replacing `slots.root`
removes the tooltip unless the replacement forwards the `tooltip` prop. Pinned by a test.

**Placement is computed in JS from the cursor, with `position: fixed` and inline `left`/`top`.**
Bottom-right of the pointer by default, flipped left or up rather than allowed off-screen, and never
inside the sticky calendar's band. It appears after a 500ms dwell, is positioned once when that
delay elapses, and does not follow the pointer afterwards. The dwell restarts per bar, because the
timer lives in the mounted tooltip and dies with it.

**Three CSS approaches were built and abandoned first, each for a structural reason.** They are
recorded because each looks correct until measured, and re-proposing any of them would cost the same
day again.

_Anchored to the bar._ Every `position-area` band is derived from the anchor **rectangle's** centre
and edges, so a bar wider than the viewport places the tooltip at its off-screen midpoint. Measured:
a 2580px bar spanning x 593→3173 has its midpoint at 1883, and in a 1456px viewport the tooltip was
put there. Not recoverable with fallbacks — all five block and inline fallbacks were injected,
confirmed parsed (`"flip-block, start span-end, …"`), and the tooltip moved zero pixels, because
every fallback is equally anchor-relative.

_Anchored to a pointer-tracking probe._ This did fix the long-bar case and was verified in Chrome,
but it put the pointer plumbing in `Row` and still could not express the header constraint.

_`popover` for the top layer._ Genuinely immune to both the stacking context and ancestor containing
blocks — measured painting 181px past the scroll container's edge — but it requires a
`showPopover()` effect and an override of the UA stylesheet's `inset: 0; margin: auto`, and the
tooltip was wanted effect-free.

**The stacking constraint is the reason placement, not layering, solves the header.** `.row` is
`position: absolute; z-index: 3`, which makes it a stacking context, so a tooltip inside it is only
ever layered against its siblings in that row. What competes with the calendar's `z-index: 30` is
the row's **3**. No tooltip z-index can win, so `headerBottom` is a hard floor in the placement
function rather than a preference. `position-try-fallbacks` cannot help here either: fallbacks fire
on **overflow of the containing block**, and the tooltip overflows nothing — it is occluded by a
sibling, which CSS anchor positioning has no way to express.

**Rejected.** A render prop (`renderTooltip`) — it forks the customization model beside a
deliberately single slot system. A library-owned tooltip in the sense of owning touch, dismissal and
collision detection against arbitrary elements — none of that is Gantt-domain, and the SSR example
has to keep working.

**Cost accepted, three parts.**

Two render passes. Placement depends on the tooltip's own measured size, which depends on its
content, so the first pass renders `visibility: hidden` purely to be measured and a `useLayoutEffect`
writes the final position before paint. No flicker, but the component is no longer effect-free.

One document-level `mousemove` listener, registered on the first tooltip mount and never removed.

It cannot be per-instance, and the reason is worth stating precisely because the obvious reading is
wrong. The DOM has no "where is the cursor now" API, so the position must come from an event. The
event order for a pointer entering an element is `mouseover` → `mouseenter` → `mousemove`, which
suggests a listener registered during the mount would catch the move that caused it. It does not: a
single physical move dispatches all three **synchronously inside one input event**, and React flushes
the resulting effects only afterwards, so the listener is late by exactly one event. Verified in
Chrome — a mount-time listener saw nothing at all when the pointer moved onto a bar and stopped,
which is the canonical tooltip gesture. Passing the entry point down from `Row`'s `mouseenter` also
works and was tried, but it puts pointer state in `Row` for a value only the tooltip wants.

Lazy rather than at import time: `dist` is a single bundled module, so an import-time
`addEventListener` would attach for every consumer of the library, including those that never render
a tooltip. It would also throw under SSR.

The residual cost is the **first hover of a page load**, which has no sample yet and falls back to
just below the bar, horizontally clamped into the viewport so a bar wider than the screen still
places the tooltip somewhere visible.

The header rule is untestable in jsdom. `headerBottomOf` walks up for an ancestor whose computed
`overflow-y` is `auto`, and jsdom applies no CSS-module styles, so the walk finds nothing and the
constraint drops to 0. The viewport flips are covered by unit tests; the header avoidance is
browser-verified only.

**The tooltip is hover-only, and that is deliberate, not an oversight.** Bars are not focusable:
every control inside them is `tabIndex: -1` and only the grid container takes `tabIndex = 0`, so
there is no focus event to trigger on. Adding one means changing the grid's focus model, which is
the `keyboard-navigation` backlog item and needs its own ADR. Until then the accessible name on the
bar (`aria-label`) is unchanged and remains the AT path.

**Consequence for the native title.** With a tooltip slot configured, `Row` omits `title` from the
bar's a11y props — two tooltips would otherwise stack on hover. `aria-label` is untouched. This
makes `BarA11yProps.title` optional and moves `TaskBar`'s label tooltip and `MilestoneBar`'s root
tooltip to follow `a11y.title` rather than the `title` prop, which stays the visible text.
