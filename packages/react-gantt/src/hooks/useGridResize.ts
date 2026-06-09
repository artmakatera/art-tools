import { useCallback, useRef, useState } from "react";
import { GRID_MIN_WIDTH } from "../core/constants";

export function useGridResize(
  containerRef: React.RefObject<HTMLDivElement | null>,
  overlayRef: React.RefObject<HTMLDivElement | null>,
  tableWidth: number,
) {
  const [gridWidth, setGridWidth] = useState<number | undefined>(undefined);
  const startRef = useRef<{ mouseX: number; width: number; containerW: number } | null>(null);

  const onHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const overlay = overlayRef.current;
      const container = containerRef.current;
      if (!overlay || !container) return;
      startRef.current = {
        mouseX: e.clientX,
        width: overlay.offsetWidth,
        containerW: container.offsetWidth,
      };

      const onMove = (ev: MouseEvent) => {
        if (!startRef.current) return;
        const { mouseX, width, containerW } = startRef.current;
        // Grid can't shrink past the table's right edge (no empty gap); fall back
        // to a small minimum only when the table is wider than the container.
        const min = tableWidth < containerW ? containerW - tableWidth : GRID_MIN_WIDTH;
        // Handle is on the grid's left edge: dragging left increases the width.
        const next = Math.min(containerW, Math.max(min, width + (mouseX - ev.clientX)));
        setGridWidth(next);
      };

      const onUp = () => {
        startRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [containerRef, overlayRef, tableWidth],
  );

  return { gridWidth, onHandleMouseDown };
}
