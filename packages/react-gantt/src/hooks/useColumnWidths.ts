import { useCallback, useRef, useState } from "react";
import { COLUMN_MIN_WIDTH } from "../core/constants";

/**
 * Session-local column-width overrides, keyed by `col.key`. Mirrors
 * `useGridResize`: mousedown captures the start width, window listeners track
 * the drag, and the width clamps at `COLUMN_MIN_WIDTH`.
 */
export function useColumnWidths() {
  const [widths, setWidths] = useState<Record<string, number>>({});
  const startRef = useRef<{ key: string; mouseX: number; width: number } | null>(null);

  const onResizeStart = useCallback(
    (key: string, startWidth: number, e: React.MouseEvent) => {
      e.preventDefault();
      startRef.current = { key, mouseX: e.clientX, width: startWidth };

      const onMove = (ev: MouseEvent) => {
        if (!startRef.current) {
          return;
        }
        const { key: colKey, mouseX, width } = startRef.current;
        const next = Math.max(COLUMN_MIN_WIDTH, width + (ev.clientX - mouseX));
        setWidths((prev) => ({ ...prev, [colKey]: next }));
      };

      const onUp = () => {
        startRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [],
  );

  return { widths, onResizeStart };
}
