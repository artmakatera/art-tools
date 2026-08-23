import type { ReactNode, RefObject } from "react";
import { useGanttSlots } from "../../../context/GanttSlotsContext";
import { mergeSlotProps } from "../../../core/slots";
import type { BarTooltipOwnerState } from "./types";

/**
 * Resolves the tooltip slot and wraps the bar in it. Stateless on purpose.
 *
 * There is no open state and no context here: whether the tooltip is showing is
 * the slot's business, held by `BarTooltipRoot` inside it. That is what lets a
 * slot be a third-party tooltip that brings its own root and trigger (ADR-022).
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
  anchorRef: RefObject<HTMLDivElement | null>;
}) {
  const tooltipConfig = useGanttSlots().bars?.tooltip;
  const Tooltip = tooltipConfig?.slots?.tooltip;

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
