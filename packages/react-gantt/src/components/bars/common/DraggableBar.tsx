import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useDrag } from "../../../hooks/useDrag";

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
  children?: ReactNode;
}

// forwardRef rather than a plain `ref` prop: `peerDependencies` allows React 18,
// where a function component cannot receive `ref` as an ordinary prop. The ref is
// what a tooltip slot anchors to (see BarTooltipProps.anchorRef).
export const DraggableBar = forwardRef<HTMLDivElement, DraggableBarProps>(function DraggableBar(
  {
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
    children,
    ...rest
  },
  ref,
) {
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
      ref={ref}
      className={className}
      style={{ left, top, width, height, cursor: readOnly ? "default" : "move", ...style }}
      title={title}
      onMouseDown={movable ? onMouseDown : undefined}
    >
      {children}
    </div>
  );
});
