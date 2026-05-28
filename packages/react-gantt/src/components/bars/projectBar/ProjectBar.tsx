import { DraggableBar } from "../common/DraggableBar";
import { BarProgress } from "../progress/BarProgress";
import styles from "./ProjectBar.module.css";

interface ProjectBarProps {
  width: number;
  height: number;
  left: number;
  top: number;
  colWidth: number;
  title: string;
  progress: number;
  onProgressChange: (newProgress: number) => void;
  onMove: (newLeft: number) => void;
  onMoveEnd: (newLeft: number) => void;
}

export function ProjectBar({
  width,
  height,
  left,
  top,
  colWidth,
  title,
  progress,
  onProgressChange,
  onMove,
  onMoveEnd,
}: ProjectBarProps) {
  return (
    <DraggableBar
      left={left}
      top={top}
      width={width}
      height={height}
      colWidth={colWidth}
      dragAnchor={left}
      className={styles.project}
      style={{ lineHeight: `${height}px` }}
      onMove={onMove}
      onMoveEnd={onMoveEnd}
    >
      <div className={styles.projectInner}>
        <BarProgress
          width={width}
          height={height}
          progress={progress}
          onProgressChange={onProgressChange}
        />
        <div className={styles.projectContent}>{title}</div>
      </div>
    </DraggableBar>
  );
}
