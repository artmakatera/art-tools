import type { ReactNode } from "react";

interface SourceFile {
  /** Tab label, e.g. "demo.tsx". */
  name: string;
  /** Pre-highlighted HTML from `lib/highlight`. */
  html: string;
}

interface DemoShellProps {
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
export function DemoShell({ title, blurb, children, notes, sources }: DemoShellProps) {
  return (
    <article className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-slate-600 dark:text-slate-400">{blurb}</p>
      </header>

      {notes ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {notes}
        </div>
      ) : null}

      <section
        aria-label="Live example"
        className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        {children}
      </section>

      <section aria-label="Source" className="flex flex-col gap-4">
        {sources.map((file) => (
          <figure key={file.name} className="flex flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <figcaption className="border-b border-slate-200 bg-slate-50 px-4 py-2 font-mono text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              {file.name}
            </figcaption>
            {/* Shiki output: already-escaped, static, zero client JS. */}
            <div
              className="overflow-x-auto p-4 text-[13px] leading-relaxed [&_pre]:bg-transparent"
              dangerouslySetInnerHTML={{ __html: file.html }}
            />
          </figure>
        ))}
      </section>
    </article>
  );
}
