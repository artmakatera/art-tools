import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { useDrag } from "../../../hooks/useDrag";

export interface BarA11yProps {
  role: string;
  "aria-colindex": number;
  "aria-colspan": number;
  "aria-label": string;
  "aria-selected": boolean | undefined;
  title: string;
}

interface DraggableBarProps
  extends Omit<
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
  children,
  ...rest
}: DraggableBarProps) {
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
      className={className}
      style={{ left, top, width, height, cursor: readOnly ? "default" : "move", ...style }}
      title={title}
      onMouseDown={movable ? onMouseDown : undefined}
    >
      {children}
    </div>
  );
}
