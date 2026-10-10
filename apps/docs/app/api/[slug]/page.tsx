import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiCode } from "@/components/api-code";
import { API_SECTIONS, apiSectionForSymbol, getApiSection } from "@/lib/api";
import { API_CONTENT } from "@/lib/api-content";
import { readApi } from "@/lib/read-api";
import { EXAMPLES } from "@/lib/examples";

export const dynamic = "error";
export const dynamicParams = false;

interface ApiPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return API_SECTIONS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ApiPageProps): Promise<Metadata> {
  const section = getApiSection((await params).slug);
  if (!section) {
    notFound();
  }
  return { title: `${section.title} API`, description: section.description };
}

export default async function ApiPage({ params }: ApiPageProps) {
  const section = getApiSection((await params).slug);
  if (!section) {
    notFound();
  }
  const declarations = (await readApi()).filter(
    (entry) => apiSectionForSymbol(entry.name)?.slug === section.slug,
  );
  const order = new Map(section.symbols.map((name, index) => [name, index]));
  declarations.sort(
    (a, b) =>
      (order.get(a.name) ?? Infinity) - (order.get(b.name) ?? Infinity) ||
      a.name.localeCompare(b.name),
  );
  const content = API_CONTENT[section.slug]!;
  const related = EXAMPLES.filter((example) => content.examples.includes(example.slug));
  return (
    <article className="mx-auto flex min-w-0 max-w-5xl flex-col gap-10 px-4 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-col gap-3">
        <Link
          href="/api"
          className="docs-control self-start py-2 text-sm text-slate-500 underline underline-offset-4 dark:text-slate-400"
        >
          API reference
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {section.title}
        </h1>
        <p className="max-w-2xl text-pretty text-slate-600 dark:text-slate-400">
          {section.description}
        </p>
      </header>
      <section aria-labelledby="usage-heading" className="flex min-w-0 flex-col gap-4">
        <h2 id="usage-heading" className="text-xl font-semibold">
          Usage
        </h2>
        <ApiCode code={content.code} label={`${section.title} usage example`} />
        <ul className="flex list-disc flex-col gap-3 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {content.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
      <nav
        aria-label="On this page"
        className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
      >
        <h2 className="mb-3 text-sm font-semibold">On this page</h2>
        <ul className="grid min-w-0 gap-x-4 gap-y-1 sm:grid-cols-2">
          {declarations.map((entry) => (
            <li key={entry.name} className="min-w-0">
              <a
                href={`#${entry.name}`}
                className="docs-control inline-block max-w-full break-words rounded py-2 font-mono text-sm text-slate-600 underline underline-offset-4 dark:text-slate-300"
              >
                {entry.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {declarations.map((entry) => (
        <section
          key={entry.name}
          id={entry.name}
          aria-labelledby={`${entry.name}-heading`}
          className="flex min-w-0 scroll-mt-6 flex-col gap-4 border-t border-slate-200 pt-8 dark:border-slate-800"
        >
          <div className="flex flex-wrap items-baseline gap-3">
            <h2
              id={`${entry.name}-heading`}
              className="min-w-0 break-words font-mono text-xl font-semibold"
            >
              <a href={`#${entry.name}`} className="docs-control rounded">
                {entry.name}
              </a>
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">{entry.kind}</span>
          </div>
          {entry.description ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {entry.description}
            </p>
          ) : null}
          {entry.members.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full table-fixed text-left text-sm">
                <caption className="sr-only">{entry.name} documented properties</caption>
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th scope="col" className="w-1/3 px-3 py-3 font-medium">
                      Property
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Type &amp; description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entry.members.map((member) => (
                    <tr
                      key={member.name}
                      className="border-t border-slate-200 align-top dark:border-slate-800"
                    >
                      <th scope="row" className="px-3 py-3 font-normal">
                        <code className="break-words">{member.name}</code>
                        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                          {member.optional ? "Optional" : "Required"}
                        </span>
                      </th>
                      <td className="min-w-0 px-3 py-3">
                        <code className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                          {member.type}
                        </code>
                        {member.description ? (
                          <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-600 dark:text-slate-400">
                            {member.description}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {entry.members.length > 0 ? (
            <details className="min-w-0">
              <summary className="docs-control mb-3 cursor-pointer rounded py-2 text-sm font-medium">
                TypeScript declaration
              </summary>
              <ApiCode code={entry.code} label={`${entry.name} declaration`} />
            </details>
          ) : (
            <ApiCode code={entry.code} label={`${entry.name} declaration`} />
          )}
          {entry.supportingCode ? (
            <details className="min-w-0">
              <summary className="docs-control mb-3 cursor-pointer rounded py-2 text-sm font-medium">
                Supporting types
              </summary>
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                These types appear in this signature but are not separate package exports.
              </p>
              <ApiCode code={entry.supportingCode} label={`${entry.name} supporting types`} />
            </details>
          ) : null}
        </section>
      ))}
      <section
        aria-labelledby="examples-heading"
        className="flex flex-col gap-4 border-t border-slate-200 pt-8 dark:border-slate-800"
      >
        <h2 id="examples-heading" className="text-xl font-semibold">
          Related examples
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {related.map((example) => (
            <Link
              key={example.slug}
              href={`/examples/${example.slug}`}
              className="docs-control docs-card flex flex-col gap-2 p-4"
            >
              <span className="font-medium">{example.title}</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">{example.blurb}</span>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
