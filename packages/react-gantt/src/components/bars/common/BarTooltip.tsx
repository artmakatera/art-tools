import { useEffect, useRef, type ComponentProps, type ElementType, type RefObject } from "react";
import type { SlotConfig, SlotPropsInput } from "../../../core/slots";
import type { GanttTask } from "../../../types";
import styles from "./BarTooltip.module.css";

/**
 * State passed to the function form of the tooltip slotProps, and to the slot
 * component itself.
 *
 * `displayEnd` is resolved here rather than left to the consumer because
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
  open: boolean;
}

/**
 * Props the slot component receives. Beyond the owner state it gets two ways to
 * position itself, because the two families of tooltip need different things:
 *
 * - `anchorName` for the CSS route (what {@link GanttBarTooltip} itself uses)
 * - `anchorRef` for consumers positioning in JS (Floating UI and friends)
 */
export interface BarTooltipProps extends BarTooltipOwnerState {
  /**
   * The bar's DOM node. `null` while unmounted, and also when a consumer has
   * replaced `slots.root` with a component that does not forward refs — the CSS
   * route keeps working in that case.
   */
  anchorRef: RefObject<HTMLDivElement | null>;
  /** The bar's `anchor-name` ident, already inherited via `--am-gantt-bar-anchor`. */
  anchorName: string;
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

function formatDate(date: Date | undefined): string {
  return date ? date.toLocaleDateString() : "—";
}

/**
 * The built-in bar tooltip. Opt in with `slots={{ tooltip: GanttBarTooltip }}`;
 * it is never rendered by default.
 *
 * Placement is entirely CSS (anchor positioning against the bar), so nothing
 * here measures anything. The one effect promotes the element into the top
 * layer, which is what actually gets it out of the grid's `overflow: auto` —
 * see `BarTooltip.module.css`.
 *
 * `manual` rather than `auto`: the tooltip's lifetime is the hover, and `Bar`
 * unmounts it on mouse leave, so light-dismiss and Esc have nothing to do. An
 * `auto` popover would additionally close other open popovers on the page,
 * which is not ours to do.
 */
export function GanttBarTooltip({
  task,
  progress,
  displayEnd,
  className,
  ...rest
}: BarTooltipProps & ComponentProps<"div">) {
  // anchorRef/anchorName/open are accepted so a consumer can spread the same
  // props into this component, but the CSS route needs none of them: the anchor
  // name arrives by inheritance and `open` is expressed by mounting.
  const { anchorRef: _anchorRef, anchorName: _anchorName, open: _open, ...divProps } = rest;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    // Optional calls, not a support check: jsdom has no popover implementation,
    // and a browser without one still renders the element inline rather than
    // throwing.
    el?.showPopover?.();
    return () => {
      if (el?.isConnected) {
        el.hidePopover?.();
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      role="tooltip"
      popover="manual"
      className={className ? `${styles.tooltip} ${className}` : styles.tooltip}
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
    </div>
  );
}
