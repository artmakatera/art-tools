import type { GanttTask } from '@am/react-gantt';

const DAY_MS = 1000 * 60 * 60 * 24;
// Local civil constructor: an ISO string parses as UTC midnight and lands a day
// early west of Greenwich.
const PROJECT_START = new Date(2026, 0, 1).getTime();

export function generateTasks(count: number): GanttTask[] {
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(PROJECT_START + i * DAY_MS * 2);
    // `endDate` is exclusive, so this spans 5 whole days.
    const end = new Date(start.getTime() + DAY_MS * 5);
    return {
      id: String(i),
      name: `Task ${i + 1}`,
      startDate: start,
      endDate: end,
      progress: i % 100,
    };
  });
}
