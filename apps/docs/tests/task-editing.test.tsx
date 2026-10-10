import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GanttHandle, GanttProps, GanttTask } from "@art-tools/react-gantt";
import { TaskEditingDemo } from "@/app/examples/task-editing/demo";

const boundary = vi.hoisted(() => ({ props: null as GanttProps | null, updateTask: vi.fn() }));
vi.mock("@art-tools/react-gantt", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@art-tools/react-gantt")>()),
  Gantt: (props: GanttProps) => {
    boundary.props = props;
    if (props.apiRef && typeof props.apiRef !== "function") {
      props.apiRef.current = { updateTask: boundary.updateTask } as unknown as GanttHandle;
    }
    return null;
  },
}));

const task = (): GanttTask => ({
  id: "test",
  name: "Task",
  startDate: new Date(2026, 0, 5),
  endDate: new Date(2026, 0, 10),
});
function open(value = task()) {
  render(<TaskEditingDemo />);
  act(() => boundary.props!.onTaskEdit!(value));
}
function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function save() {
  fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!);
}
function patch() {
  return boundary.updateTask.mock.calls[0]![1];
}

beforeEach(() => {
  boundary.updateTask.mockReset();
  boundary.props = null;
});
describe("date editor", () => {
  it("shows the last occupied day and sends no date changes on unchanged Save", () => {
    open();
    expect(screen.getByLabelText("Start")).toHaveValue("2026-01-05");
    expect(screen.getByLabelText("End")).toHaveValue("2026-01-09");
    save();
    expect(patch()).toEqual({});
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });
  it("keeps name and progress changes minimal", () => {
    open();
    change("Name", "Renamed");
    change("Progress 0%", "45");
    save();
    expect(patch()).toEqual({ name: "Renamed", progress: 45 });
  });
  it.each(["Start", "End"])("rejects empty %s without submitting other changes", (field) => {
    open();
    change("Name", "Renamed");
    change(field, "");
    save();
    expect(boundary.updateTask).not.toHaveBeenCalled();
    expect(screen.getByLabelText(field)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(field)).toHaveAccessibleDescription(new RegExp("valid"));
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
  it("rejects reversed dates and permits correction", () => {
    open();
    change("End", "2026-01-04");
    save();
    expect(boundary.updateTask).not.toHaveBeenCalled();
    expect(screen.getByText("End must be on or after Start.")).toBeInTheDocument();
    change("End", "2026-01-10");
    save();
    expect(patch()).toEqual({ endDate: new Date(2026, 0, 11) });
  });
  it("rejects impossible dates sanitized by the date input", () => {
    open();
    change("End", "2026-02-30");
    save();
    expect(boundary.updateTask).not.toHaveBeenCalled();
    expect(screen.getByLabelText("End")).toHaveValue("");
  });
  it("allows Cancel after an invalid submission", () => {
    open();
    change("End", "");
    save();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(boundary.updateTask).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });
  it("changes only Start to local midnight", () => {
    open();
    change("Start", "2026-01-06");
    save();
    expect(patch()).toEqual({ startDate: new Date(2026, 0, 6) });
  });
  it.each([
    ["2026-01-05", new Date(2026, 0, 6)],
    ["2026-01-31", new Date(2026, 1, 1)],
    ["2026-12-31", new Date(2027, 0, 1)],
    ["2028-02-29", new Date(2028, 2, 1)],
    ["2026-03-29", new Date(2026, 2, 30)],
    ["2026-10-25", new Date(2026, 9, 26)],
  ])("converts End %s to the next local midnight", (input, expected) => {
    open();
    change("End", input);
    save();
    expect(patch()).toEqual({ endDate: expected });
    expect(patch().endDate.getHours()).toBe(0);
  });
  it.each([
    { startDate: new Date(2026, 0, 5, 9), endDate: new Date(2026, 0, 9, 17) },
    { startDate: new Date(2026, 0, 5), endDate: undefined },
    { startDate: new Date(2026, 0, 5, 9), endDate: new Date(2026, 0, 5, 9) },
  ])("preserves exact untouched timestamps and optionality: %o", (dates) => {
    open({ ...task(), ...dates });
    change("Name", "Renamed");
    save();
    expect(patch()).toEqual({ name: "Renamed" });
  });
  it("accepts the supported lower year boundary", () => {
    open();
    change("Start", "0100-01-01");
    change("End", "0100-01-01");
    save();
    expect(patch().startDate.getFullYear()).toBe(100);
    expect(patch().endDate.getFullYear()).toBe(100);
    expect(patch().endDate.getDate()).toBe(2);
  });
  it("rejects unsupported early years with visible feedback", () => {
    open();
    change("Start", "0099-01-02");
    save();
    expect(boundary.updateTask).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a valid start date (year 0100–9999).")).toBeInTheDocument();
  });
});
