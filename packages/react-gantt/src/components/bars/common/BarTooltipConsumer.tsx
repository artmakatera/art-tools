import type { ReactNode, RefObject } from "react";
import { mergeSlotProps, useGanttSlots, type BarTooltipOwnerState } from "../../..";

export function BarTooltipConsumer({
  children,
  tooltip,
  anchorRef,
  open,
}: {
  children: ReactNode;
  tooltip?: Omit<BarTooltipOwnerState, "open">;
  open: boolean;
  /** Nullable to match `useRef<HTMLDivElement>(null)` in the bar that owns it. */
  anchorRef: RefObject<HTMLDivElement | null>;
  taskPosition?: { left: number; top: number; width: number; height: number };
}) {
  const tooltipConfig = useGanttSlots().bars?.tooltip;
  // Both are required: a chart-level slot alone is not enough, because a bar with
  // no task data has nothing to show. That keeps this component usable standalone.
  const Tooltip = tooltip ? tooltipConfig?.slots?.tooltip : undefined;

  if (!Tooltip || !open) {
    return children;
  }

  const ownerState = { ...tooltip, open } as BarTooltipOwnerState;

  return (
    <Tooltip
      open={open}
      {...mergeSlotProps({}, tooltipConfig?.slotProps?.tooltip, ownerState)}
      anchorRef={anchorRef}
      {...tooltip}
    >
      {children}
    </Tooltip>
  );
}
