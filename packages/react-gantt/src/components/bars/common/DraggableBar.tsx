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
  onMove: (newAnchor: number) => void;
  onMoveEnd: (newAnchor: number) => void;
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
  const onMouseDown = useDrag({
    onStart: () => ({ start: dragAnchor }),
    onDrag: (deltaX, { start }) => onMove(start + deltaX),
    onEnd: (deltaX, { start }) => {
      const snapped = Math.round((start + deltaX) / colWidth) * colWidth;
      onMoveEnd(snapped);
    },
    autoScroll: true,
  });

  return (
    <div
      {...rest}
      className={className}
      style={{ left, top, width, height, ...style }}
      title={title}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>
  );
}
