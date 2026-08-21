"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EXAMPLE_GROUPS, EXAMPLES } from "@/lib/examples";

/** Sidebar listing every example, grouped, with the current route marked. */
export function Nav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Examples" className="flex flex-col gap-6 text-sm">
      <Link href="/" className="font-semibold tracking-tight hover:underline">
        @art-tools/react-gantt
      </Link>

      {EXAMPLE_GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-1">
          <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
            {group}
          </h2>
          <ul className="flex flex-col">
            {EXAMPLES.filter((e) => e.group === group).map((example) => {
              const href = `/examples/${example.slug}`;
              const current = pathname === href;
              return (
                <li key={example.slug}>
                  <Link
                    href={href}
                    aria-current={current ? "page" : undefined}
                    className={
                      current
                        ? "block rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                        : "block rounded-md px-2 py-1 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                    }
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
