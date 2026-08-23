import {
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useGanttSlots } from "../../../context/GanttSlotsContext";
import { mergeSlotProps } from "../../../core/slots";
import { useDrag } from "../../../hooks/useDrag";
import type { BarTooltipOwnerState } from "./BarTooltip";

export interface BarA11yProps {
  role: string;
  "aria-colindex": number;
  "aria-colspan": number;
  "aria-label": string;
  "aria-selected": boolean | undefined;
  /**
   * The native browser tooltip. Optional because a chart with a tooltip slot
   * suppresses it — two tooltips would stack. `aria-label` is unaffected, so
   * the accessible name survives either way.
   */
  title?: string;
}

interface DraggableBarProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "style" | "className" | "title" | "children" | "onMouseDown"
> {
  left: number;
  top: number;
  width: number;
  height: number;
  colWidth: number;
  dragAnchor: number;
  className?: string;
  title?: string;
  style?: CSSProperties;
  /** Omitted on a read-only chart; without it the bar carries no drag listener. */
  onMove?: (newAnchor: number) => void;
  onMoveEnd?: (newAnchor: number) => void;
  /**
   * Task data for the tooltip slot; omit it and no tooltip is rendered.
   *
   * The tooltip lives here rather than in `Row` so it is scoped to the bar's own
   * hover — a row spans the whole timeline width — and so it can anchor to this
   * element without a ref threaded down from above.
   *
   * The cost, accepted deliberately: this is only the *default* root
   * (`Root = slots?.root ?? DraggableBar` in all three bars), so replacing
   * `slots.root` removes the tooltip unless the replacement forwards this prop
   * on to a `DraggableBar` of its own (ADR-022).
   */
  tooltip?: Omit<BarTooltipOwnerState, "open">;
  children?: ReactNode;
}

export function DraggableBar({
  left,
  top,
  width,
  height,
  colWidth,
  dragAnchor,
  className,
  title,
  style,
  onMove,
  onMoveEnd,
  tooltip,
  onMouseEnter,
  onMouseLeave,
  children,
  ...rest
}: DraggableBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const tooltipConfig = useGanttSlots().bars?.tooltip;
  // Both are required: a chart-level slot alone is not enough, because a bar with
  // no task data has nothing to show. That keeps this component usable standalone.
  const Tooltip = tooltip ? tooltipConfig?.slots?.tooltip : undefined;
  const [hovered, setHovered] = useState(false);
  const open = Boolean(hovered && Tooltip);

  const readOnly = !onMove && !onMoveEnd;
  const onMouseDown = useDrag({
    onStart: () => ({ start: dragAnchor }),
    onDrag: (deltaX, { start }) => onMove?.(start + deltaX),
    onEnd: (deltaX, { start }) => {
      const snapped = Math.round((start + deltaX) / colWidth) * colWidth;
      onMoveEnd?.(snapped);
    },
    autoScroll: true,
  });

  // Hooks cannot be skipped, so the handler is always built and simply not
  // attached when the bar is not movable.
  const movable = Boolean(onMove || onMoveEnd);

  return (
    <div
      {...rest}
      ref={barRef}
      className={className}
      style={{ left, top, width, height, cursor: readOnly ? "default" : "move", ...style }}
      title={title}
      // Read by `.row:has(…)` in Row.module.css, which lifts the row above its
      // siblings while a tooltip is open. An attribute rather than a callback up
      // to `Row`: the row needs the fact, not the state, and CSS can see it.
      data-am-gantt-tooltip={open ? "open" : undefined}
      onMouseDown={movable ? onMouseDown : undefined}
      // Composed, not replaced — a consumer's `slotProps.root` handler must still
      // fire, and the a11y payload may carry its own.
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        setHovered(true);
      }}
      onMouseLeave={(event) => {
        onMouseLeave?.(event);
        setHovered(false);
      }}
    >
      {children}
      {open && Tooltip && tooltip && (
        <Tooltip
          {...mergeSlotProps({}, tooltipConfig?.slotProps?.tooltip, { ...tooltip, open })}
          anchorRef={barRef}
          {...tooltip}
          open={open}
        />
      )}
    </div>
  );
}
