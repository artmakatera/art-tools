import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GanttProps } from "@art-tools/react-gantt";
import { WorkingTimeDemo } from "@/app/examples/working-time/demo";

const boundary = vi.hoisted(() => ({ props: null as GanttProps | null }));
vi.mock("@art-tools/react-gantt", () => ({
  Gantt: (props: GanttProps) => {
    boundary.props = props;
    return null;
  },
}));

beforeEach(() => {
  boundary.props = null;
});

describe("working-time preset descriptions", () => {
  it("matches the chart unit through every preset without replacing task state", () => {
    render(<WorkingTimeDemo />);
    const tasks = boundary.props!.tasks;
    expect(tasks.map(({ name }) => name)).toEqual(["Kickoff", "Build", "Review"]);
    expect(tasks.map(({ duration }) => duration)).toEqual([undefined, 3, 2]);
    expect(screen.getByText(/3 and 2 working days, respectively/)).toBeInTheDocument();

    for (const [label, unit, description] of [
      ["Office hours + short Friday", "hour", /3 and 2 working hours, respectively/],
      ["Weekends + Jan 7 holiday", "day", /3 and 2 working days, respectively/],
      ["No calendar", "day", /3 and 2 days, respectively/],
      ["Weekends off", "day", /3 and 2 working days, respectively/],
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(boundary.props!.durationUnit).toBe(unit);
      expect(boundary.props!.tasks).toBe(tasks);
      expect(screen.getByText(description)).toBeInTheDocument();
    }
    expect(boundary.props!.calendar).toEqual({ days: { 0: false, 6: false } });
  });

  it("retains edited tasks when changing presets", () => {
    render(<WorkingTimeDemo />);
    const edited = boundary.props!.tasks.map((task) =>
      task.id === 2 ? { ...task, endDate: new Date(2026, 0, 12), progress: 50 } : task,
    );
    act(() => boundary.props!.onTasksChange!(edited));
    fireEvent.click(screen.getByRole("button", { name: "Office hours + short Friday" }));
    expect(boundary.props!.tasks).toBe(edited);
    expect(screen.getByText(/start with durations of 3 and 2 working hours/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Weekends off" }));
    expect(boundary.props!.tasks).toBe(edited);
  });
});
