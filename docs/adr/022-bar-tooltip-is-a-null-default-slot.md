# ADR-022 — The bar tooltip is a slot with no default

- **Status:** Accepted
- **Context:** Slots & theming — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** `GanttBarsSlots` gains `tooltip?: BarTooltipSlotConfig`, rendered by `Bar` rather than
by the three bar components, and empty by default. `GanttBarTooltip` is exported as an opt-in
implementation. The slot component receives the task, the resolved progress, an already-inclusive
`displayEnd`, plus both an `anchorRef` (the bar's DOM node) and an `anchorName` — the two families of
tooltip need different things, and supplying only one would exclude the other.

`Bar` is the render site because it already tracks `hovered` for `ConnectorHandles`, so no new
hover re-render is introduced, and because one slot there replaces three duplicated ones.

**Placement is the `popover` attribute plus CSS anchor positioning.** The library has no portal and
the grid is `overflow: auto` on both axes, so an inline tooltip is clipped at the grid's edge.
`popover` promotes the element into the **top layer**, which escapes that clipping without a portal
and, unlike a bare `position: fixed`, is also immune to ancestor containing blocks and to stacking
contexts — no z-index has to out-rank the calendar header. `position-try-fallbacks: flip-block`
flips the tooltip below the bar when there is no room above it.

`popover="manual"`, not `auto`: the tooltip's lifetime is the hover and `Bar` unmounts it on mouse
leave, so light-dismiss and Esc have nothing to do, and an `auto` popover would additionally close
unrelated popovers on the consumer's page.

**Rejected.** A render prop (`renderTooltip`) — it forks the customization model beside a
deliberately single slot system. A library-owned tooltip _component_ in the sense of owning
collision detection, delay, touch and dismissal — none of that is Gantt-domain, and the SSR example
has to keep working. A bare `position: fixed` without `popover`, which was tried first: it escapes
the grid's clipping only while no ancestor of the bar establishes a containing block, and it still
fights the calendar header's `z-index: 30`. In the playground it drew a top-row tooltip clipped
against the header, which is what prompted the move to the top layer.

**Cost accepted, three parts.**

One `useEffect` calling `showPopover()`, where the CSS-only version had none. The call is optional
(`el?.showPopover?.()`) so that jsdom, which has no popover implementation, is unaffected.

Anchor positioning is Baseline 2026 but not universal, and the popover UA stylesheet centres an
un-anchored popover in the middle of the viewport. `BarTooltip.module.css` therefore hides the
tooltip under `@supports not (position-anchor: --x)` and degrades to the native `title`.

`flip-block` covers the block axis only. CSS anchor positioning has no equivalent of a shift
middleware — only discrete fallback positions — so a bar whose centre sits within half a tooltip's
width of the viewport edge can still overflow on the inline axis. Measured as not occurring at the
right edge of a 1680px viewport; if it becomes a problem, the fix is `span-inline-start` fallbacks
rather than JS measurement.

**The tooltip is hover-only, and that is deliberate, not an oversight.** Bars are not focusable:
every control inside them is `tabIndex: -1` and only the grid container takes `tabIndex = 0`, so
there is no focus event to trigger on. Adding one means changing the grid's focus model, which is
the `keyboard-navigation` backlog item and needs its own ADR. Until then the accessible name on the
bar (`aria-label`) is unchanged and remains the AT path.

**Consequence for the native title.** With a tooltip slot configured, `Bar` omits `title` from the
bar's a11y props — two tooltips would otherwise stack on hover. `aria-label` is untouched. This
makes `BarA11yProps.title` optional and moves `TaskBar`'s label tooltip and `MilestoneBar`'s root
tooltip to follow `a11y.title` rather than the `title` prop, which stays the visible text.
