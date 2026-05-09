import { useDrag } from "../../../hooks/useDrag";
import styles from "./TaskProgress.module.css";

type TaskProgressResizeHandleProps = {
  width: number;
  onResize: (newWidth: number) => void;
  parentWidth: number;
};

export function TaskProgressResizeHandle({
  width,
  onResize,
  parentWidth,
}: TaskProgressResizeHandleProps) {
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
      className={styles.taskProgressResizeHandle}
      onMouseDown={onMouseDown}
    />
  );
}
