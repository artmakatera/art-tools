import clsx from "clsx";
import { useDrag } from "../../hooks/useDrag";
import styles from "./TaskBar.module.css";

interface TaskResizerProps {
  width: number;
  left: number;
  colWidth: number;
  onResize: (newWidth: number, newLeft: number) => void;
  onResizeEnd: (newWidth: number, newLeft: number) => void;
}

export function TaskResizer({
  width,
  left,
  colWidth,
  onResize,
  onResizeEnd,
}: TaskResizerProps) {
  const onStartHandleMouseDown = useDrag({
    onStart: () => ({ startWidth: width, startLeft: left }),
    onDrag: (deltaX, { startWidth, startLeft }) => {
      const clampedDelta = Math.min(deltaX, startWidth);
      const newWidth = startWidth - clampedDelta;
      const newLeft = startLeft + clampedDelta;
      onResize(newWidth, newLeft);
    },
    onEnd: (deltaX, { startWidth, startLeft }) => {
      const clampedDelta = Math.min(deltaX, startWidth);
      const rawLeft = startLeft + clampedDelta;
      const rawWidth = startWidth - clampedDelta;
      const snappedLeft = Math.round(rawLeft / colWidth) * colWidth;
      const snappedWidth = Math.max(
        colWidth,
        Math.round(rawWidth / colWidth) * colWidth,
      );
      onResizeEnd(snappedWidth, snappedLeft);
    },
  });

  const onEndHandleMouseDown = useDrag({
    onStart: () => ({ startWidth: width, startLeft: left }),
    onDrag: (deltaX, { startWidth, startLeft }) => {
      const newWidth = Math.max(0, startWidth + deltaX);
      onResize(newWidth, startLeft);
    },
    onEnd: (deltaX, { startWidth, startLeft }) => {
      const rawWidth = Math.max(0, startWidth + deltaX);
      const snappedWidth = Math.max(
        colWidth,
        Math.round(rawWidth / colWidth) * colWidth,
      );
      onResizeEnd(snappedWidth, startLeft);
    },
  });

  return (
    <>
      <button
        type="button"
        aria-label="Resize task start"
        className={clsx(styles.resizer, styles.startResizer)}
        onMouseDown={onStartHandleMouseDown}
      />
      <button
        type="button"
        aria-label="Resize task end"
        className={clsx(styles.resizer, styles.endResizer)}
        onMouseDown={onEndHandleMouseDown}
      />
    </>
  );
}
