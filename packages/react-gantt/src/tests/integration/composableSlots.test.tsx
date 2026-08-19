import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  GanttGrid,
  GanttProvider,
  GanttSlotsProvider,
  TaskList,
  type GanttSlotsValue,
  type GanttTask,
} from "../../index";

/**
 * The composable path's access to the context-delivered slot groups.
 *
 * `<Gantt>` mounts `GanttSlotsProvider` internally, so the `bars`,
 * `dependencySlots` and `timeline` groups only ever reached their components
 * through it. A consumer assembling `<GanttProvider><TaskList /><GanttGrid /></…>`
 * — the composable API the README documents — had no way to supply any of the
 * three, because the provider was not exported. These tests pin that it now works,
 * and that the `taskList` group still arrives by prop on the same path.
 *
 * Overrides are asserted through `className` rather than `data-testid`: slotProps
 * are typed as `ComponentProps<"div">`, which does not admit arbitrary `data-*`
 * attributes, so a consumer cannot tag a slot without a cast. Worth closing when
 * the slots axis is revisited.
 */

const tasks: GanttTask[] = [
  { id: "1", name: "Design", startDate: new Date(2026, 0, 5), endDate: new Date(2026, 0, 15) },
];

describe("composable slot groups", () => {
  it("applies a bars slot override supplied through GanttSlotsProvider", () => {
    const slots: GanttSlotsValue = {
      bars: {
        taskBar: {
          slotProps: { root: { className: "custom-bar" } },
        },
      },
    };
    const { container } = render(
      <GanttProvider tasks={tasks} height={300}>
        <GanttSlotsProvider value={slots}>
          <GanttGrid />
        </GanttSlotsProvider>
      </GanttProvider>,
    );
    expect(container.querySelectorAll(".custom-bar").length).toBeGreaterThan(0);
  });

  it("applies a timeline slot override on the composable path", () => {
    const slots: GanttSlotsValue = {
      timeline: {
        gridColumn: {
          slotProps: { column: { className: "custom-col" } },
        },
      },
    };
    const { container } = render(
      <GanttProvider tasks={tasks} height={300}>
        <GanttSlotsProvider value={slots}>
          <GanttGrid />
        </GanttSlotsProvider>
      </GanttProvider>,
    );
    expect(container.querySelectorAll(".custom-col").length).toBeGreaterThan(0);
  });

  it("still renders bare, with no slots provider at all", () => {
    // The context defaults to {} rather than throwing, which is what lets the
    // components be rendered in isolation by the slot tests.
    const { container } = render(
      <GanttProvider tasks={tasks} height={300}>
        <GanttGrid />
      </GanttProvider>,
    );
    expect(container.querySelector(".gridWrapper")).not.toBeNull();
  });

  it("takes the taskList group by prop on the same path", () => {
    const { container } = render(
      <GanttProvider tasks={tasks} height={300}>
        <TaskList
          columns={[{ key: "name", header: "Name", render: (task) => task.name }]}
          taskList={{ header: { slotProps: { header: { className: "custom-header" } } } }}
        />
      </GanttProvider>,
    );
    expect(container.querySelector(".custom-header")).not.toBeNull();
  });
});
