# ADR-022 — The bar tooltip is a slot with no default

- **Status:** Accepted
- **Context:** Slots & theming — see the [glossary](../glossary.md) and the [ADR index](./README.md).

**Decision.** `GanttBarsSlots` gains `tooltip?: BarTooltipSlotConfig`, rendered by `DraggableBar`,
and empty by default. `GanttBarTooltip` is exported as an opt-in implementation. The slot component
receives the task, the resolved progress, an already-inclusive `displayEnd`, `children` (the bar),
and an `anchorRef` (the bar's DOM node). An `anchorName` ident was part of this shape while placement
was CSS-anchored; it is gone, along with `anchor-name` on the three bar classes and the row's
`--am-gantt-bar-anchor`.

**There is no `open` prop, and no open state outside the slot.** That is the load-bearing decision
here — see below.

**`DraggableBar` is the render site.** The tooltip sits inside the bar element, so it is scoped to
the bar's own hover — a row spans the whole timeline width — and anchors to that element without a
ref threaded down. `Row` keeps its own row-level `hovered` for `ConnectorHandles`.

**The cost, accepted knowingly: `DraggableBar` is only the _default_ root.** Replacing `slots.root`
removes the tooltip unless the replacement forwards the `tooltip` prop. Pinned by a test.

## The slot wraps the bar, and owns all of the open state

The slot receives the bar as `children` and renders it. `BarTooltipConsumer` resolves which slot to
use, merges `slotProps`, and is otherwise **stateless** — it holds no `open`, provides no context,
and passes no `open` prop.

Inside the slot, three exported primitives:

- `BarTooltipRoot` owns `open` and publishes it through `BarTooltipContext`.
- `BarTooltipTrigger` watches the pointer and reports into that state.
- `useBarTooltip()` reads it, for whatever renders the popup.

`GanttBarTooltip` is just those three composed, and holds no privileged position.

**Why the state is in the slot and not the chart.** A third-party tooltip — Base UI, Radix, Floating
UI — arrives with its own root, trigger and open state. If the chart owned `open` and passed it down,
every such slot would have to reconcile two sources of truth for the same boolean, which is the class
of bug where a tooltip is stuck open because one side thinks it is closed. With no chart-level state
there is nothing to reconcile: the slot gets `children` and renders whatever tooltip it likes around
them. Pinned by a test that uses a slot with a plain `useState` and none of the library's primitives.

It also puts the _policy_ where it can be replaced. Dwell delay, open on click, ignore hover — all
now decisions a slot makes, with no change to `DraggableBar`. The trigger lived in `DraggableBar`
first, then briefly in the consumer; both put that policy where no slot could reach it.

**The slot is mounted unconditionally, hovered or not.** Two reasons, and the first alone is
decisive: the trigger is inside the slot, so rendering the slot only while open leaves nothing to open
it. The second is a bug that took a while to place. Switching between `<Tooltip>{children}</Tooltip>`
and bare `children` changes the tree shape, so React remounted the bar on every hover; the pointer was
then sitting over a detached node, `mouseleave` never fired, and the tooltip stayed up. It presented
as "`setOpen(false)` doesn't always work". A fixed tree shape is the fix, and a test asserts the bar's
DOM node is identical before and after a hover.

**Two costs follow.** A slot that renders `children` bare never shows anything, and fails _silently_ —
there is no error, because there is no longer a prop it can be caught ignoring. Pinned by a test. And
one slot instance is mounted per visible row, roughly thirty, so `useTooltipPosition` gates its
`mousemove` listener on `open`; without that every mounted tooltip would call `setState` on every
pointer move anywhere in the chart.

**The trigger merges onto its child rather than wrapping it.** `cloneElement` adds no DOM. Base UI's
trigger renders a `<button>` by default, and the bar already contains `<button>` resize and connector
handles — a wrapping trigger would nest buttons and break those controls. Merging also composes with
handlers the element already has, so a consumer's `slotProps.root` keeps firing. With no root above,
the context is `null` and the trigger is a no-op rather than an error, because `TaskBar`/`ProjectBar`/
`MilestoneBar` are public exports that render standalone.

**No chart context is asserted either, for the same reason.** `useTooltipPosition` wants the grid
rect to clamp against, and reads `GanttScrollContext` directly instead of through `useGanttScroll()`,
which throws. Standalone bars are only half of it: `GanttSlotsProvider` is public too, so
`GanttBarTooltip` can legitimately be handed to a bar with no chart around it. The other half is a
hot reload — re-evaluating `contexts.ts` mints a new context object that the mounted provider is not
providing, and the asserting hook turned that into a crash on every HMR update with a tooltip open.
Degrading costs one clamp: with no grid the bounds fall back to the viewport, which is already the
path a zero-size grid rect takes.

**The pointer check asks the DOM, not the geometry.** `closeIfOutside` tests
`bar.contains(event.target)`, and comparing `clientX/Y` against
`getBoundingClientRect()` instead is the bug it replaced, not a refactor of it. Rect
edges are fractional — a row lands on 379.25 — while `clientY` is an integer, so a
pointer the browser had just hit-tested onto the bar (`mouseenter` fired, no
`mouseout` followed) failed `379 >= 379.25` and read as outside. The tooltip closed
under a cursor sitting on the bar, and nothing reopened it, because reopening needs
another `mouseenter` and the pointer had never left. It presented as "a quick move
onto a bar sometimes shows no tooltip", since a quick entry comes to rest in the
sub-pixel band it crossed while a slow one drifts deeper in. Opening by hit-test and
closing by arithmetic is the asymmetry; `contains` removes it, and children — label,
progress fill, resizers — count as the bar for free. The old zero-size-rect guard
goes with it, having only ever papered over unmeasured rects.

**The popup is placed from the pointer that opened it**, not from the first mousemove
after. `BarTooltipTrigger` records the `mouseenter` coordinates and
`useTooltipPosition` places from them in a layout effect. The listener is attached
during that same commit, so the mousemove belonging to the entering gesture has
already been dispatched and is never seen — without the seed the popup's first frame
was its off-screen starting point.

**Consequence for the public API**, decided rather than incurred: `BarTooltipRoot`,
`BarTooltipTrigger` and `useBarTooltip` are exported from the package entry, and
`BarTooltipOwnerState` loses `open`. Without the primitives, a custom tooltip that wants the
library's hover semantics has to reimplement the two closing guards below — which are the part that
is not obvious.

## Closing needs two guards, not just `mouseleave`

Boundary events follow **pointer movement**, not element geometry. When the bar leaves from under a
stationary pointer — a wheel scroll, a zoom changing `colWidth`, a drag repositioning it — no
`mouseout` is dispatched until the next pointer event, and the tooltip hangs. So while open the
trigger also listens for:

- `scroll` on `document`, capture phase (it does not bubble) — the case no pointer check can catch,
  because a stationary cursor during a wheel scroll produces no `mousemove` at all;
- `mousemove`, closing when the pointer is geometrically outside the bar's rect rather than trusting
  the event that did not arrive.

A **zero-size rect is ignored** rather than treated as "pointer outside". Every rect is zero before
first layout, and all of them are zero in jsdom, so trusting one closes the tooltip instantly.

## Placement is computed in JS from the cursor

`position: fixed` with inline `left`/`top`, bottom-right of the pointer by default, and it follows
the pointer for as long as it is open. There is no dwell delay.

Off-side it **flips rather than clamps**: clamping to the far edge drags the tooltip back across the
pointer, which is worse than the overflow it avoids. Bounds are the grid's rect when it has been
measured and the viewport otherwise, and a pointer outside those bounds leaves the position alone —
there is nothing to place against, and the trigger is closing the tooltip on that same event.

**Portalled to `document.body`.** This is what solves the calendar header, and layering cannot.
`.row` is `position: absolute; z-index: 3`, which makes it a stacking context, so a tooltip inside it
is only ever layered against its siblings in that row; what competes with the calendar's `z-index:
30` is the row's **3**. No tooltip z-index can win from in there.

## Three CSS approaches were built and abandoned first

Recorded because each looks correct until measured, and re-proposing any of them would cost the same
day again.

_Anchored to the bar._ Every `position-area` band is derived from the anchor **rectangle's** centre
and edges, so a bar wider than the viewport places the tooltip at its off-screen midpoint. Measured:
a 2580px bar spanning x 593→3173 has its midpoint at 1883, and in a 1456px viewport the tooltip was
put there. Not recoverable with fallbacks — all five block and inline fallbacks were injected,
confirmed parsed (`"flip-block, start span-end, …"`), and the tooltip moved zero pixels, because
every fallback is equally anchor-relative. `position-try-fallbacks` cannot address the header either:
fallbacks fire on **overflow of the containing block**, and the tooltip overflows nothing — it is
occluded by a sibling, which CSS anchor positioning has no way to express.

_Anchored to a pointer-tracking probe._ This did fix the long-bar case and was verified in Chrome,
but it put the pointer plumbing in `Row` and still could not express the header constraint.

_`popover` for the top layer._ Genuinely immune to both the stacking context and ancestor containing
blocks — measured painting 181px past the scroll container's edge — but it requires a
`showPopover()` effect and an override of the UA stylesheet's `inset: 0; margin: auto`.

**Rejected.** A render prop (`renderTooltip`) — it forks the customization model beside a
deliberately single slot system. A library-owned tooltip in the sense of owning touch, dismissal and
collision detection against arbitrary elements — none of that is Gantt-domain, and the SSR example
has to keep working.

**The tooltip is hover-only, and that is deliberate, not an oversight.** Bars are not focusable:
every control inside them is `tabIndex: -1` and only the grid container takes `tabIndex = 0`, so
there is no focus event to trigger on. Adding one means changing the grid's focus model, which is
the `keyboard-navigation` backlog item and needs its own ADR. Until then the accessible name on the
bar (`aria-label`) is unchanged and remains the AT path.

**Consequence for the native title.** With a tooltip slot configured, `Row` omits `title` from the
bar's a11y props — two tooltips would otherwise stack on hover. `aria-label` is untouched. This
makes `BarA11yProps.title` optional and moves `TaskBar`'s label tooltip and `MilestoneBar`'s root
tooltip to follow `a11y.title` rather than the `title` prop, which stays the visible text.
