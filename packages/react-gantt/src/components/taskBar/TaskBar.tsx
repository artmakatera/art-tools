import { useDrag } from "../../hooks/useDrag";
import { TaskProgress } from "./progress/TaskProgress";
import styles from "./TaskBar.module.css";
import { TaskResizer } from "./TaskResizer";

interface TaskProps {
  width: number;
  height: number;
  left: number;
  top: number;
  colWidth: number;
  title: string;
  progress: number;
  onProgressChange: (newProgress: number) => void;
  onResize: (newWidth: number, newLeft: number) => void;
  onResizeEnd: (newWidth: number, newLeft: number) => void;
  onMove: (newLeft: number) => void;
  onMoveEnd: (newLeft: number) => void;
}

export function TaskBar({
  width,
  height,
  left,
  top,
  colWidth,
  title,
  progress = 30,
  onProgressChange,
  onResize,
  onResizeEnd,
  onMove,
  onMoveEnd,
}: TaskProps) {
  const onMouseDown = useDrag({
    onStart: () => ({ startLeft: left }),
    onDrag: (deltaX, { startLeft }) => onMove(startLeft + deltaX),
    onEnd: (deltaX, { startLeft }) => {
      const snapped = Math.round((startLeft + deltaX) / colWidth) * colWidth;
      onMoveEnd(snapped);
    },
  });

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={styles.task}
      style={{ width, height, left, top, lineHeight: `${height}px` }}
      onMouseDown={onMouseDown}
    >
      <div className={styles.taskInner}>
        <TaskProgress
          width={width}
          height={height}
          progress={progress}
          onProgressChange={onProgressChange}
        />
        <div className={styles.taskContent}>{title}</div>
        <TaskResizer
          width={width}
          left={left}
          colWidth={colWidth}
          onResize={onResize}
          onResizeEnd={onResizeEnd}
        />
      </div>
    </div>
  );
}
