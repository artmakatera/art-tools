"use client";

import { useState } from "react";
import Link from "next/link";
import { EXAMPLE_GROUPS, EXAMPLES } from "@/lib/examples";

export function ExampleCatalog() {
  const [query, setQuery] = useState("");
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = EXAMPLES.filter((example) => {
    const text = `${example.title} ${example.blurb} ${example.group}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <label htmlFor="example-search" className="text-sm font-medium">
          Find an example
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="example-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try dependencies, slots, or zoom"
            className="docs-control min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-base dark:border-slate-700 dark:bg-slate-900"
          />
          {query ? (
            <button
              type="button"
              className="docs-control cursor-pointer rounded-lg px-4 py-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setQuery("")}
            >
              Clear search
            </button>
          ) : null}
        </div>
        <p role="status" className="text-sm text-slate-500 dark:text-slate-400">
          {matches.length} of {EXAMPLES.length} examples
        </p>
      </div>
      {matches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 dark:border-slate-700">
          <h3 className="font-semibold">No matching examples</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Try a feature name such as “zoom” or clear your search to see everything.
          </p>
        </div>
      ) : (
        EXAMPLE_GROUPS.map((group) => {
          const examples = matches.filter((example) => example.group === group);
          if (examples.length === 0) {
            return null;
          }
          return (
            <section key={group} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {group}
              </h3>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {examples.map((example) => (
                  <li key={example.slug} className="min-w-0">
                    <Link
                      href={`/examples/${example.slug}`}
                      className="docs-control docs-card group flex h-full flex-col gap-2 p-5"
                    >
                      <span className="flex items-start justify-between gap-3 font-semibold">
                        {example.title}
                        <span
                          aria-hidden="true"
                          className="text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100"
                        >
                          →
                        </span>
                      </span>
                      <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        {example.blurb}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
