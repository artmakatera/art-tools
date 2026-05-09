import styles from "./BarProgress.module.css";
import { BarProgressResizeHandle } from "./BarProgressResizeHandle";

interface BarProgressProps {
  width: number;
  height: number;
  progress: number;
  onProgressChange?: (newProgress: number) => void;
}

export function BarProgress({
  progress,
  width: parentWidth,
  height,
  onProgressChange,
}: BarProgressProps) {
  const width = (progress / 100) * parentWidth;

  return (
    <div className={styles.barProgress} style={{ width, height }}>
      {onProgressChange && (
        <BarProgressResizeHandle
          width={width}
          parentWidth={parentWidth}
          onResize={(newWidth) => {
            onProgressChange((newWidth / parentWidth) * 100);
          }}
        />
      )}
    </div>
  );
}
