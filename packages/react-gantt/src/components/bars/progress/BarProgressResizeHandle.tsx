import { useDrag } from "../../../hooks/useDrag";
import styles from "./BarProgress.module.css";

type BarProgressResizeHandleProps = {
  width: number;
  onResize: (newWidth: number) => void;
  onResizeEnd?: (newWidth: number) => void;
  parentWidth: number;
};

export function BarProgressResizeHandle({
  width,
  onResize,
  onResizeEnd,
  parentWidth,
}: BarProgressResizeHandleProps) {
  const clampWidth = (deltaX: number, startWidth: number) =>
    Math.min(Math.max(0, startWidth + deltaX), parentWidth);

  const onMouseDown = useDrag({
    onStart: () => ({ startWidth: width }),
    onDrag: (deltaX, { startWidth }) => onResize(clampWidth(deltaX, startWidth)),
    onEnd: (deltaX, { startWidth }) => onResizeEnd?.(clampWidth(deltaX, startWidth)),
  });

  return (
    <div
      className={styles.barProgressResizeHandle}
      onMouseDown={onMouseDown}
    />
  );
}
