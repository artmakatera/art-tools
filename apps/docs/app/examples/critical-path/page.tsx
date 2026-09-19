import type { Metadata } from "next";
import { ExamplePage } from "@/components/example-page";
import { getExample } from "@/lib/examples";
import { CriticalPathDemo } from "./demo";

const meta = getExample("critical-path");

export const metadata: Metadata = { title: meta.title, description: meta.blurb };

// Prerender or fail the build: readDemoSource only works at build time.
export const dynamic = "error";

export default function Page() {
  return (
    <ExamplePage
      meta={meta}
      fallbackHeight={340}
      notes={
        <>
          Kickoff → Design → Build → Launch has zero float, so it stays highlighted through{" "}
          <code className="font-mono">--am-gantt-critical-bg</code> and{" "}
          <code className="font-mono">--am-gantt-critical-dependency-color</code>. Kickoff →
          Research → Prototype shares Kickoff with that chain but finishes well before Launch, so it
          has slack and is never flagged critical — dragging it would not move the chart's end date.
          Try dragging Build later: Launch cascades with it, and the highlight is recomputed on that
          commit.
        </>
      }
    >
      <CriticalPathDemo />
    </ExamplePage>
  );
}
