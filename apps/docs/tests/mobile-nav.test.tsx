import type { AnchorHTMLAttributes } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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

import { MobileNav } from "@/components/mobile-nav";

const disclosure = () => screen.getByText("Browse examples").closest("details")!;

describe("mobile example navigation", () => {
  it("appears only on example routes", () => {
    navigation.pathname = "/";
    const { rerender } = render(<MobileNav />);
    expect(screen.queryByText("Browse examples")).not.toBeInTheDocument();
    navigation.pathname = `/examples/${EXAMPLES[0]!.slug}`;
    rerender(<MobileNav />);
    expect(disclosure()).toBeInTheDocument();
  });

  it("closes when a descendant of an example link is clicked", () => {
    render(<MobileNav />);
    const details = disclosure();
    details.open = true;
    fireEvent.click(screen.getByText(EXAMPLES[1]!.title));
    expect(details.open).toBe(false);
  });

  it("closes on Escape and returns focus to the summary", () => {
    render(<MobileNav />);
    const details = disclosure();
    details.open = true;
    const link = screen.getByRole("link", { name: EXAMPLES[1]!.title });
    link.focus();
    fireEvent.keyDown(link, { key: "ArrowDown" });
    expect(details.open).toBe(true);
    fireEvent.keyDown(link, { key: "Escape" });
    expect(details.open).toBe(false);
    expect(screen.getByText("Browse examples")).toHaveFocus();
  });

  it("resets the disclosure and active link after a route change", () => {
    const { rerender } = render(<MobileNav />);
    disclosure().open = true;
    navigation.pathname = `/examples/${EXAMPLES[1]!.slug}`;
    rerender(<MobileNav />);
    expect(disclosure().open).toBe(false);
    disclosure().open = true;
    expect(screen.getAllByRole("link", { current: "page" })).toHaveLength(1);
    expect(screen.getByRole("link", { current: "page" })).toHaveAttribute(
      "href",
      navigation.pathname,
    );
  });
});
