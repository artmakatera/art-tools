import { DraggableBar } from "../common/DraggableBar";
import { BarProgress } from "../progress/BarProgress";
import styles from "./TaskBar.module.css";
import { TaskResizer } from "./TaskResizer";

interface TaskBarProps {
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
}: TaskBarProps) {
  return (
    <DraggableBar
      left={left}
      top={top}
      width={width}
      height={height}
      colWidth={colWidth}
      dragAnchor={left}
      className={styles.task}
      style={{ lineHeight: `${height}px` }}
      onMove={onMove}
      onMoveEnd={onMoveEnd}
    >
      <div className={styles.taskInner}>
        <BarProgress
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
    </DraggableBar>
  );
}
