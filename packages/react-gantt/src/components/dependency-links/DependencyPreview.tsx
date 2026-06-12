import { useGanttDependency } from "../../context/GanttContext";
import styles from "./DependencyPreview.module.css";

export function DependencyPreview() {
  const { drag } = useGanttDependency();
  if (!drag) return null;

  const dx = drag.currentX - drag.startX;
  const dy = drag.currentY - drag.startY;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <div
      className={styles.preview}
      style={{
        left: drag.startX,
        top: drag.startY,
        width: length,
        transform: `rotate(${angle}deg)`,
      }}
    />
  );
}
