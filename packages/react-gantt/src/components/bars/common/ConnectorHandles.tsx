import { useGanttContext, type ConnectorHandle } from "../../../context/GanttContext";
import { CONNECTOR_HANDLE_SIZE } from "../../../core/constants";
import type { Id } from "../../../types";
import styles from "./ConnectorHandles.module.css";

const HANDLE_OFFSET = CONNECTOR_HANDLE_SIZE / 2;

interface ConnectorHandlesProps {
  taskId: Id;
  barLeft: number;
  barWidth: number;
  barCenterY: number;
  show: boolean;
}

export function ConnectorHandles({ taskId, barLeft, barWidth, barCenterY, show }: ConnectorHandlesProps) {
  const { drag, startDrag, endDrag, gridBodyRef } = useGanttContext();

  const getStartCoords = (e: React.MouseEvent, _handle: ConnectorHandle) => {
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
        role="button"
        tabIndex={0}
        className={`${styles.handle} ${show || !!drag ? styles.visible : ""}`}
        style={{ left: barLeft - CONNECTOR_HANDLE_SIZE, top: barCenterY - HANDLE_OFFSET }}
        onMouseDown={(e) => onMouseDown(e, "start")}
        onMouseUp={(e) => onMouseUp(e, "start")}
      />
      <div
        role="button"
        tabIndex={0}
        className={`${styles.handle} ${show || !!drag ? styles.visible : ""}`}
        style={{ left: barLeft + barWidth, top: barCenterY - HANDLE_OFFSET }}
        onMouseDown={(e) => onMouseDown(e, "end")}
        onMouseUp={(e) => onMouseUp(e, "end")}
      />
    </>
  );
}
