import Link from "next/link";
import { ClientOnly } from "@/components/client-only";
import { ExampleCatalog } from "@/components/example-catalog";
import { BasicDemo } from "./examples/basic/demo";

export const dynamic = "error";

export default function HomePage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex min-w-0 max-w-5xl flex-col gap-14 px-4 py-12 sm:px-6 sm:py-16"
    >
      <header className="flex max-w-3xl flex-col gap-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          A React library. Your scheduling interface.
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          A composable Gantt chart for React.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
          Build scheduling interfaces with task hierarchies, dependencies, working-time calendars,
          and a chart you can customize.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link
            href="/examples/basic"
            className="docs-control rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Try the basic chart
          </Link>
          <Link
            href="#examples"
            className="docs-control rounded-lg border border-slate-200 px-4 py-3 font-medium hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900"
          >
            Browse examples
          </Link>
        </div>
      </header>

      <section aria-labelledby="live-chart-heading" className="flex min-w-0 flex-col gap-3">
        <h2
          id="live-chart-heading"
          className="text-sm font-semibold uppercase tracking-wide text-slate-500"
        >
          Live chart
        </h2>
        <div className="isolate overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <ClientOnly
            fallback={
              <div
                style={{ height: 420 }}
                className="motion-safe:animate-pulse bg-slate-100 dark:bg-slate-800"
              />
            }
          >
            <BasicDemo />
          </ClientOnly>
        </div>
        <Link
          href="/examples/basic"
          className="docs-control self-start py-2 text-sm text-slate-600 underline underline-offset-4 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          View this example and its source
        </Link>
      </section>

      <section id="install" className="flex min-w-0 scroll-mt-6 flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Install</h2>
        <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm dark:border-slate-800 dark:bg-slate-900">
          <code>pnpm add @art-tools/react-gantt</code>
        </pre>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Then import the stylesheet once, at your app&rsquo;s entry point:
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm dark:border-slate-800 dark:bg-slate-900">
          <code>import &quot;@art-tools/react-gantt/style.css&quot;;</code>
        </pre>
      </section>

      <section id="examples" className="flex scroll-mt-6 flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Explore the examples</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Each example pairs a live chart with the exact source that renders it.
          </p>
        </header>
        <ExampleCatalog />
      </section>
    </main>
  );
}
