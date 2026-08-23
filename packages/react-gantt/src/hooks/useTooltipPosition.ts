import { useState, type CSSProperties, type RefObject, useDeferredValue, useEffect } from "react";
import { useGanttScroll } from "../context/contexts";

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


export const useTooltipPosition = (tooltipRef: RefObject<HTMLDivElement | null>): CSSProperties => {
  const gridRef = useGanttScroll().gridRef;
  const [positioningStyle, setPositiongStyle] = useState<CSSProperties>({
    left: -9999,
    top: -9999,
  });

  const deferredPosition = useDeferredValue(positioningStyle);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const { clientX, clientY } = event;

      const grid = gridRef?.current?.getBoundingClientRect();
      const bounds: Bounds =
        grid && grid.width > 0 && grid.height > 0
          ? { left: grid.left, top: grid.top, right: grid.right, bottom: grid.bottom }
          : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };


      const self = tooltipRef.current?.getBoundingClientRect();
      const width = self?.width ?? 0;
      const height = self?.height ?? 0;
      const toolTipOffscreen = clientX < 0 || clientY < 0;

      setPositiongStyle({
        left: placeAxis(clientX, width, bounds.left, bounds.right),
        top: placeAxis(clientY, height, bounds.top, bounds.bottom),
        display: toolTipOffscreen ? "none" : undefined,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [tooltipRef, gridRef]);

  return deferredPosition;
};
