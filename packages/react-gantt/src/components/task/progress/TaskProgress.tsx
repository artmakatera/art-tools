import styles from "./TaskProgress.module.css";
import { TaskProgressResizeHandle } from "./TaskProgressResizeHandle";

interface TaskProgressProps {
  width: number;
  height: number;
  progress: number;
  onProgressChange: (newProgress: number) => void;
}
export function TaskProgress({
  progress,
  width: parentWidth,
  height,
  onProgressChange,
}: TaskProgressProps) {
  const width = (progress / 100) * parentWidth;

  return (
    <div className={styles.taskProgress} style={{ width, height }}>
      <TaskProgressResizeHandle
        width={width}
        parentWidth={parentWidth}
        onResize={(newWidth) => {
       
          onProgressChange((newWidth / parentWidth) * 100);
        }}
      />
    </div>
  );
}


