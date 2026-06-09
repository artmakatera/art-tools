import { useCallback, useRef, useState } from "react";

const MIN_WIDTH = 160;
const MAX_WIDTH = 600;

export function useSidebarResize(initial: number) {
  const [width, setWidth] = useState(initial);
  const startRef = useRef<{ mouseX: number; width: number } | null>(null);

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startRef.current = { mouseX: e.clientX, width };

    const onMouseMove = (ev: MouseEvent) => {
      if (!startRef.current) return;
      const delta = ev.clientX - startRef.current.mouseX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startRef.current.width + delta));
      setWidth(next);
    };

    const onMouseUp = () => {
      startRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [width]);

  return { width, onDividerMouseDown };
}
