import type { AnchorHTMLAttributes } from "react";
import Link from "next/link";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

let desktop: MediaQueryList;
let resizeListeners: Set<EventListenerOrEventListenerObject>;

beforeEach(() => {
  navigation.pathname = `/examples/${EXAMPLES[0]!.slug}`;
  resizeListeners = new Set();
  desktop = {
    matches: false,
    media: "(min-width: 48rem)",
    onchange: null,
    addEventListener: vi.fn((_type, listener) => resizeListeners.add(listener)),
    removeEventListener: vi.fn((_type, listener) => resizeListeners.delete(listener)),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => (query === desktop.media ? desktop : { ...desktop, matches: false })),
  );
});

import { MobileNav } from "@/components/mobile-nav";

async function openMenu() {
  const trigger = screen.getByRole("button", { name: "Open navigation" });
  fireEvent.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "Navigation" });
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  return dialog;
}

async function expectClosed() {
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByRole("button", { name: "Open navigation" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
}

describe("mobile navigation drawer", () => {
  it("offers site links and examples on the homepage", async () => {
    navigation.pathname = "/";
    render(<MobileNav />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const dialog = await openMenu();
    const site = within(dialog).getByRole("navigation", { name: "Site navigation" });
    expect(within(site).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(within(site).getByRole("link", { name: "API" })).toHaveAttribute("href", "/api");
    expect(within(site).getByRole("link", { name: "Get started" })).toHaveAttribute(
      "href",
      "/#install",
    );
    expect(within(dialog).getByRole("navigation", { name: "Examples" })).toBeInTheDocument();
  });

  it("offers API navigation on the overview and section routes", async () => {
    navigation.pathname = "/api";
    const { rerender } = render(<MobileNav />);
    const dialog = await openMenu();
    expect(within(dialog).getByRole("navigation", { name: "API reference" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("navigation", { name: "Examples" })).not.toBeInTheDocument();
    navigation.pathname = "/api/gantt";
    rerender(<MobileNav />);
    await expectClosed();
    await openMenu();
    expect(screen.getByRole("link", { current: "page" })).toHaveAttribute("href", "/api/gantt");
  });

  it("closes when a descendant of a navigation link is clicked", async () => {
    render(<MobileNav />);
    const dialog = await openMenu();
    fireEvent.click(within(dialog).getByText(EXAMPLES[1]!.title));
    await expectClosed();
  });

  it("keeps the drawer open for modified link clicks", async () => {
    render(<MobileNav />);
    const dialog = await openMenu();
    fireEvent.click(within(dialog).getByText(EXAMPLES[1]!.title), { ctrlKey: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    render(<MobileNav />);
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    trigger.focus();
    const dialog = await openMenu();
    const link = within(dialog).getByRole("link", { name: EXAMPLES[1]!.title });
    link.focus();
    fireEvent.keyDown(link, { key: "Escape" });
    await expectClosed();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("provides an explicit close button and supports backdrop dismissal", async () => {
    render(<MobileNav />);
    await openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    await expectClosed();
    await openMenu();
    const backdrop = document.querySelector(".docs-nav-backdrop")!;
    fireEvent.mouseDown(backdrop);
    fireEvent.mouseUp(backdrop);
    fireEvent.click(backdrop);
    await expectClosed();
  });

  it("resets open state on route changes, including back navigation", async () => {
    const initialPath = navigation.pathname;
    const { rerender } = render(<MobileNav />);
    await openMenu();
    navigation.pathname = `/examples/${EXAMPLES[1]!.slug}`;
    rerender(<MobileNav />);
    await expectClosed();
    await openMenu();
    expect(screen.getByRole("link", { current: "page" })).toHaveAttribute(
      "href",
      navigation.pathname,
    );
    navigation.pathname = initialPath;
    rerender(<MobileNav />);
    await expectClosed();
  });

  it("closes at the desktop breakpoint and focuses the visible home link", async () => {
    render(
      <>
        <Link id="site-home" href="/">
          React Gantt
        </Link>
        <MobileNav />
      </>,
    );
    const home = screen.getByRole("link", { name: "React Gantt" });
    await openMenu();
    act(() => {
      Object.defineProperty(desktop, "matches", { value: true });
      for (const listener of resizeListeners) {
        if (typeof listener === "function") {
          listener(new Event("change"));
        }
      }
    });
    await expectClosed();
    await waitFor(() => expect(home).toHaveFocus());
    expect(resizeListeners.size).toBe(0);
  });
});
