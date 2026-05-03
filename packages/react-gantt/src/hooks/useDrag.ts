import { useCallback, useEffect, useRef } from "react";

interface UseDragOptions<T> {
  onStart: (e: React.MouseEvent) => T;
  onDrag: (deltaX: number, ctx: T) => void;
}

export function useDrag<T>({ onStart, onDrag }: UseDragOptions<T>) {
  const isActiveRef = useRef(false);
  const ctxRef = useRef<T | null>(null);
  const startXRef = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      ctxRef.current = onStart(e);
      startXRef.current = e.clientX;
      isActiveRef.current = true;
      e.preventDefault();
      e.stopPropagation();
    },
    [onStart],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isActiveRef.current || ctxRef.current === null) return;
      const deltaX = e.clientX - startXRef.current;
      onDrag(deltaX, ctxRef.current);
      e.preventDefault();
    };
    const onMouseUp = () => {
      isActiveRef.current = false;
      ctxRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onDrag]);

  return onMouseDown;
}
