import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ElementType,
  type RefObject,
} from "react";
import { useGanttConfig } from "../../../context/contexts";
import { DEFAULT_SCALES } from "../../../core/scales";
import type { SlotConfig, SlotPropsInput } from "../../../core/slots";
import type { GanttTask } from "../../../types";
import styles from "./BarTooltip.module.css";

/** Gap between the cursor and the tooltip's nearest corner, px. */
const CURSOR_OFFSET = 12;
/** Distance kept clear of every viewport edge, px. */
const VIEWPORT_MARGIN = 8;
/** `.calendar` carries a 1px border on both block edges. */
const CALENDAR_BORDER = 2;
const DEFAULT_DELAY_MS = 500;

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
   * Whether the bar is hovered. Not the same as *visible*: the built-in tooltip
   * waits out a dwell delay of its own before appearing.
   */
  open: boolean;
}

export interface BarTooltipProps extends BarTooltipOwnerState {
  /**
   * The bar's DOM node. `null` when a consumer has replaced `slots.root` with a
   * component that does not forward refs.
   */
  anchorRef: RefObject<HTMLDivElement | null>;
  /** Hover dwell before the tooltip appears, in ms. Default 500. */
  delayMs?: number;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Latest pointer position, at module scope so it survives between hovers.
 *
 * Started on the first tooltip mount, not at import: `dist` is a single bundled
 * module, so an import-time listener would attach for every consumer of the
 * library including those that never render a tooltip. Once started it stays —
 * one passive handler writing two numbers.
 *
 * This is the only way to have a sample ready when the delay fires. There is no
 * "where is the cursor now" API, and a listener started when the tooltip mounts
 * is one event too late: a single physical move dispatches `mouseover` and
 * `mousemove` synchronously inside one input event, and React flushes the
 * resulting effects only afterwards. Verified in Chrome — such a listener saw
 * nothing at all when the pointer moved onto a bar and stopped, which is the
 * canonical tooltip gesture.
 *
 * The cost is the *first* hover of a page load, which has no sample yet and
 * falls back to the bar (see `fallbackFor`).
 */
let lastPointer: { x: number; y: number } | null = null;
let tracking = false;

function startTracking(): void {
  if (tracking || typeof document === "undefined") {
    return;
  }
  tracking = true;
  document.addEventListener(
    "mousemove",
    (event) => {
      lastPointer = { x: event.clientX, y: event.clientY };
    },
    { passive: true },
  );
}

/**
 * Stand-in for the cursor on the first hover of a page load: just below the bar,
 * horizontally clamped into view so a bar wider than the viewport still puts the
 * tooltip somewhere visible.
 */
function fallbackFor(anchor: HTMLElement | null): { x: number; y: number } {
  const box = anchor?.getBoundingClientRect();
  if (!box) {
    return { x: VIEWPORT_MARGIN, y: VIEWPORT_MARGIN };
  }
  return {
    x: clamp(box.left, VIEWPORT_MARGIN, window.innerWidth - VIEWPORT_MARGIN),
    y: box.bottom,
  };
}

/**
 * Bottom edge of the sticky calendar, in viewport coordinates.
 *
 * The height is derived from config rather than measured: the calendar renders
 * one `CalendarRow` per scale at the chart's `rowHeight`, and `scales` on the
 * config context is the *active* zoom level's (`GanttProvider` sets
 * `scales: zoom.level.scales`), so this stays correct across zoom. Only the
 * scroll container's position is read from the DOM, once per open — the calendar
 * is `position: sticky; top: 0` inside it.
 *
 * Returns 0 when no scroll container is found, which simply drops the constraint.
 */
function headerBottomOf(anchor: HTMLElement | null, headerHeight: number): number {
  let el = anchor?.parentElement ?? null;
  while (el) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === "auto" || overflowY === "scroll") {
      return el.getBoundingClientRect().top + headerHeight;
    }
    el = el.parentElement;
  }
  return 0;
}

interface Placement {
  left: number;
  top: number;
}

/**
 * Bottom-right of the cursor, flipped rather than clipped at a viewport edge.
 *
 * The block axis carries an extra constraint the inline axis does not: flipping
 * up can land the tooltip under the sticky calendar, where it is painted
 * *behind* it and so effectively invisible — the tooltip is a child of `.row`,
 * which is its own stacking context, so no z-index can lift it over the header
 * (ADR-022). `headerBottom` is therefore a hard floor, not a preference.
 */
function place(
  cursor: { x: number; y: number },
  size: { width: number; height: number },
  headerBottom: number,
  viewport: { width: number; height: number },
): Placement {
  const { width: w, height: h } = size;

  let left = cursor.x + CURSOR_OFFSET;
  if (left + w > viewport.width - VIEWPORT_MARGIN) {
    left = cursor.x - w - CURSOR_OFFSET;
  }

  let top = cursor.y + CURSOR_OFFSET;
  if (top + h > viewport.height - VIEWPORT_MARGIN) {
    top = cursor.y - h - CURSOR_OFFSET;
  }

  return {
    left: clamp(left, VIEWPORT_MARGIN, viewport.width - w - VIEWPORT_MARGIN),
    top: clamp(top, Math.max(VIEWPORT_MARGIN, headerBottom), viewport.height - h - VIEWPORT_MARGIN),
  };
}

function formatDate(date: Date | undefined): string {
  return date ? date.toLocaleDateString() : "—";
}

/**
 * The built-in bar tooltip. Opt in with `slots={{ tooltip: GanttBarTooltip }}`;
 * it is never rendered by default.
 *
 * Placed from the cursor in JS, not with CSS anchor positioning: anchoring to the
 * bar puts the tooltip at the midpoint of a bar that can be wider than the
 * viewport, and CSS has no way to express "keep clear of the sticky header"
 * (ADR-022).
 *
 * The position is computed once, when the dwell delay elapses, and then left
 * alone until the pointer leaves the bar.
 */
export function GanttBarTooltip({
  task,
  progress,
  displayEnd,
  open: _open,
  anchorRef,
  delayMs = DEFAULT_DELAY_MS,
  className,
  style,
  ...divProps
}: BarTooltipProps & ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const { rowHeight, scales } = useGanttConfig();

  useEffect(() => {
    startTracking();
    const id = setTimeout(() => setElapsed(true), delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);

  // Two passes, both in a layout effect so neither is painted: placement depends
  // on the tooltip's own size, which depends on its content. The first pass
  // renders hidden purely to be measured.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!elapsed || !el) {
      return;
    }
    const box = el.getBoundingClientRect();
    const headerHeight = (scales ?? DEFAULT_SCALES).length * rowHeight + CALENDAR_BORDER;
    setPlacement(
      place(
        lastPointer ?? fallbackFor(anchorRef.current),
        { width: box.width, height: box.height },
        headerBottomOf(anchorRef.current, headerHeight),
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, [elapsed, anchorRef, rowHeight, scales]);

  if (!elapsed) {
    return null;
  }

  const positioning: CSSProperties = placement
    ? { left: placement.left, top: placement.top }
    : { left: 0, top: 0, visibility: "hidden" };

  return (
    <div
      ref={ref}
      role="tooltip"
      className={className ? `${styles.tooltip} ${className}` : styles.tooltip}
      style={{ ...positioning, ...style }}
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
