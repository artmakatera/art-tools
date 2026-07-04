import styles from "./BarProgress.module.css";
import { BarProgressResizeHandle } from "./BarProgressResizeHandle";

interface BarProgressProps {
  width: number;
  height: number;
  progress: number;
  onProgressChange?: (newProgress: number) => void;
  onProgressEnd?: (newProgress: number) => void;
}

export function BarProgress({
  progress,
  width: parentWidth,
  height,
  onProgressChange,
  onProgressEnd,
}: BarProgressProps) {
  const width = (progress / 100) * parentWidth;
  const toProgress = (newWidth: number) => (newWidth / parentWidth) * 100;

  return (
    <div className={styles.barProgress} style={{ width, height }}>
      {onProgressChange && (
        <BarProgressResizeHandle
          width={width}
          parentWidth={parentWidth}
          onResize={(newWidth) => onProgressChange(toProgress(newWidth))}
          onResizeEnd={
            onProgressEnd
              ? (newWidth) => onProgressEnd(toProgress(newWidth))
              : undefined
          }
        />
      )}
    </div>
  );
}
