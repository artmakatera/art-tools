import styles from "./GridResizeHandle.module.css";

interface GridResizeHandleProps {
  onMouseDown: React.MouseEventHandler;
}

export function GridResizeHandle({ onMouseDown }: GridResizeHandleProps) {
  return (
    <div
      className={styles.handle}
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
    />
  );
}
