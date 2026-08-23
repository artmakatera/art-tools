import { useState, type CSSProperties, type RefObject, useDeferredValue, useEffect } from "react";
import { useGanttScroll } from "../../../context/contexts";

/** Gap between the cursor and the tooltip's nearest corner, px. */
const CURSOR_OFFSET = 12;
/** Distance kept clear of the bounding edges, px. */
const EDGE_MARGIN = 8;

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
  const gridRef = useGanttScroll().gridRef;
  const [positioningStyle, setPositiongStyle] = useState<CSSProperties>({
    left: -9999,
    top: -9999,
  });

  const deferredPosition = useDeferredValue(positioningStyle);

  useEffect(() => {
    // Gated on `open`, and that is not a micro-optimisation. The slot wraps the
    // bar, so one instance is mounted per visible row — roughly thirty. Without
    // this, every one of them would listen for mousemove and call `setState` on
    // every pointer move anywhere in the chart.
    if (!open) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const { clientX, clientY } = event;

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

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [tooltipRef, gridRef, open]);

  return deferredPosition;
};
