import Link from "next/link";
import { MobileNav } from "./mobile-nav";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <a href="#main-content" className="docs-skip">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="docs-control flex items-center gap-3 font-semibold tracking-tight"
        >
          <span
            className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
            aria-hidden="true"
          >
            G
          </span>
          <span>
            React Gantt
            <span className="block text-xs font-normal tracking-normal text-slate-500 dark:text-slate-400">
              @art-tools/react-gantt
            </span>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-2 text-sm font-medium">
          <Link
            className="docs-control rounded-lg px-3 py-3 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            href="/#examples"
          >
            Examples
          </Link>
          <Link
            className="docs-control rounded-lg bg-slate-900 px-4 py-3 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            href="/#install"
          >
            Get started
          </Link>
        </nav>
      </div>
      <MobileNav />
    </header>
  );
}
