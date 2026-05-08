import { useDrag } from "../../hooks/useDrag";
import { TaskProgress } from "./progress/TaskProgress";
import styles from "./Task.module.css";
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
  onMove: (newLeft: number) => void;
}

export function Task({
  width,
  height,
  left,
  top,
  colWidth,
  title,
  progress = 30,
  onProgressChange,
  onResize,
  onMove,
}: TaskProps) {
  const onMouseDown = useDrag({
    onStart: () => ({ startLeft: left }),
    onDrag: (deltaX, { startLeft }) => onMove(startLeft + deltaX),
    onEnd: (deltaX, { startLeft }) => {
      const snapped = Math.round((startLeft + deltaX) / colWidth) * colWidth;
      onMove(snapped);
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
        />
      </div>
    </div>
  );
}
