import Image from "next/image";
import Link from "next/link";
import { MobileNav } from "./mobile-nav";
import { SiteLinks } from "./site-links";

export function SiteHeader() {
  return (
    <header className="docs-header border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
      <a href="#main-content" className="docs-skip">
        Skip to content
      </a>
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <MobileNav />
          <Link
            id="site-home"
            href="/"
            className="docs-control flex min-w-0 items-center gap-2 rounded-lg font-semibold tracking-tight sm:gap-3"
          >
            <Image
              src="/logo.svg"
              alt=""
              width={32}
              height={32}
              className="size-8 shrink-0"
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm sm:text-base">React Gantt</span>
              <span className="hidden text-xs font-normal tracking-normal text-slate-500 sm:block dark:text-slate-400">
                @art-tools/react-gantt
              </span>
            </span>
          </Link>
        </div>
        <nav
          aria-label="Main navigation"
          className="hidden shrink-0 items-center gap-2 text-sm font-medium md:flex"
        >
          <SiteLinks />
        </nav>
        <a
          href="https://github.com/artmakatera/art-tools"
          className="docs-control flex min-h-11 shrink-0 items-center rounded-lg border border-slate-200 px-3 text-sm font-medium hover:bg-slate-100 md:hidden dark:border-slate-800 dark:hover:bg-slate-800"
        >
          GitHub
        </a>
      </div>
    </header>
  );
}
