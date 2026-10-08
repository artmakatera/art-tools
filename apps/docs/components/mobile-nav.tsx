"use client";

import { usePathname } from "next/navigation";
import { Nav } from "./nav";

export function MobileNav() {
  const pathname = usePathname();
  if (!pathname.startsWith("/examples/")) {
    return null;
  }
  return (
    <details
      key={pathname}
      className="border-t border-slate-200 px-4 md:hidden dark:border-slate-800"
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("a")) {
          event.currentTarget.open = false;
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="docs-control cursor-pointer py-3 text-sm font-medium">
        Browse examples
      </summary>
      <div className="max-h-[60dvh] overflow-y-auto pb-4">
        <Nav />
      </div>
    </details>
  );
}
