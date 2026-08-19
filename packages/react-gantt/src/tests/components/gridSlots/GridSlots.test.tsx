import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalendarRow } from "../../../components/calendar/CalendarRow";
import { GridColumns } from "../../../components/grid/GridColumns";
import { buildDates } from "../../../core/dateUtils";
import type { Scale } from "../../../types";

const dayScale: Scale = {
  unit: "day",
  step: 1,
  format: (d) => String(d.getDate()),
};

function getCells(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLDivElement>(".cell"));
}

function getCols(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLDivElement>(".col"));
}

describe("CalendarRow slots", () => {
  it("preserves the default row/cell classNames and weekend modifier", () => {
    // 2026-01-02 Fri, 03 Sat, 04 Sun, 05 Mon.
    const dates = buildDates(new Date(2026, 0, 2), 4);
    const { container } = render(
      <CalendarRow scale={dayScale} dates={dates} colWidth={40} rowHeight={32} highlightWeekends />,
    );
    expect(container.querySelector(".row")).not.toBeNull();
    const cells = getCells(container);
    expect(cells).toHaveLength(4);
    expect(cells[0]!.className).not.toMatch(/cellWeekend/); // Fri
    expect(cells[1]!.className).toMatch(/cellWeekend/); // Sat
    expect(cells[2]!.className).toMatch(/cellWeekend/); // Sun
  });

  it("merges slotProps.row.className onto the default row class", () => {
    const dates = buildDates(new Date(2026, 0, 5), 2);
    const { container } = render(
      <CalendarRow
        scale={dayScale}
        dates={dates}
        colWidth={40}
        rowHeight={32}
        slotProps={{ row: { className: "extra-row" } }}
      />,
    );
    const row = container.querySelector<HTMLDivElement>(".row");
    expect(row).not.toBeNull();
    expect(row!.className).toMatch(/\brow\b/);
    expect(row!.className).toMatch(/extra-row/);
  });

  it("merges slotProps.cell.className (function form) while keeping the weekend modifier", () => {
    // 2026-01-03 Saturday.
    const dates = buildDates(new Date(2026, 0, 3), 1);
    const { container } = render(
      <CalendarRow
        scale={dayScale}
        dates={dates}
        colWidth={40}
        rowHeight={32}
        highlightWeekends
        slotProps={{
          cell: (own) => ({ className: own.isWeekend ? "is-weekend" : "is-weekday" }),
        }}
      />,
    );
    const cell = getCells(container)[0]!;
    expect(cell.className).toMatch(/\bcell\b/);
    expect(cell.className).toMatch(/cellWeekend/);
    expect(cell.className).toMatch(/is-weekend/);
  });

  it("replaces the cell element via slots.cell", () => {
    const dates = buildDates(new Date(2026, 0, 5), 2);
    const { container } = render(
      <CalendarRow
        scale={dayScale}
        dates={dates}
        colWidth={40}
        rowHeight={32}
        slots={{ cell: "button" }}
      />,
    );
    const buttons = container.querySelectorAll("button.cell");
    expect(buttons).toHaveLength(2);
    // The default cell content (formatted date) is preserved.
    expect(buttons[0]!.textContent).toBe("5");
  });

  it("replaces the row element via slots.row", () => {
    const dates = buildDates(new Date(2026, 0, 5), 1);
    const { container } = render(
      <CalendarRow
        scale={dayScale}
        dates={dates}
        colWidth={40}
        rowHeight={32}
        slots={{ row: "section" }}
      />,
    );
    expect(container.querySelector("section.row")).not.toBeNull();
  });
});

describe("GridColumns slots", () => {
  const colRange = { start: 0, end: 4 };

  it("preserves the default col classNames and weekend modifier", () => {
    // 2026-01-02 Fri, 03 Sat, 04 Sun, 05 Mon.
    const dates = buildDates(new Date(2026, 0, 2), 4);
    const { container } = render(
      <GridColumns dates={dates} colWidth={40} bodyHeight={200} colRange={colRange} />,
    );
    const cols = getCols(container);
    expect(cols).toHaveLength(4);
    expect(cols[0]!.className).not.toMatch(/colWeekend/); // Fri
    expect(cols[1]!.className).toMatch(/colWeekend/); // Sat
    expect(cols[2]!.className).toMatch(/colWeekend/); // Sun
    // Absolute positioning preserved as internal default.
    expect(cols[1]!.style.left).toBe("40px");
    expect(cols[1]!.style.width).toBe("40px");
    expect(cols[1]!.style.height).toBe("200px");
  });

  it("merges slotProps.column.className and style onto the internal defaults", () => {
    const dates = buildDates(new Date(2026, 0, 5), 2);
    const { container } = render(
      <GridColumns
        dates={dates}
        colWidth={40}
        bodyHeight={200}
        colRange={{ start: 0, end: 2 }}
        slotProps={{ column: { className: "painted", style: { opacity: 0.5 } } }}
      />,
    );
    const col = getCols(container)[0]!;
    expect(col.className).toMatch(/\bcol\b/);
    expect(col.className).toMatch(/painted/);
    // Consumer style merges on top of internal positioning.
    expect(col.style.opacity).toBe("0.5");
    expect(col.style.left).toBe("0px");
    expect(col.style.width).toBe("40px");
  });

  it("replaces the column element via slots.column", () => {
    const dates = buildDates(new Date(2026, 0, 5), 2);
    const { container } = render(
      <GridColumns
        dates={dates}
        colWidth={40}
        bodyHeight={200}
        colRange={{ start: 0, end: 2 }}
        slots={{ column: "span" }}
      />,
    );
    expect(container.querySelectorAll("span.col")).toHaveLength(2);
  });
});
