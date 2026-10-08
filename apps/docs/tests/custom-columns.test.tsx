import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ColumnApi, GanttProps } from "@art-tools/react-gantt";
import { CustomColumnsDemo } from "@/app/examples/custom-columns/demo";
const boundary = vi.hoisted(() => ({ props: null as GanttProps | null }));
vi.mock("@art-tools/react-gantt", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@art-tools/react-gantt")>()),
  Gantt: (props: GanttProps) => {
    boundary.props = props;
    return null;
  },
}));
describe("custom Days column", () => {
  it.each([0, 3.25, 5])("returns the formatter's %s unchanged", (value) => {
    render(<CustomColumnsDemo />);
    const duration = vi.fn(() => value);
    const api = { format: { duration } } as unknown as ColumnApi;
    const task = { id: "test", name: "Instant", startDate: new Date(2026, 0, 5) };
    const column = boundary.props!.columns!.find((column) => column.key === "duration")!;
    expect(column.render!(task, api)).toBe(value);
    expect(duration).toHaveBeenCalledWith(task);
  });
});
