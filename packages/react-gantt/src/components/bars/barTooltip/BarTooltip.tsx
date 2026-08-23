import { useRef, type ComponentProps, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import styles from "./BarTooltip.module.css";
import { useBarTooltip } from "./BarTooltipContext";
import { BarTooltipRoot } from "./BarTooltipRoot";
import { BarTooltipTrigger } from "./BarTooltipTrigger";
import type { BarTooltipOwnerState, BarTooltipProps } from "./types";
import { useTooltipPosition } from "./useTooltipPosition";

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
 * The popup itself. Separate from `GanttBarTooltip` because it reads the open
 * state its sibling `BarTooltipRoot` provides, and a component cannot consume the
 * context it renders.
 *
 * Portalled to `document.body`. That is what lets its z-index rank at the top
 * level — rendered in place it sits inside `.row`, a stacking context, where no
 * value could out-rank the calendar header (ADR-022).
 */
function BarTooltipPopup({
  task,
  progress,
  displayEnd,
  className,
  style,
  ...divProps
}: Omit<BarTooltipOwnerState, "children"> & ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement | null>(null);
  const open = useBarTooltip()?.open ?? false;

  const positioning: CSSProperties = useTooltipPosition(ref, open);

  // `document` is guarded rather than assumed: the popup only exists on hover, so
  // a server render never reaches it, but it must not be touched during one.
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
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
  );
}

/**
 * The built-in bar tooltip. Opt in with `slots={{ tooltip: GanttBarTooltip }}`;
 * it is never rendered by default.
 *
 * A wrapper, not a sibling: it renders the bar it is handed and mounts its own
 * root and trigger around it. Everything about opening therefore lives here, in
 * the slot — which is what makes it replaceable by a third-party tooltip that
 * brings its own (ADR-022).
 *
 * Placed from the cursor in JS, not with CSS anchor positioning: anchoring to the
 * bar puts the tooltip at the midpoint of a bar that can be wider than the
 * viewport. It follows the pointer for as long as it is open; there is no dwell
 * delay.
 */
export function GanttBarTooltip({
  task,
  progress,
  displayEnd,
  anchorRef,
  className,
  style,
  children,
  ...divProps
}: BarTooltipProps & ComponentProps<"div">) {
  return (
    <BarTooltipRoot anchorRef={anchorRef}>
      <BarTooltipTrigger>{children}</BarTooltipTrigger>
      <BarTooltipPopup
        task={task}
        progress={progress}
        displayEnd={displayEnd}
        className={className}
        style={style}
        {...divProps}
      />
    </BarTooltipRoot>
  );
}
