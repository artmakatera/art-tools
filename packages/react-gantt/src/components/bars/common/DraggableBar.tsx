import { useRef, type ComponentPropsWithoutRef, type CSSProperties, type ReactNode } from "react";

import { useDrag } from "../../../hooks/useDrag";
import { BarTooltipConsumer, type BarTooltipOwnerState } from "../barTooltip";

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
  tooltip?: BarTooltipOwnerState;
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
    <BarTooltipConsumer tooltip={tooltip} anchorRef={barRef}>
      {/* Handed to the slot as its `children`, and the slot is what mounts
          `BarTooltipTrigger` around it. So this div carries no hover wiring of
          its own, and the handlers below are purely the consumer's — the trigger
          composes with them by cloning, rather than replacing them. */}
      <div
        {...rest}
        ref={barRef}
        className={className}
        style={{ left, top, width, height, cursor: readOnly ? "default" : "move", ...style }}
        title={title}
        onMouseDown={movable ? onMouseDown : undefined}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </div>
    </BarTooltipConsumer>
  );
}
