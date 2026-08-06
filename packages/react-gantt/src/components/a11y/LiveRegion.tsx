import { useEffect, useRef, useState } from "react";
import styles from "./LiveRegion.module.css";

/** Trailing debounce, so a burst of nudges announces once with the final state. */
const ANNOUNCE_DEBOUNCE_MS = 200;

export interface LiveRegionProps {
  /**
   * Filled with this region's publish function on mount and cleared on unmount.
   * The provider hands out a stable `announce` that dispatches through it, so
   * announcing never re-renders the provider tree — only this leaf.
   */
  registerRef: React.MutableRefObject<((message: string) => void) | null>;
}

/**
 * The single polite live region for one `<Gantt>`.
 *
 * Announces things ARIA state cannot: the result of a keyboard nudge, a refused
 * edit and why, dependency-link progress. Deliberately silent about cursor
 * movement, expand/collapse, and selection — `aria-activedescendant`,
 * `aria-expanded` and `aria-selected` already convey those, and repeating them
 * makes screen readers say everything twice.
 */
export function LiveRegion({ registerRef }: LiveRegionProps) {
  const [message, setMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef("");
  // Toggled per publish so that announcing the same text twice still produces a
  // DOM mutation; without it React bails on the identical state and the second
  // press is silent.
  const parityRef = useRef(false);

  useEffect(() => {
    registerRef.current = (next: string) => {
      pendingRef.current = next;
      if (timerRef.current !== null) {
        return;
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        parityRef.current = !parityRef.current;
        setMessage(pendingRef.current + (parityRef.current ? " " : ""));
      }, ANNOUNCE_DEBOUNCE_MS);
    };
    return () => {
      registerRef.current = null;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [registerRef]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className={styles.srOnly}>
      {message}
    </div>
  );
}
