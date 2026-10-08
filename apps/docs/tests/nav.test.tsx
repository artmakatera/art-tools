import type { AnchorHTMLAttributes } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EXAMPLES } from "@/lib/examples";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));
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

beforeEach(() => {
  navigation.pathname = `/examples/${EXAMPLES[0]!.slug}`;
});

import { Nav } from "@/components/nav";

describe("example navigation", () => {
  it("marks only the exact current destination", () => {
    render(<Nav />);
    expect(screen.getAllByRole("link", { current: "page" })).toHaveLength(1);
    expect(screen.getByRole("link", { current: "page" })).toHaveAttribute(
      "href",
      navigation.pathname,
    );
    expect(screen.getByRole("link", { name: "All examples" })).toHaveAttribute(
      "href",
      "/#examples",
    );
  });

  it("updates on pathname changes without activating prefix matches", () => {
    const { rerender } = render(<Nav />);
    navigation.pathname = `/examples/${EXAMPLES[1]!.slug}`;
    rerender(<Nav />);
    expect(screen.getAllByRole("link", { current: "page" })).toHaveLength(1);
    expect(screen.getByRole("link", { current: "page" })).toHaveAttribute(
      "href",
      navigation.pathname,
    );
    navigation.pathname += "/extra";
    rerender(<Nav />);
    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });
});
