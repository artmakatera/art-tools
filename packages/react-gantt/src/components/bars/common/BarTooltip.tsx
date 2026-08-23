import {
  useRef,
  type ComponentProps,
  type CSSProperties,
  type ElementType,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { SlotConfig, SlotPropsInput } from "../../../core/slots";
import type { GanttTask } from "../../../types";
import styles from "./BarTooltip.module.css";
import { useTooltipPosition } from "../../../hooks/useTooltipPosition";

/**
 * State passed to the function form of the tooltip slotProps, and to the slot
 * component itself.
 *
 * `displayEnd` is resolved by `Bar` rather than left to the consumer because
 * `task.endDate` is an *exclusive* instant (ADR-014): a Mon–Fri task stores
 * Saturday midnight, so rendering it raw reads as ending on Saturday. Handing
 * over the already-inclusive date is what stops every tooltip from
 * reintroducing that bug.
 */
export interface BarTooltipOwnerState {
  task: GanttTask;
  /** Resolved progress, override-aware during a drag — not `task.progress`. */
  progress: number;
  /** Inclusive, user-facing end date. `undefined` for an instant (a milestone). */
  displayEnd: Date | undefined;
  /**
   * Whether the bar is hovered. The consumer only mounts the slot while this is
   * true, so the built-in tooltip appears immediately — there is no dwell delay.
   */
  open: boolean;
  children?: React.ReactNode;
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
   * native `title`. Pass {@link GanttBarTooltip} for the built-in one, or any
   * component accepting {@link BarTooltipProps}.
   */
  tooltip?: ElementType;
}

export interface BarTooltipSlotProps {
  tooltip?: SlotPropsInput<ComponentProps<"div">, BarTooltipOwnerState>;
}

/** Slot config for the bar tooltip. */
export type BarTooltipSlotConfig = SlotConfig<BarTooltipSlots, BarTooltipSlotProps>;

function formatDate(date: Date | undefined) {
  if (!date) {
    return "—";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * The built-in bar tooltip. Opt in with `slots={{ tooltip: GanttBarTooltip }}`;
 * it is never rendered by default.
 *
 * Placed from the cursor in JS, not with CSS anchor positioning: anchoring to the
 * bar puts the tooltip at the midpoint of a bar that can be wider than the
 * viewport (ADR-022).
 *
 * Portalled to `document.body`. That is what lets its z-index rank at the top
 * level — rendered in place it sits inside `.row`, a stacking context, where no
 * value could out-rank the calendar header. It follows the pointer for as long as
 * it is open; there is no dwell delay.
 */
export function GanttBarTooltip({
  task,
  className,
  style,
  children,
  progress,
  displayEnd,
  // Discarded so they do not reach the DOM node. `open` is already expressed by
  // the consumer mounting this at all, and the built-in tooltip places from the
  // cursor rather than the bar, so it has no use for `anchorRef`.
  open: _open,
  anchorRef: _anchorRef,
  ...divProps
}: BarTooltipProps & ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement | null>(null);

  const positioning: CSSProperties = useTooltipPosition(ref);

  if (typeof document === "undefined") {
    return children;
  }

  return (
    <>
      {children}
      {createPortal(
        <div
          role="tooltip"
          ref={ref}
          className={className ? `${styles.tooltip} ${className}` : styles.tooltip}
          style={{ ...style, ...positioning }}
          {...divProps}
        >
          <div className={styles.name}>{task.name}</div>
          <div className={styles.row}>
            <span className={styles.label}>Start</span>
            <span>{formatDate(task.startDate)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>End</span>
            <span>{formatDate(displayEnd)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
