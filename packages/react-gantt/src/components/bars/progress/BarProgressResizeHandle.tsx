import { useDrag } from "../../../hooks/useDrag";
import styles from "./BarProgress.module.css";

type BarProgressResizeHandleProps = {
  width: number;
  onResize: (newWidth: number) => void;
  parentWidth: number;
};

export function BarProgressResizeHandle({
  width,
  onResize,
  parentWidth,
}: BarProgressResizeHandleProps) {
  const onMouseDown = useDrag({
    onStart: () => ({ startWidth: width }),
    onDrag: (deltaX, { startWidth }) => {
      let newWidth = Math.max(0, startWidth + deltaX);
      newWidth = Math.min(newWidth, parentWidth);
      onResize(newWidth);
    },
  });

  return (
    <progress
      className={styles.barProgressResizeHandle}
      onMouseDown={onMouseDown}
    />
  );
}
