import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Gantt, type GanttTask } from "../../index";

// Local-time constructors, never ISO strings: `new Date(2026, 0, 1)` parses as
// UTC midnight while the geometry reads local civil instants, so west of Greenwich
// the two disagree by a day and east of it by an hour.
// `endDate` is exclusive (ADR-014), so task 1 covers Jan 1..14.
const tasks: GanttTask[] = [
  {
    id: "1",
    name: "Design phase",
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 0, 15),
  },
  {
    id: "2",
    name: "Implementation",
    startDate: new Date(2026, 0, 16),
    endDate: new Date(2026, 1, 15),
  },
];

describe("scroll grid to selected task", () => {
  // Pinned to exact pixels, not just "> 0". TaskList derives its own timeline
  // origin to compute these offsets, and that derivation is slated to be unified
  // with the grid's (they currently disagree across a DST boundary). These
  // numbers are what proves the unified version reveals the same place.
  it("scrolls the grid horizontally on the FIRST task-list selection", () => {
    const { container } = render(<Gantt tasks={tasks} columns={[]} height={300} colWidth={40} />);
    const grid = container.querySelector<HTMLDivElement>(".gridWrapper")!;
    // jsdom has no layout; emulate a narrow viewport so the far bar is off-screen.
    Object.defineProperty(grid, "clientWidth", { value: 200, configurable: true });

    const rows = container.querySelectorAll<HTMLDivElement>(".taskList .row");
    expect(grid.scrollLeft).toBe(0);

    // Task 2 runs Jan 16 .. Feb 15 exclusive. Origin is Dec 31 (Jan 1 padded back
    // one day), so its bar starts at day 16 => 640px and is 30 days => 1200px
    // wide. Revealing its far edge in a 200px viewport, keeping one column (40px)
    // of padding, scrolls to 640 + 1200 - 200 + 40.
    fireEvent.click(rows[1]!);
    expect(grid.scrollLeft).toBe(1680);

    // Selecting the near task scrolls back to reveal it: its bar starts at day 1
    // => 40px, and one column of padding puts the target at the content start.
    fireEvent.click(rows[0]!);
    expect(grid.scrollLeft).toBe(0);
  });
});
