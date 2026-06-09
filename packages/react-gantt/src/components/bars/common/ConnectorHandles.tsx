import { useGanttContext, type ConnectorHandle } from "../../../context/GanttContext";
import type { Id } from "../../../types";
import styles from "./ConnectorHandles.module.css";

interface ConnectorHandlesProps {
  taskId: Id;
  barCenterY: number;
  show: boolean;
}

export function ConnectorHandles({ taskId, barCenterY, show }: ConnectorHandlesProps) {
  const { drag, startDrag, endDrag, gridBodyRef } = useGanttContext();

  const getStartCoords = (e: React.MouseEvent, handle: ConnectorHandle) => {
    const rect = gridBodyRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const handleEl = e.currentTarget as HTMLElement;
    const hRect = handleEl.getBoundingClientRect();
    return {
      x: hRect.left + hRect.width / 2 - rect.left,
      y: hRect.top + hRect.height / 2 - rect.top,
    };
  };

  const onMouseDown = (e: React.MouseEvent, handle: ConnectorHandle) => {
    e.stopPropagation();
    e.preventDefault();
    const { x, y } = getStartCoords(e, handle);
    startDrag({ fromTaskId: taskId, handle, startX: x, startY: y, currentX: x, currentY: y });
  };

  const onMouseUp = (e: React.MouseEvent, handle: ConnectorHandle) => {
    if (drag) {
      e.stopPropagation();
      endDrag(taskId, handle);
    }
  };

  return (
    <>
      <div
        className={`${styles.handle} ${show || !!drag ? styles.visible : ""}`}
        style={{ left: -5, top: barCenterY - 5 }}
        onMouseDown={(e) => onMouseDown(e, "start")}
        onMouseUp={(e) => onMouseUp(e, "start")}
      />
      <div
        className={`${styles.handle} ${show || !!drag ? styles.visible : ""}`}
        style={{ right: -5, top: barCenterY - 5 }}
        onMouseDown={(e) => onMouseDown(e, "end")}
        onMouseUp={(e) => onMouseUp(e, "end")}
      />
    </>
  );
}
