import Link from "next/link";
import { EXAMPLES, EXAMPLE_GROUPS } from "@/lib/examples";
import type { ReactNode } from "react";

interface SourceFile {
  /** Tab label, e.g. "demo.tsx". */
  name: string;
  /** Pre-highlighted HTML from `lib/highlight`. */
  html: string;
}

interface DemoShellProps {
  slug: string;
  title: string;
  blurb: string;
  children: ReactNode;
  /** Rendered above the chart when an example needs extra explanation. */
  notes?: ReactNode;
  sources: SourceFile[];
}

/**
 * Page frame for one example: heading, the live chart, then the exact source
 * that produced it. The source is read off disk at build time (see
 * `lib/read-demo-source`), so it cannot drift from what is running above it.
 */
export function DemoShell({ slug, title, blurb, children, notes, sources }: DemoShellProps) {
  const ordered = EXAMPLE_GROUPS.flatMap((group) =>
    EXAMPLES.filter((example) => example.group === group),
  );
  const index = ordered.findIndex((example) => example.slug === slug);
  const previous = ordered[index - 1];
  const next = ordered[index + 1];
  return (
    <article className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-col gap-3">
        <Link
          href="/#examples"
          className="docs-control self-start py-2 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          Examples / {ordered[index]?.group}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h1>
        <p className="max-w-2xl text-pretty text-slate-600 dark:text-slate-400">{blurb}</p>
      </header>

      {notes ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {notes}
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Live example</h2>
          <a
            href="#source"
            className="docs-control py-2 text-sm text-slate-600 underline underline-offset-4 dark:text-slate-400"
          >
            Jump to source
          </a>
        </div>
        <section
          aria-label="Live example"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          {children}
        </section>
      </div>

      <section id="source" aria-label="Source" className="flex scroll-mt-6 flex-col gap-4">
        <h2 className="text-lg font-semibold">Source code</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The exact files used by the live example above.
        </p>
        {sources.map((file) => (
          <figure
            key={file.name}
            className="flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
          >
            <figcaption className="border-b border-slate-200 bg-slate-50 px-4 py-2 font-mono text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              {file.name}
            </figcaption>
            {/* Shiki output: already-escaped, static, zero client JS. */}
            <div
              // Keyboard users need to focus this horizontal scroll region to read long lines.
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
              tabIndex={0}
              role="region"
              aria-label={`Source for ${file.name}`}
              className="docs-control overflow-x-auto p-4 text-[13px] leading-relaxed [&_pre]:bg-transparent"
              dangerouslySetInnerHTML={{ __html: file.html }}
            />
          </figure>
        ))}
      </section>
      <nav
        aria-label="Adjacent examples"
        className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-8 sm:grid-cols-2 dark:border-slate-800"
      >
        {previous ? (
          <Link
            href={`/examples/${previous.slug}`}
            className="docs-control docs-card flex flex-col gap-1 p-4"
          >
            <span className="text-xs text-slate-500 dark:text-slate-400">Previous example</span>
            <span className="font-medium">{previous.title}</span>
          </Link>
        ) : (
          <div aria-hidden="true" className="hidden sm:block" />
        )}
        {next ? (
          <Link
            href={`/examples/${next.slug}`}
            className="docs-control docs-card flex flex-col gap-1 p-4 sm:text-right"
          >
            <span className="text-xs text-slate-500 dark:text-slate-400">Next example</span>
            <span className="font-medium">{next.title}</span>
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
