# ADR-027: Pointer-anchored timeline elements

Status: Accepted

## Decision

A timeline element may use `date: "pointer"` instead of a fixed Date. Its existing
required render callback receives a resolved Date and the same geometry as
fixed-date entries. Consumers compose Marker and provide the formatted date as
its title; the layer does not choose a visual or a date format. Both Gantt and
standalone GanttProvider compositions use the same timelineElements API.

The anchor appears only over the visible grid body, excluding the sticky calendar
and scrollbars. It follows the mouse horizontally, using the existing dateAtOffset
inverse with column unit and step. It neither snaps nor changes the axis range or
task scheduling. Scrolling and zooming resolve the date at the stationary mouse.
The label remains pinned below the calendar. Mouse leave and window blur hide it.
Touch and keyboard tracking are not introduced.

Mouse events are captured on the body, and bursts are coalesced with
requestAnimationFrame. Pointer state lives in the overlay rather than Grid or
GanttProvider, so mouse motion does not invalidate task rows. Listeners are
installed only while pointer entries exist and removed with pending frames on
cleanup. Fixed and pointer entries preserve array order.

Every pointer entry descendant ignores pointer events, including Marker labels.
Otherwise the moving label could intercept task interaction and become its own
hover target. Fixed-date entries retain their interactive labels (ADR-026).

## Alternatives and cost

A separate renderHoverMarker prop duplicates the existing overlay composition
API. A demo-owned mouse listener would require consumers to reconstruct private
axis and scroll geometry. The pointer sentinel reuses the existing entry shape;
the render context still always exposes a Date, never the sentinel.

Rendering follows animation frames, so the visual may trail by one frame. Layout
bounds are read for each measurement to account for scrolling and page position.
Arbitrary wide content may clip at the viewport edges, just like fixed-date
overlays; no collision or label measurement system is introduced.
