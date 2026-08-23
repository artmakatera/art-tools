import type { ReactNode, RefObject } from "react";
import { useGanttSlots } from "../../../context/GanttSlotsContext";
import { mergeSlotProps } from "../../../core/slots";
import type { BarTooltipOwnerState } from "./types";

/**
 * Resolves the tooltip slot and wraps the bar in it. Stateless on purpose.
 *
 * There is no open state and no context here: whether the tooltip is showing is
 * the slot's business, held by `BarTooltipRoot` inside it. That is what lets a
 * slot be a third-party tooltip — Base UI, Radix, Floating UI — which arrives
 * with its own root, trigger and open state and would otherwise have to
 * reconcile them with the chart's (ADR-022).
 *
 * The slot is a *wrapper*: it receives the bar as `children` and must render it.
 */
export function BarTooltipConsumer({
  children,
  tooltip,
  anchorRef,
}: {
  children: ReactNode;
  tooltip?: BarTooltipOwnerState;
  /** Nullable to match `useRef<HTMLDivElement>(null)` in the bar that owns it. */
  anchorRef: RefObject<HTMLDivElement | null>;
}) {
  const tooltipConfig = useGanttSlots().bars?.tooltip;
  const Tooltip = tooltipConfig?.slots?.tooltip;

  // Both are required, and neither implies the other: a chart-level slot alone is
  // not enough, because a bar handed no task data has nothing to show. Without
  // both, hand the bar back untouched — so a standalone bar carries no extra
  // wrapper and no listeners.
  if (!Tooltip || !tooltip) {
    return children;
  }

  return (
    <Tooltip
      {...mergeSlotProps({}, tooltipConfig?.slotProps?.tooltip, tooltip)}
      anchorRef={anchorRef}
      {...tooltip}
    >
      {children}
    </Tooltip>
  );
}
