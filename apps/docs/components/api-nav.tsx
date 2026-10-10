"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { API_SECTIONS } from "@/lib/api";

export function ApiNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="API reference" className="flex flex-col gap-4 text-sm">
      <Link
        href="/api"
        aria-current={pathname === "/api" ? "page" : undefined}
        className="docs-control docs-nav-link"
      >
        API overview
      </Link>
      <ul className="flex flex-col gap-1">
        {API_SECTIONS.map((section) => {
          const href = `/api/${section.slug}`;
          return (
            <li key={section.slug}>
              <Link
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className="docs-control docs-nav-link"
              >
                {section.title}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href="/#examples"
        className="docs-control px-3 py-3 text-slate-600 underline underline-offset-4 dark:text-slate-400"
      >
        Explore live examples
      </Link>
    </nav>
  );
}
