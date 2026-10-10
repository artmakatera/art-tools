import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { API_SECTIONS } from "@/lib/api";

const navigation = vi.hoisted(() => ({ pathname: "/api" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

import { ApiNav } from "@/components/api-nav";

describe("API navigation", () => {
  it("links every section and marks only an exact route as current", () => {
    const { rerender } = render(<ApiNav />);
    expect(screen.getByRole("link", { current: "page" })).toHaveAttribute("href", "/api");
    for (const section of API_SECTIONS) {
      expect(screen.getByRole("link", { name: section.title })).toHaveAttribute(
        "href",
        `/api/${section.slug}`,
      );
    }
    navigation.pathname = "/api/gantt";
    rerender(<ApiNav />);
    expect(screen.getAllByRole("link", { current: "page" })).toHaveLength(1);
    expect(screen.getByRole("link", { current: "page" })).toHaveAttribute("href", "/api/gantt");
    navigation.pathname = "/api/gantt/extra";
    rerender(<ApiNav />);
    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });
});
