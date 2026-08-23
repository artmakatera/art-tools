"use client";

import type { CSSProperties, ReactElement } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Gantt, type BarTooltipProps, type GanttBarsSlots } from "@art-tools/react-gantt";
import { treeTasks } from "@/lib/demo-tasks";

const popupStyle: CSSProperties = {
  // The bar's row is a stacking context, so this value only means anything
  // because the popup is portalled out of it (see Tooltip.Portal below).
  zIndex: 1000,
  width: "max-content",
  maxWidth: 260,
  padding: "8px 10px",
  borderRadius: 8,
  background: "#0f172a",
  color: "#f8fafc",
  fontSize: 12,
  lineHeight: 1.45,
  boxShadow: "0 4px 12px rgb(15 23 42 / 25%)",
};

function formatDate(date: Date | undefined) {
  if (!date) {
    return "—";
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * A tooltip slot backed entirely by Base UI. It brings its own root, trigger and
 * open state, and none of the library's tooltip primitives appear here — which is
 * the point: the chart holds no `open` state for either side to reconcile.
 *
 * The slot is a **wrapper**. It receives the bar as `children` and has to render
 * it; a slot that drops `children` renders no bar at all.
 */
function BaseUiBarTooltip({ task, progress, displayEnd, children }: BarTooltipProps) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root trackCursorAxis="both">
        <Tooltip.Trigger>{children as ReactElement}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup style={popupStyle}>
              <div style={{ fontWeight: 600, marginBlockEnd: 4 }}>{task.name}</div>
              <div>
                {formatDate(task.startDate)} → {formatDate(displayEnd)}
              </div>
              <div style={{ opacity: 0.7 }}>{Math.round(progress)}% complete</div>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

/**
 * Slot configs MUST be referentially stable — rows are memoized, so a fresh
 * object each render would re-render every row.
 */
const bars: GanttBarsSlots = {
  tooltip: { slots: { tooltip: BaseUiBarTooltip } },
};

export function BaseUiTooltipDemo() {
  return <Gantt tasks={treeTasks} bars={bars} height={380} />;
}
