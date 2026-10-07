# ADR-026: Timeline elements are date-anchored overlays

Status: Accepted

## Decision

`timelineElements` accepts keyed date-anchored overlays, with optional title,
horizontal overscan, and a required rendering callback. The
layer never selects a default visual. Consumers explicitly return
`<Marker {...props} />` or their own component, matching the opt-in
composition used by bar tooltips. Render props omit the React key, which stays
on the positioned wrapper, so spreading them into JSX does not spread a special
React key. Marker consumes layout fields instead of forwarding them to the DOM. Elements never expand
the task/baseline date range, create an empty timeline, or enter scheduling and
undo history. Their exact instants use the axis unit and step without snapping.

A separate context isolates element updates from task/config subscribers. The
body overlay sits above tasks and links and below the sticky calendar (default
z-index 25). Its wrappers and marker lines ignore pointer events; labels accept
hover for a native date tooltip. Custom content explicitly enables pointer events
on interactive descendants. The Marker label advances by scrollTop within the
body, keeping it below the calendar, whose original height remains in layout.

Elements inside the axis are mounted only while their anchor falls within the
horizontal viewport plus overscan (default 256px on both sides). The consumer
increases overscan for wide custom content. Unmounting discards component-local
state. Duplicate React keys and invalid dates are skipped with development
warnings; input order determines stacking for overlapping elements. No collision
layout or automatic Today marker is provided.

## Alternatives and cost

Including overlay dates in the range could create arbitrarily large empty axes.
Keeping every element mounted preserves local state but makes custom rendering
cost depend on the full array. Virtualization trades that state for bounded
mounted work; filtering still scans the supplied array. Measuring arbitrary JSX
would require additional layout passes, so extent allowance is explicit.

A native tooltip on a line requires hit testing and would block task interaction
under that line. Only the label accepts events by default. An unlabeled marker
has no tooltip. All elements are body-only; the calendar remains readable.

## Customization API revision

Component-specific options are passed directly to the component inside
`render`. The former nested `props` field is removed from timeline elements,
render context and Marker. A required render callback already provides this
customization point; typing a second path as Marker props couples generic
overlays to one visual and adds redundant merging precedence. Consumers that
shared a renderer and varied nested props now supply those options in their
render callbacks. Chart-wide Marker defaults still merge with direct Marker
props, with direct props taking precedence.
