import { useCallback, useEffect, useRef } from "react";

const EDGE = 40;
const MAX_SPEED = 14;

function findScrollContainer(el: HTMLElement | null): HTMLElement | null {
  let node = el;
  while (node) {
    const style = getComputedStyle(node);
    const hasScrollableOverflow = style.overflowX === "auto" || style.overflowX === "scroll";
    if (hasScrollableOverflow && node.scrollWidth > node.clientWidth) {
      return node;
    }
    node = node.parentElement;
  }
  return document.scrollingElement as HTMLElement | null;
}

function bounds(container: HTMLElement): { left: number; right: number } {
  if (container === document.scrollingElement) {
    return { left: 0, right: window.innerWidth };
  }
  const boundingRect = container.getBoundingClientRect();
  return { left: boundingRect.left, right: boundingRect.right };
}

function edgeSpeed(left: number, right: number, cursorX: number): number {
  if (cursorX < left + EDGE) {
    return -MAX_SPEED * Math.min(1, (left + EDGE - cursorX) / EDGE);
  }

  if (cursorX > right - EDGE) {
    return MAX_SPEED * Math.min(1, (cursorX - (right - EDGE)) / EDGE);
  }

  return 0;
}

interface AutoScrollState {
  container: HTMLElement | null;
  scrollTarget: EventTarget | null;
  startScrollLeft: number;
  cursorX: number;
  rafId: number | null;
}

interface UseAutoScrollOptions {
  enabled: boolean;
  onScroll: () => void;
}

export interface AutoScrollHandle {
  start: (el: HTMLElement) => void;
  stop: () => void;
  setCursorX: (clientX: number) => void;
  getScrollDelta: () => number;
}

export function useAutoScroll({ enabled, onScroll }: UseAutoScrollOptions): AutoScrollHandle {
  const stateRef = useRef<AutoScrollState>({
    container: null,
    scrollTarget: null,
    startScrollLeft: 0,
    cursorX: 0,
    rafId: null,
  });

  // Indirection: removeEventListener needs the same handler ref across
  // start/stop, but onScroll's identity changes on every render of useDrag.
  const onScrollRef = useRef(onScroll);
  onScrollRef.current = onScroll;
  const handleScroll = useCallback(() => onScrollRef.current(), []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s.container) {
      s.rafId = null;
      return;
    }
    const { left, right } = bounds(s.container);
    const speed = edgeSpeed(left, right, s.cursorX);
    if (speed !== 0) {
      s.container.scrollLeft += speed;
    }
    s.rafId = requestAnimationFrame(tick);
  }, []);

  const stop = useCallback(() => {
    const s = stateRef.current;
    if (s.rafId !== null) {
      cancelAnimationFrame(s.rafId);
    }
    if (s.scrollTarget) {
      s.scrollTarget.removeEventListener("scroll", handleScroll);
    }
    s.container = null;
    s.scrollTarget = null;
    s.rafId = null;
  }, [handleScroll]);

  const start = useCallback(
    (el: HTMLElement) => {
      if (!enabled) {
        return;
      }
      const s = stateRef.current;
      const container = findScrollContainer(el);
      s.container = container;
      s.startScrollLeft = container?.scrollLeft ?? 0;
      if (container) {
        s.scrollTarget = container === document.scrollingElement ? window : container;
        // Passive: the handler only re-fires the drag, it never preventDefaults,
        // so the browser must not wait on it to scroll.
        s.scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
        s.rafId = requestAnimationFrame(tick);
      }
    },
    [enabled, handleScroll, tick],
  );

  const setCursorX = useCallback((clientX: number) => {
    stateRef.current.cursorX = clientX;
  }, []);

  const getScrollDelta = useCallback(() => {
    const s = stateRef.current;
    return s.container ? s.container.scrollLeft - s.startScrollLeft : 0;
  }, []);

  useEffect(() => stop, [stop]);

  return { start, stop, setCursorX, getScrollDelta };
}
