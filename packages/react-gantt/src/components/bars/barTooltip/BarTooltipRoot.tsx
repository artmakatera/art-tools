import { useMemo, useState, type ReactNode, type RefObject } from "react";
import { BarTooltipContext, type BarTooltipContextValue } from "./BarTooltipContext";

/**
 * Owns one bar tooltip's open state and publishes it to `BarTooltipTrigger` and
 * whatever renders the popup.
 *
 * Belongs *inside* the tooltip slot. The chart deliberately holds no open state
 * of its own, so a slot is free to skip this entirely and use a third-party
 * tooltip's root instead — nothing above it needs to know (ADR-022).
 *
 * Exported for the middle case: a custom tooltip that wants the library's hover
 * and closing behaviour with different markup. Compose it with
 * `BarTooltipTrigger` and `useBarTooltip`.
 */
export function BarTooltipRoot({
  anchorRef,
  children,
}: {
  /** The bar's DOM node, as handed to the slot. Nullable — the bar may not have mounted. */
  anchorRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const value = useMemo<BarTooltipContextValue>(
    () => ({ open, setOpen, anchorRef }),
    [open, anchorRef],
  );

  return <BarTooltipContext.Provider value={value}>{children}</BarTooltipContext.Provider>;
}
