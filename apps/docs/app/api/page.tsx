import type { Metadata } from "next";
import Link from "next/link";
import { API_SECTIONS, apiSectionForSymbol } from "@/lib/api";
import { readApi } from "@/lib/read-api";

export const dynamic = "error";
export const metadata: Metadata = {
  title: "API reference",
  description: "Public components, props, types, hooks, and utilities for @art-tools/react-gantt.",
};

export default async function ApiOverview() {
  const declarations = await readApi();
  return (
    <article className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-col gap-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Reference
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">API reference</h1>
        <p className="max-w-2xl text-pretty leading-relaxed text-slate-600 dark:text-slate-400">
          Components, props, types, and utilities exported by <code>@art-tools/react-gantt</code>.
          Start with Gantt for a complete chart, or use the composable components to build your own
          layout.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Signatures and property tables are generated from the library&rsquo;s public TypeScript
          declarations.
        </p>
      </header>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        {API_SECTIONS.map((section) => (
          <Link
            key={section.slug}
            href={`/api/${section.slug}`}
            className="docs-control docs-card flex flex-col gap-2 p-5"
          >
            <h2 className="font-semibold">{section.title}</h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {section.description}
            </p>
          </Link>
        ))}
      </div>
      <section aria-labelledby="exports-heading" className="flex min-w-0 flex-col gap-5">
        <h2 id="exports-heading" className="text-2xl font-semibold tracking-tight">
          All exports
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Jump directly to a symbol. Types are imported with <code>import type</code>.
        </p>
        {API_SECTIONS.map((section) => (
          <div key={section.slug} className="flex flex-col gap-3">
            <h3 className="font-medium">{section.title}</h3>
            <ul className="grid min-w-0 gap-x-4 gap-y-1 sm:grid-cols-2">
              {declarations
                .filter((entry) => apiSectionForSymbol(entry.name)?.slug === section.slug)
                .map((entry) => (
                  <li key={entry.name} className="min-w-0">
                    <Link
                      href={`/api/${section.slug}#${entry.name}`}
                      className="docs-control inline-block max-w-full break-words rounded py-2 font-mono text-sm text-slate-600 underline underline-offset-4 dark:text-slate-300"
                    >
                      {entry.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>
    </article>
  );
}
