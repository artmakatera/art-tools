import { Gantt } from "@am-tools/react-gantt";
import { renderToString } from "react-dom/server";
import { bench, describe } from "vitest";
import { generateTasks } from "../src/fixtures";

const small = generateTasks(10);
const medium = generateTasks(100);
const large = generateTasks(1_000);
const xlarge = generateTasks(10_000);

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

  bench("10k tasks", () => {
    renderToString(<Gantt tasks={xlarge} height={HEIGHT} />);
  });
});
