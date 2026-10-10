import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { CustomColumnsDemo } from "@/app/examples/custom-columns/demo";
it("renders Write spec as five days using the real chart formatter", () => {
  render(<CustomColumnsDemo />);
  const row = screen.getByRole("rowheader", { name: "Write spec" }).closest('[role="row"]')!;
  expect(within(row as HTMLElement).getByRole("gridcell", { name: "5" })).toBeInTheDocument();
});
