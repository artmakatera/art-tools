import type { GanttProps } from './types';

export function Gantt({ tasks, rowHeight = 32, onTaskClick }: GanttProps) {
  return (
    <div className="react-gantt">
      {tasks.map((task) => (
        <button
          key={task.id}
          type="button"
          className="react-gantt__row"
          style={{ height: rowHeight }}
          onClick={() => onTaskClick?.(task)}
        >
          {task.name}
        </button>
      ))}
    </div>
  );
}
