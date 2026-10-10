import type { AnchorHTMLAttributes } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExampleCatalog } from "@/components/example-catalog";
import { EXAMPLES, EXAMPLE_GROUPS } from "@/lib/examples";

vi.mock("next/link", () => ({
  default: ({ children, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      <span>{children}</span>
    </a>
  ),
}));

const destinations = () => screen.queryAllByRole("link").map((link) => link.getAttribute("href"));

describe("example catalog", () => {
  it("shows every example in group order with a contextual count", () => {
    render(<ExampleCatalog />);
    expect(destinations()).toEqual(
      EXAMPLE_GROUPS.flatMap((group) =>
        EXAMPLES.filter((example) => example.group === group).map(
          ({ slug }) => `/examples/${slug}`,
        ),
      ),
    );
    expect(screen.getAllByRole("heading").map((heading) => heading.textContent)).toEqual(
      EXAMPLE_GROUPS,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      `${EXAMPLES.length} of ${EXAMPLES.length} examples`,
    );
  });

  it("normalizes whitespace and case and requires every search term", () => {
    render(<ExampleCatalog />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Find an example" }), {
      target: { value: "  CUSTOM   ZOOM  " },
    });
    expect(destinations()).toEqual(["/examples/custom-zoom"]);
    expect(screen.getByRole("status")).toHaveTextContent(`1 of ${EXAMPLES.length} examples`);
  });

  it("searches group names and omits empty groups", () => {
    render(<ExampleCatalog />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Interaction" } });
    expect(destinations()).toEqual(
      EXAMPLES.filter(({ group }) => group === "Interaction").map(
        ({ slug }) => `/examples/${slug}`,
      ),
    );
    expect(screen.getAllByRole("heading").map((heading) => heading.textContent)).toEqual([
      "Interaction",
    ]);
  });

  it("announces an empty result without example links", () => {
    render(<ExampleCatalog />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "unmatched-xyz" } });
    expect(destinations()).toEqual([]);
    expect(screen.getByRole("heading", { name: "No matching examples" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(`0 of ${EXAMPLES.length} examples`);
    const reset = screen.getByRole("button", { name: "Clear search" });
    expect(
      screen.getByRole("heading", { name: "No matching examples" }).parentElement,
    ).toContainElement(reset);
    fireEvent.click(reset);
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(destinations()).toHaveLength(EXAMPLES.length);
  });

  it("clears the query and restores every example", () => {
    render(<ExampleCatalog />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zoom" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(destinations()).toHaveLength(EXAMPLES.length);
    expect(screen.getByRole("status")).toHaveTextContent(
      `${EXAMPLES.length} of ${EXAMPLES.length} examples`,
    );
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });
});
