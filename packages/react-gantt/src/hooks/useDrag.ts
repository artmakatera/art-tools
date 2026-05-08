import { useCallback, useEffect, useRef } from "react";

interface UseDragOptions<T> {
  onStart: (e: React.MouseEvent) => T;
  onDrag: (deltaX: number, ctx: T) => void;
  onEnd?: (deltaX: number, ctx: T) => void;
}

export function useDrag<T>({ onStart, onDrag, onEnd }: UseDragOptions<T>) {
  const isActiveRef = useRef(false);
  const ctxRef = useRef<T | null>(null);
  const startXRef = useRef(0);
  const lastDeltaRef = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      ctxRef.current = onStart(e);
      startXRef.current = e.clientX;
      lastDeltaRef.current = 0;
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
      lastDeltaRef.current = deltaX;
      onDrag(deltaX, ctxRef.current);
      e.preventDefault();
    };
    const onMouseUp = () => {
      if (isActiveRef.current && ctxRef.current !== null) {
        onEnd?.(lastDeltaRef.current, ctxRef.current);
      }
      isActiveRef.current = false;
      ctxRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onDrag, onEnd]);

  return onMouseDown;
}
