import type { CSSProperties, ReactNode } from "react";
import { useDrag } from "../../hooks/useDrag";

interface BarProps {
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

export function Bar({
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
}: BarProps) {
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
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={className}
      style={{ left, top, width, height, ...style }}
      title={title}
      aria-label={title}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>
  );
}
