"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EXAMPLE_GROUPS, EXAMPLES } from "@/lib/examples";

/** Sidebar listing every example, grouped, with the current route marked. */
export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Examples" className="flex flex-col gap-6 text-sm">
      <Link
        href="/#examples"
        className="docs-control px-3 py-2 font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
      >
        All examples
      </Link>
      {EXAMPLE_GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-2">
          <h2 className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {group}
          </h2>
          <ul className="flex flex-col gap-1">
            {EXAMPLES.filter((example) => example.group === group).map((example) => {
              const href = `/examples/${example.slug}`;
              return (
                <li key={example.slug}>
                  <Link
                    href={href}
                    aria-current={pathname === href ? "page" : undefined}
                    className="docs-control docs-nav-link"
                  >
                    {example.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
