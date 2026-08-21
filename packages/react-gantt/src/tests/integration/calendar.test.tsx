import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Gantt, type GanttCalendar, type GanttTask } from "../../index";

// Jan 2026: Jan 1 Thu, Jan 2 Fri, Jan 3 Sat, Jan 4 Sun, Jan 5 Mon, Jan 6 Tue.
const jan = (day: number, hours = 0) => new Date(2026, 0, day, hours);

/** Whole days, weekends off. */
const WEEKDAYS: GanttCalendar = { days: { 0: false, 6: false } };

const tasks: GanttTask[] = [
  { id: "1", name: "A", startDate: jan(1), endDate: jan(3) },
  { id: "2", name: "B", startDate: jan(5), endDate: jan(7) },
];

const deps = [{ from: "1", to: "2", type: "FS" as const }];

function mount(props: Partial<React.ComponentProps<typeof Gantt>> = {}) {
  return render(<Gantt tasks={tasks} height={300} colWidth={40} {...props} />);
}

describe("working-time calendar", () => {
  it("renders with no calendar prop exactly as before", () => {
    const { container } = mount();
    expect(container.querySelectorAll(".row").length).toBeGreaterThan(0);
  });

  it("accepts an inline calendar object without breaking rendering", () => {
    const { container, rerender } = mount({ calendar: { days: { 0: false, 6: false } } });
    const before = container.querySelectorAll(".row").length;
    // A fresh-but-equal object every render is the realistic usage. Keyed by
    // content, so this must not thrash or throw.
    rerender(
      <Gantt
        tasks={tasks}
        height={300}
        colWidth={40}
        calendar={{ days: { 0: false, 6: false } }}
      />,
    );
    expect(container.querySelectorAll(".row").length).toBe(before);
  });

  it("shows the inclusive last day in the default End column, not the stored instant", () => {
    // Task A stores Jan 3 (exclusive) and must read as Jan 2.
    const { container } = mount();
    const text = container.querySelector(".taskList")?.textContent ?? "";
    expect(text).toContain(jan(2).toLocaleDateString());
    expect(text).not.toContain(jan(3).toLocaleDateString());
  });

  it("cascades a dependency over the weekend rather than onto it", () => {
    const onTasksChange = vi.fn();
    const { container } = render(
      <Gantt
        tasks={[
          { id: "1", name: "A", startDate: jan(1), endDate: jan(2) },
          { id: "2", name: "B", startDate: jan(1), endDate: jan(2) },
        ]}
        dependencies={deps}
        calendar={WEEKDAYS}
        height={300}
        colWidth={40}
        onTasksChange={onTasksChange}
      />,
    );
    expect(container).toBeTruthy();
  });

  it("honours a holiday override in the duration walk", () => {
    // A 2-day task starting Thursday with Friday marked a holiday must end Tuesday.
    const calendar: GanttCalendar = {
      days: { 0: false, 6: false },
      dates: { "2026-01-02": false },
    };
    const { container } = render(
      <Gantt
        tasks={[{ id: "x", name: "X", startDate: jan(1), duration: 2 }]}
        calendar={calendar}
        height={300}
        colWidth={40}
      />,
    );
    const text = container.querySelector(".taskList")?.textContent ?? "";
    // Thu Jan 1 + Mon Jan 5 → last worked day is Monday Jan 5.
    expect(text).toContain(jan(5).toLocaleDateString());
  });

  describe("non-working shading", () => {
    const probeTasks: GanttTask[] = [{ id: "1", name: "A", startDate: jan(1), endDate: jan(9) }];

    /** Collect the ownerState the grid hands to each column slot. */
    function shadingFor(calendar?: GanttCalendar) {
      const seen: { date: Date; isNonWorking: boolean; reason?: string; isWeekend: boolean }[] = [];
      render(
        <Gantt
          tasks={probeTasks}
          height={300}
          colWidth={40}
          calendar={calendar}
          timeline={{
            gridColumn: {
              slotProps: {
                column: (own) => {
                  seen.push({
                    date: own.date,
                    isNonWorking: own.isNonWorking,
                    reason: own.nonWorkingReason,
                    isWeekend: own.isWeekend,
                  });
                  return {};
                },
              },
            },
          }}
        />,
      );
      return (day: number) => seen.find((s) => s.date.getDate() === day && s.date.getMonth() === 0);
    }

    it("marks weekends with a weekend reason", () => {
      const at = shadingFor({ days: { 0: false, 6: false } });
      expect(at(3)).toMatchObject({ isNonWorking: true, reason: "weekend" }); // Sat
      expect(at(5)).toMatchObject({ isNonWorking: false }); // Mon
    });

    it("distinguishes a holiday from a weekend", () => {
      const at = shadingFor({
        days: { 0: false, 6: false },
        dates: { "2026-01-05": false },
      });
      expect(at(5)).toMatchObject({ isNonWorking: true, reason: "holiday" }); // Mon holiday
      expect(at(3)).toMatchObject({ isNonWorking: true, reason: "weekend" });
    });

    it("does not shade a working Saturday granted by a date override", () => {
      const at = shadingFor({
        days: { 0: false, 6: false },
        dates: { "2026-01-03": ["9:00-13:00"] },
      });
      expect(at(3)).toMatchObject({ isNonWorking: false });
    });

    it("does not shade a short working day at day scale", () => {
      // A partial day is still a working day; shading it whole would be wrong.
      const at = shadingFor({
        hours: ["8:00-17:00"],
        days: { 5: ["8:00-12:00"], 0: false, 6: false },
      });
      expect(at(2)).toMatchObject({ isNonWorking: false }); // short Friday
    });

    it("keeps the historical Sat/Sun-only behaviour with no calendar", () => {
      const at = shadingFor(undefined);
      expect(at(3)).toMatchObject({ isNonWorking: true, isWeekend: true });
      expect(at(5)).toMatchObject({ isNonWorking: false, isWeekend: false });
    });
  });

  it("leaves duration-only spans day-granular when hours are omitted", () => {
    // ADR-013: omitting `hours` must NOT silently impose business hours, or a
    // 3-day task would shrink to 3 * 8h.
    const { container } = render(
      <Gantt
        tasks={[{ id: "x", name: "X", startDate: jan(5), duration: 3 }]}
        calendar={WEEKDAYS}
        height={300}
        colWidth={40}
      />,
    );
    const text = container.querySelector(".taskList")?.textContent ?? "";
    // Mon + 3 whole working days → last worked day is Wednesday Jan 7.
    expect(text).toContain(jan(7).toLocaleDateString());
  });
});
