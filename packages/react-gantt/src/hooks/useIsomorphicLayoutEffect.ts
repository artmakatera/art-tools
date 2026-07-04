import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` on the client, `useEffect` during SSR. Neither runs on the
 * server, so behavior is identical — this only avoids React 18's dev warning
 * ("useLayoutEffect does nothing on the server") for SSR consumers. React 19
 * removed that warning; drop this alias if the peer range ever excludes 18.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
