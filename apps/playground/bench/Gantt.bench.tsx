import { Gantt } from "@art-tools/react-gantt";
import { renderToString } from "react-dom/server";
import { bench, describe } from "vitest";
import { generateTasks } from "../src/fixtures";

const small = generateTasks(10);
const medium = generateTasks(100);
const large = generateTasks(1_000);
const xlarge = generateTasks(10_000);
const planned = large.map((task) => ({
  ...task,
  baselines: Array.from({ length: 5 }, (_, index) => ({
    id: index,
    startDate: new Date(task.startDate.getTime() - (index + 1) * 86_400_000),
    endDate: new Date(task.endDate!.getTime() - (index + 1) * 86_400_000),
  })),
}));

// `height` is required by GanttProps; without it these four calls were the only
// red in `turbo run check-types`.
const HEIGHT = 400;

describe("Gantt server render", () => {
  bench("10 tasks", () => {
    renderToString(<Gantt tasks={small} height={HEIGHT} />);
  });

  bench("100 tasks", () => {
    renderToString(<Gantt tasks={medium} height={HEIGHT} />);
  });

  bench("1k tasks", () => {
    renderToString(<Gantt tasks={large} height={HEIGHT} />);
  });

  bench("1k tasks with five baselines", () => {
    renderToString(<Gantt tasks={planned} height={HEIGHT} />);
  });

  bench("10k tasks", () => {
    renderToString(<Gantt tasks={xlarge} height={HEIGHT} />);
  });
});
