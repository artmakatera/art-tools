import clsx from "clsx";
import { useDrag } from "../../hooks/useDrag";
import styles from "./Task.module.css";

interface TaskResizerProps {
  width: number;
  left: number;
  onResize: (newWidth: number, newLeft: number) => void;
}

export function TaskResizer({ width, left, onResize }: TaskResizerProps) {
  const onStartHandleMouseDown = useDrag({
    onStart: () => ({ startWidth: width, startLeft: left }),
    onDrag: (deltaX, { startWidth, startLeft }) => {
      const clampedDelta = Math.min(deltaX, startWidth);
      const newWidth = startWidth - clampedDelta;
      const newLeft = startLeft + clampedDelta;
      onResize(newWidth, newLeft);
    },
  });

  const onEndHandleMouseDown = useDrag({
    onStart: () => ({ startWidth: width, startLeft: left }),
    onDrag: (deltaX, { startWidth, startLeft }) => {
      const newWidth = Math.max(0, startWidth + deltaX);
      onResize(newWidth, startLeft);
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
