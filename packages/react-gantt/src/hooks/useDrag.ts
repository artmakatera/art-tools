import { useCallback, useEffect, useRef } from "react";
import { useAutoScroll } from "./useAutoScroll";

interface UseDragOptions<T> {
  onStart: (e: React.MouseEvent) => T;
  onDrag: (deltaX: number, ctx: T) => void;
  onEnd?: (deltaX: number, ctx: T) => void;
  autoScroll?: boolean;
}

export function useDrag<T>({ onStart, onDrag, onEnd, autoScroll = false }: UseDragOptions<T>) {
  const isActiveRef = useRef(false);
  const ctxRef = useRef<T | null>(null);
  const startXRef = useRef(0);
  const lastClientXRef = useRef(0);
  const lastDeltaRef = useRef(0);

  const onDragRef = useRef(onDrag);
  const onEndRef = useRef(onEnd);
  onDragRef.current = onDrag;
  onEndRef.current = onEnd;

  // Forward ref to fireDrag so useAutoScroll can call it without a circular dep.
  const fireDragRef = useRef<() => void>(() => {});

  const {
    start: startAutoScroll,
    stop: stopAutoScroll,
    setCursorX,
    getScrollDelta,
  } = useAutoScroll({
    enabled: autoScroll,
    onScroll: () => fireDragRef.current(),
  });

  const fireDrag = useCallback(() => {
    if (!isActiveRef.current || ctxRef.current === null) {
      return;
    }
    const cursorDelta = lastClientXRef.current - startXRef.current;
    const deltaX = cursorDelta + getScrollDelta();
    lastDeltaRef.current = deltaX;
    onDragRef.current(deltaX, ctxRef.current);
  }, [getScrollDelta]);
  fireDragRef.current = fireDrag;

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      ctxRef.current = onStart(e);
      startXRef.current = e.clientX;
      lastClientXRef.current = e.clientX;
      lastDeltaRef.current = 0;
      isActiveRef.current = true;
      setCursorX(e.clientX);
      startAutoScroll(e.currentTarget as HTMLElement);
      e.preventDefault();
      e.stopPropagation();
    },
    [onStart, setCursorX, startAutoScroll],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isActiveRef.current || ctxRef.current === null) {
        return;
      }
      lastClientXRef.current = e.clientX;
      setCursorX(e.clientX);
      fireDrag();
      e.preventDefault();
    };
    const onMouseUp = () => {
      if (isActiveRef.current && ctxRef.current !== null) {
        onEndRef.current?.(lastDeltaRef.current, ctxRef.current);
      }
      isActiveRef.current = false;
      ctxRef.current = null;
      stopAutoScroll();
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      stopAutoScroll();
    };
  }, [fireDrag, setCursorX, stopAutoScroll]);

  return onMouseDown;
}
