import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DependencyLinks } from "../../../components/dependency-links/DependencyLinks";
import { DependencyLinksProvider } from "../../../components/dependency-links/DependencyLinksContext";
import type { GanttTask, TaskDependency } from "../../../types";

const TASKS: GanttTask[] = [
  {
    id: "a",
    name: "A",
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 0, 5),
  },
  {
    id: "b",
    name: "B",
    startDate: new Date(2026, 0, 10),
    endDate: new Date(2026, 0, 15),
  },
];

function renderLinks(
  deps: TaskDependency[],
  props: Partial<React.ComponentProps<typeof DependencyLinks>> = {},
) {
  return render(
    <DependencyLinksProvider
      tasks={TASKS}
      dependencies={deps}
      origin={new Date(2026, 0, 1)}
      colWidth={30}
      rowHeight={40}
      unit="day"
      overrides={{}}
    >
      <DependencyLinks width={800} height={200} {...props} />
    </DependencyLinksProvider>,
  );
}

const FS: TaskDependency[] = [{ from: "a", to: "b", type: "FS" }];
const FS_LAG: TaskDependency[] = [{ from: "a", to: "b", type: "FS", lag: 2 }];

const CustomButton = (props: React.ComponentProps<"button">) => (
  <button type="button" data-testid="custom-delete" {...props} />
);

describe("<DependencyLinks /> slots", () => {
  it("renders the default layer, segments and arrow with their classes", () => {
    const { container } = renderLinks(FS);
    expect(container.querySelector(".layer")).not.toBeNull();
    expect(container.querySelectorAll(".segment").length).toBeGreaterThan(0);
    // Arrow is either arrowRight or arrowLeft.
    const arrow = container.querySelector(".arrowRight") ?? container.querySelector(".arrowLeft");
    expect(arrow).not.toBeNull();
    // Transparent hit areas are preserved.
    expect(container.querySelectorAll(".hitArea").length).toBeGreaterThan(0);
  });

  it("merges slotProps.layer.className with the internal class", () => {
    const { container } = renderLinks(FS, {
      slotProps: { layer: { className: "custom-layer" } },
    });
    const layer = container.querySelector(".layer") as HTMLElement;
    expect(layer.className).toMatch(/layer/);
    expect(layer.className).toMatch(/custom-layer/);
  });

  it("merges slotProps.segment.className while keeping positional style", () => {
    const { container } = renderLinks(FS, {
      slotProps: { segment: { className: "custom-seg" } },
    });
    const segment = container.querySelector(".segment") as HTMLElement;
    expect(segment.className).toMatch(/segment/);
    expect(segment.className).toMatch(/custom-seg/);
    // Internal positional style survives the merge.
    expect(segment.style.position).toBe("");
    expect(segment.getAttribute("style")).toMatch(/left|top|width|height/);
  });

  it("merges slotProps.arrow.className", () => {
    const { container } = renderLinks(FS, {
      slotProps: { arrow: { className: "custom-arrow" } },
    });
    const arrow = (container.querySelector(".arrowRight") ??
      container.querySelector(".arrowLeft")) as HTMLElement;
    expect(arrow.className).toMatch(/custom-arrow/);
  });

  it("renders the lag label and merges slotProps.lagLabel.className", () => {
    const { container, getByText } = renderLinks(FS_LAG, {
      slotProps: { lagLabel: { className: "custom-lag" } },
    });
    const label = container.querySelector(".lagLabel") as HTMLElement;
    expect(label).not.toBeNull();
    expect(label.className).toMatch(/custom-lag/);
    expect(getByText("+2d")).toBeTruthy();
  });

  it("passes segment ownerState to the function form of slotProps", () => {
    const spy = vi.fn((_: unknown) => ({}));
    renderLinks(FS, { slotProps: { segment: spy } });
    expect(spy).toHaveBeenCalled();
    const arg = spy.mock.calls[0]![0] as {
      link: { id: string };
      isSelected: boolean;
      index: number;
    };
    expect(arg.link.id).toBe("a->b");
    expect(arg.isSelected).toBe(false);
    expect(typeof arg.index).toBe("number");
  });

  it("shows the default delete button on selection and fires onDependencyDelete", () => {
    const onDependencyDelete = vi.fn();
    const { container } = renderLinks(FS, { onDependencyDelete });
    // Select the link by clicking a transparent hit area.
    const hit = container.querySelector(".hitArea") as HTMLElement;
    fireEvent.click(hit);
    // The layer is aria-hidden, so query by class rather than role.
    const button = container.querySelector(".deleteBtn") as HTMLElement;
    expect(button.getAttribute("aria-label")).toBe("Delete dependency");
    expect(button.textContent).toBe("×");
    fireEvent.click(button);
    expect(onDependencyDelete).toHaveBeenCalledWith(FS[0]);
  });

  it("replaces the delete button via slots and still fires onClick", () => {
    const onDependencyDelete = vi.fn();
    const { container, getByTestId } = renderLinks(FS, {
      onDependencyDelete,
      slots: { deleteButton: CustomButton },
    });
    fireEvent.click(container.querySelector(".hitArea") as HTMLElement);
    const button = getByTestId("custom-delete");
    expect(button.getAttribute("aria-label")).toBe("Delete dependency");
    fireEvent.click(button);
    expect(onDependencyDelete).toHaveBeenCalledWith(FS[0]);
  });
});
