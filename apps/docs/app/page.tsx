import Link from "next/link";
import { EXAMPLE_GROUPS, EXAMPLES } from "@/lib/examples";

export const dynamic = "error";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">@am/react-gantt</h1>
        <p className="text-slate-600 dark:text-slate-400">
          A composable, virtualized Gantt chart for React. Every example below is
          live, and the code shown beneath it is the file that rendered it.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Install
        </h2>
        <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm dark:border-slate-800 dark:bg-slate-900">
          pnpm add @am/react-gantt
        </pre>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Then import the stylesheet once, at your app&rsquo;s entry point:{" "}
          <code className="font-mono text-[13px]">
            import &quot;@am/react-gantt/style.css&quot;;
          </code>
        </p>
      </section>

      {EXAMPLE_GROUPS.map((group) => (
        <section key={group} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {group}
          </h2>
          <ul className="flex flex-col gap-2">
            {EXAMPLES.filter((e) => e.group === group).map((example) => (
              <li key={example.slug}>
                <Link
                  href={`/examples/${example.slug}`}
                  className="flex flex-col gap-0.5 rounded-lg border border-slate-200 px-4 py-3 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                >
                  <span className="font-medium">{example.title}</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {example.blurb}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
