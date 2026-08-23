import type { ComponentProps, ElementType, ReactNode, RefObject } from "react";
import type { SlotConfig, SlotPropsInput } from "../../../core/slots";
import type { GanttTask } from "../../../types";

/**
 * State passed to the function form of the tooltip slotProps, and to the slot
 * component itself.
 *
 * `displayEnd` is resolved by `Row` rather than left to the consumer because
 * `task.endDate` is an *exclusive* instant (ADR-014): a Mon–Fri task stores
 * Saturday midnight, so rendering it raw reads as ending on Saturday. Handing
 * over the already-inclusive date is what stops every tooltip from reintroducing
 * that bug.
 */
export interface BarTooltipOwnerState {
  task: GanttTask;
  /** Resolved progress, override-aware during a drag — not `task.progress`. */
  progress: number;
  /** Inclusive, user-facing end date. `undefined` for an instant (a milestone). */
  displayEnd: Date | undefined;
  /**
   * The bar itself. The slot is a *wrapper*: it has to render this, and has to
   * decide for itself when to show a popup beside it — there is no `open` prop,
   * because the chart holds no open state (ADR-022). Use `BarTooltipRoot` +
   * `BarTooltipTrigger` for the built-in hover behaviour, or a third-party
   * tooltip's own root and trigger.
   */
  children?: ReactNode;
}

export interface BarTooltipProps extends BarTooltipOwnerState {
  /**
   * The bar's DOM node, for a custom tooltip that wants to position against the
   * bar rather than the cursor. `null` until the bar mounts, and also when a
   * consumer has replaced `slots.root` with a component that does not forward
   * refs.
   *
   * Declared because `BarTooltipConsumer` passes it: leaving it off the type made
   * it invisible to anyone writing their own tooltip. The built-in one ignores
   * it — it places from the cursor (ADR-022).
   */
  anchorRef: RefObject<HTMLDivElement | null>;
}

export interface BarTooltipSlots {
  /**
   * The tooltip. Default: none — nothing is rendered and the bar keeps its
   * native `title`. Pass `GanttBarTooltip` for the built-in one, or any component
   * accepting {@link BarTooltipProps}.
   */
  tooltip?: ElementType;
}

export interface BarTooltipSlotProps {
  tooltip?: SlotPropsInput<ComponentProps<"div">, BarTooltipOwnerState>;
}

/** Slot config for the bar tooltip. */
export type BarTooltipSlotConfig = SlotConfig<BarTooltipSlots, BarTooltipSlotProps>;
