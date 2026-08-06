"use client";

import { Gantt } from "@am/react-gantt";
import { simpleTasks } from "@/lib/demo-tasks";

/**
 * Two rules for the App Router, both non-negotiable.
 *
 * 1. **A Server Component cannot import the library at all.** Next resolves the
 *    RSC graph with the `react-server` export condition, under which `react`
 *    exports no `createContext`/`useState`/`useEffect` and `react-dom` no
 *    `flushSync` — all of which the library's bundle imports on its first line.
 *    That is a link-time failure, not a warning. Hence `"use client"` here.
 *
 * 2. **Being a Client Component is not enough — it must be client-*only*.**
 *    Client Components still render once on the server, and this chart is not
 *    deterministic across machines:
 *
 *      • Labels: the calendar headers, the Start/End columns and every bar's
 *        accessible name go through `toLocaleString`/`toLocaleDateString`, which
 *        follow the *host's* locale.
 *      • Geometry — the one that actually breaks: `diffDays` reads local civil
 *        dates, so a UTC server and a UTC−5 browser disagree by a day and the
 *        bars' inline `left`/`width` differ. React cannot patch up an attribute
 *        mismatch.
 *
 *    So the chart is gated behind a hydration boundary — see components/
 *    client-only.tsx, which every example on this site uses.
 *
 * A related trap in your data: build dates with `new Date(2026, 0, 5)`, never
 * `new Date("2026-01-05")`. The string form is parsed as UTC midnight, which
 * reintroduces the same off-by-one-day the boundary just fixed.
 */
export function NextjsSsrDemo() {
  return <Gantt tasks={simpleTasks} height={280} />;
}
