import styles from "./TaskList.module.css";

interface TaskListDividerProps {
  onMouseDown: React.MouseEventHandler;
}

export function TaskListDivider({ onMouseDown }: TaskListDividerProps) {
  return (
    <div
      className={styles.divider}
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
    />
  );
}
