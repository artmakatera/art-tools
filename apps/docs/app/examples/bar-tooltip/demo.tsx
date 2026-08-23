"use client";

import type { CSSProperties } from "react";
import { Gantt, GanttBarTooltip, type GanttBarsSlots } from "@art-tools/react-gantt";
import { treeTasks } from "@/lib/demo-tasks";

/**
 * The popup is portalled to `document.body`, so it is NOT a descendant of the
 * chart — CSS variables set on a wrapper around `<Gantt>` never reach it. Pass
 * them to the popup itself, or declare them on a global selector.
 *
 * The cast is only for TypeScript: React writes unknown `--*` keys straight to
 * the style attribute, but `CSSProperties` has no index signature for them.
 */
const themed = {
  "--am-gantt-tooltip-bg": "#1e3a5f",
  "--am-gantt-tooltip-radius": "8px",
} as CSSProperties;

/**
 * Slot configs MUST be referentially stable — rows are memoized, so a fresh
 * object each render would re-render every row. Hoist them to module scope (or
 * useMemo them).
 */
const bars: GanttBarsSlots = {
  tooltip: {
    // The whole opt-in. Without this line bars carry a native `title` and
    // nothing more; filling it suppresses that `title`, so the two never stack.
    slots: { tooltip: GanttBarTooltip },
    // `GanttBarTooltip` forwards className/style to the popup div, so it takes
    // slotProps like any other slot. Overriding one CSS variable beats
    // restating the rule it belongs to.
    slotProps: { tooltip: { style: themed } },
  },
};

/**
 * The tooltip triggers on the **bar**, not the row: a row spans the whole
 * timeline width, so a row-scoped trigger would fire over empty space far from
 * any task. Scroll or zoom while it is open — it closes, because a stationary
 * pointer that the bar moves out from under never fires `mouseleave`.
 */
export function BarTooltipDemo() {
  return <Gantt tasks={treeTasks} bars={bars} height={380} />;
}
