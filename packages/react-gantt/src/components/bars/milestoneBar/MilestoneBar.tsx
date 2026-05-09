import { Bar } from "../Bar";
import styles from "./MilestoneBar.module.css";

interface MilestoneBarProps {
  size: number;
  centerLeft: number;
  top: number;
  colWidth: number;
  title: string;
  onMove: (newCenterLeft: number) => void;
  onMoveEnd: (newCenterLeft: number) => void;
}

export function MilestoneBar({
  size,
  centerLeft,
  top,
  colWidth,
  title,
  onMove,
  onMoveEnd,
}: MilestoneBarProps) {
  return (
    <Bar
      left={centerLeft - size / 2}
      top={top}
      width={size}
      height={size}
      colWidth={colWidth}
      dragAnchor={centerLeft}
      className={styles.milestone}
      title={title}
      onMove={onMove}
      onMoveEnd={onMoveEnd}
    >
      <div className={styles.milestoneShape} />
    </Bar>
  );
}
