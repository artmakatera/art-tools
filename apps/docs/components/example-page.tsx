import type { ReactNode } from "react";
import { ClientOnly } from "@/components/client-only";
import { DemoShell } from "@/components/demo-shell";
import type { ExampleMeta } from "@/lib/examples";
import { highlight, type HighlightLang } from "@/lib/highlight";
import { readDemoSource } from "@/lib/read-demo-source";

interface ExamplePageProps {
  meta: ExampleMeta;
  children: ReactNode;
  /** Extra files to show below demo.tsx, e.g. a colocated CSS Module. */
  extraSources?: { name: string; lang: HighlightLang }[];
  notes?: ReactNode;
  /** Height of the skeleton shown until hydration; match the chart's. */
  fallbackHeight?: number;
}

/**
 * Shared body for every example route: highlight the demo's own source, then
 * render the chart behind a `ClientOnly` gate.
 *
 * Each route still declares its own `metadata` and `dynamic = "error"`, because
 * Next only reads those as module-level exports of the page file itself.
 */
export async function ExamplePage({
  meta,
  children,
  extraSources = [],
  notes,
  fallbackHeight = 420,
}: ExamplePageProps) {
  const sources = [
    { name: "demo.tsx", html: await highlight(await readDemoSource(meta.slug), "tsx") },
    ...(await Promise.all(
      extraSources.map(async (file) => ({
        name: file.name,
        html: await highlight(await readDemoSource(meta.slug, file.name), file.lang),
      })),
    )),
  ];

  return (
    <DemoShell title={meta.title} blurb={meta.blurb} notes={notes} sources={sources}>
      <ClientOnly
        fallback={
          <div
            style={{ height: fallbackHeight }}
            className="animate-pulse bg-slate-100 dark:bg-slate-800"
          />
        }
      >
        {children}
      </ClientOnly>
    </DemoShell>
  );
}
