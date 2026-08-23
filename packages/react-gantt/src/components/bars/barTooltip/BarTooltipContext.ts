import { createContext, useContext, type RefObject } from "react";

/**
 * Open state shared *within one tooltip slot*, owned by `BarTooltipRoot` and read
 * by `BarTooltipTrigger` and the popup.
 *
 * It sits inside the slot rather than in `BarTooltipConsumer` so that nothing
 * outside the slot has an opinion about open state. A slot backed by a
 * third-party tooltip — Base UI, Radix, Floating UI — brings its own root and
 * trigger, and never has to reconcile them with a chart-level `open` (ADR-022).
 *
 * `null` means there is no root above, which is why `BarTooltipTrigger` is a
 * no-op rather than an error: `TaskBar`/`ProjectBar`/`MilestoneBar` are public
 * exports that render standalone.
 */
export interface BarTooltipContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** The bar's DOM node, used to verify the pointer really did leave it. */
  anchorRef: RefObject<HTMLDivElement | null>;
}

export const BarTooltipContext = createContext<BarTooltipContextValue | null>(null);

/**
 * The enclosing `BarTooltipRoot`'s state, or `null` when there is none — so a
 * caller can degrade rather than throw.
 */
export const useBarTooltip = (): BarTooltipContextValue | null => useContext(BarTooltipContext);
