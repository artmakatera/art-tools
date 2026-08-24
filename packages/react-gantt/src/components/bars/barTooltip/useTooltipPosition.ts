import { useContext, useState, type CSSProperties, type RefObject, useDeferredValue } from "react";
import { GanttScrollContext } from "../../../context/contexts";
import { useIsomorphicLayoutEffect } from "../../../hooks/useIsomorphicLayoutEffect";

/** Gap between the cursor and the tooltip's nearest corner, px. */
const CURSOR_OFFSET = 12;
/** Distance kept clear of the bounding edges, px. */
const EDGE_MARGIN = 8;


let openedAt: { x: number; y: number } | null = null;

export function rememberOpenPointer(x: number, y: number) {
  openedAt = { x, y };
}

interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function placeAxis(cursor: number, size: number, min: number, max: number): number {
  const after = cursor + CURSOR_OFFSET;
  const fitsAfter = after + size <= max - EDGE_MARGIN;
  return Math.max(fitsAfter ? after : cursor - CURSOR_OFFSET - size, min + EDGE_MARGIN);
}

export const useTooltipPosition = (
  tooltipRef: RefObject<HTMLDivElement | null>,
  open: boolean,
): CSSProperties => {
  // Read the context, do not assert it: `useGanttScroll()` throws without a
  // provider, and this hook must not. Two cases reach it with no provider above.
  //
  // `TaskBar`/`ProjectBar`/`MilestoneBar` are public exports that render
  // standalone, and `GanttSlotsProvider` is public too — so a bar can be handed
  // this tooltip with no chart around it, the same case that makes
  // `useBarTooltip` return null rather than throw (ADR-022).
  //
  // The other is a hot reload. Re-evaluating `contexts.ts` mints a new context
  // object, which the already-mounted provider is not providing; the throwing
  // hook turned that into a crash on every HMR update with a tooltip open.
  //
  // Losing the grid only widens the bounds — the fallback below is the viewport,
  // which is why degrading here costs nothing but a clamp.
  const gridRef = useContext(GanttScrollContext)?.gridRef;
  const [positioningStyle, setPositiongStyle] = useState<CSSProperties>({
    left: -9999,
    top: -9999,
  });

  const deferredPosition = useDeferredValue(positioningStyle);

  useIsomorphicLayoutEffect(() => {
    // Gated on `open`, and that is not a micro-optimisation. The slot wraps the
    // bar, so one instance is mounted per visible row — roughly thirty. Without
    // this, every one of them would listen for mousemove and call `setState` on
    // every pointer move anywhere in the chart.
    if (!open) {
      return;
    }

    const place = (clientX: number, clientY: number) => {
      const grid = gridRef?.current?.getBoundingClientRect();
      const bounds: Bounds =
        grid && grid.width > 0 && grid.height > 0
          ? { left: grid.left, top: grid.top, right: grid.right, bottom: grid.bottom }
          : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };

      // Outside the chart there is nothing to place against, and the trigger is
      // closing the tooltip on this same event anyway. Bailing out keeps a
      // pointer moving elsewhere on the page from re-rendering the tooltip on
      // every move, and stops it visibly chasing the cursor out of the grid on
      // the way.
      const outside =
        clientX < bounds.left ||
        clientX > bounds.right ||
        clientY < bounds.top ||
        clientY > bounds.bottom;
      if (outside) {
        return;
      }

      const self = tooltipRef.current?.getBoundingClientRect();
      const width = self?.width ?? 0;
      const height = self?.height ?? 0;

      const left = placeAxis(clientX, width, bounds.left, bounds.right);
      const top = placeAxis(clientY, height, bounds.top, bounds.bottom);

      // Clamping pins the tooltip to an edge over a range of cursor positions, so
      // a moving pointer often resolves to the position it already has. Bailing
      // on an unchanged result keeps those moves from re-rendering.
      setPositiongStyle((previous) =>
        previous.left === left && previous.top === top ? previous : { left, top },
      );
    };

    // Place from the pointer that opened it, rather than waiting for a mousemove
    // that may never come. `mouseenter` is synthesized from `mouseover`, so it
    // fires however sparsely the pointer is sampled — but if the cursor comes to
    // rest the instant it is inside the bar, no later move arrives and the popup
    // used to sit at its off-screen starting point, open and invisible. That is
    // the "fast entry shows nothing" case, and it is why closing is not involved.
    //
    // Runs before the mousemove listener is attached, so the position is already
    // right when the first move lands.
    if (openedAt) {
      place(openedAt.x, openedAt.y);
    }

    const handleMouseMove = (event: MouseEvent) => place(event.clientX, event.clientY);

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [tooltipRef, gridRef, open]);

  return deferredPosition;
};
