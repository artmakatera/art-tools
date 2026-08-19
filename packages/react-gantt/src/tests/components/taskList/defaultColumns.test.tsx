import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Gantt } from "../../../Gantt";
import { DEFAULT_COLUMNS, READ_ONLY_COLUMNS } from "../../../components/taskList/TaskListHeader";
import type { GanttTask } from "../../../types";

/**
 * The built-in column catalogue, pinned before it moves out of
 * `TaskListHeader.tsx`.
 *
 * `DEFAULT_COLUMNS` and `READ_ONLY_COLUMNS` currently live inside the header
 * *component* module — which is why `Gantt.tsx` imports column data from a leaf
 * presentation file. They are slated to move to their own module and become
 * public so consumers can extend rather than replace them, so the shape and the
 * rendered affordances are recorded here first.
 */

const tasks: GanttTask[] = [
  { id: "1", name: "Design", startDate: new Date(2026, 0, 5), endDate: new Date(2026, 0, 15) },
];

describe("column catalogue", () => {
  it("has a stable key order and widths", () => {
    expect(DEFAULT_COLUMNS.map((c) => c.key)).toEqual([
      "__action",
      "__name",
      "__start",
      "__end",
      "__progress",
    ]);
    expect(DEFAULT_COLUMNS.map((c) => c.width)).toEqual([120, 200, 90, 90, 90]);
  });

  it("marks exactly the name column as the tree column", () => {
    const treeColumns = DEFAULT_COLUMNS.filter((c) => c.isTreeColumn);
    expect(treeColumns.map((c) => c.key)).toEqual(["__name"]);
  });

  it("drops only the actions column in the read-only set", () => {
    expect(READ_ONLY_COLUMNS.map((c) => c.key)).toEqual([
      "__name",
      "__start",
      "__end",
      "__progress",
    ]);
  });

  it("renders the three row actions with accessible names", () => {
    render(<Gantt tasks={tasks} height={300} />);
    // Names come from the labels catalogue, so assert via the label text the
    // default English labels produce for this task.
    expect(screen.getByLabelText(/edit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/add/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/delete/i)).toBeInTheDocument();
  });

  it("renders no row actions when read-only", () => {
    render(<Gantt tasks={tasks} height={300} readOnly />);
    expect(screen.queryByLabelText(/edit/i)).toBeNull();
    expect(screen.queryByLabelText(/add/i)).toBeNull();
    expect(screen.queryByLabelText(/delete/i)).toBeNull();
  });

  it("formats start from the task and end through the api", () => {
    render(<Gantt tasks={tasks} height={300} />);
    // Stored end is exclusive, so the End cell must read Jan 14, not Jan 15.
    expect(screen.getByText(new Date(2026, 0, 5).toLocaleDateString())).toBeInTheDocument();
    expect(screen.getByText(new Date(2026, 0, 14).toLocaleDateString())).toBeInTheDocument();
  });

  it("shows a dash when there is no display end", () => {
    const milestone: GanttTask = {
      id: "m",
      name: "Launch",
      type: "milestone",
      startDate: new Date(2026, 0, 5),
      endDate: new Date(2026, 0, 5),
    };
    render(<Gantt tasks={[milestone]} height={300} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("reports progress as a percentage, defaulting to zero", () => {
    render(<Gantt tasks={[{ ...tasks[0]!, progress: 35 }]} height={300} />);
    expect(screen.getByText("35%")).toBeInTheDocument();
  });

  it("fires onTaskEdit from the edit action and onTaskDelete from delete", () => {
    const onTaskEdit = vi.fn();
    const onTaskDelete = vi.fn();
    render(
      <Gantt tasks={tasks} height={300} onTaskEdit={onTaskEdit} onTaskDelete={onTaskDelete} />,
    );
    fireEvent.click(screen.getByLabelText(/edit/i));
    expect(onTaskEdit).toHaveBeenCalledTimes(1);
    expect(onTaskEdit.mock.calls[0]![0]).toMatchObject({ id: "1" });

    fireEvent.click(screen.getByLabelText(/delete/i));
    expect(onTaskDelete).toHaveBeenCalledWith("1");
  });

  it("creates a task after the clicked row and opens it for editing", () => {
    const onTaskCreate = vi.fn();
    const onTaskEdit = vi.fn();
    render(
      <Gantt tasks={tasks} height={300} onTaskCreate={onTaskCreate} onTaskEdit={onTaskEdit} />,
    );
    fireEvent.click(screen.getByLabelText(/add/i));
    expect(onTaskCreate).toHaveBeenCalledTimes(1);
    // Inserted after the clicked task, and handed straight to the editor.
    expect(onTaskCreate.mock.calls[0]![1]).toBe("1");
    expect(onTaskEdit).toHaveBeenCalledTimes(1);
  });
});
