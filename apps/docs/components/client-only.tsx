"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Defers `children` until after hydration.
 *
 * Every Gantt demo needs this. Two independent reasons:
 *
 * 1. **Labels.** The library formats dates with `toLocaleString(undefined, …)`
 *    and `toLocaleDateString()` (calendar headers, the Start/End columns, bar
 *    accessible names). The server's default locale is not the visitor's.
 *
 * 2. **Geometry — the one that actually bites.** `dateUtils.diffDays` reads
 *    *local* civil dates (`getFullYear`/`getMonth`/`getDate`). A server running
 *    in UTC and a browser at UTC−5 disagree by a day, so the bars' inline
 *    `left`/`width` differ. That is a hydration mismatch in an attribute, which
 *    React cannot patch up.
 *
 * The server snapshot and the *first* client snapshot are both `false`, so the
 * hydration pass matches exactly; React then re-renders with `true`.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const hydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return <>{hydrated ? children : fallback}</>;
}
