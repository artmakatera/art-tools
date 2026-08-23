import type { Metadata } from "next";
import { ExamplePage } from "@/components/example-page";
import { getExample } from "@/lib/examples";
import { BarTooltipDemo } from "./demo";

const meta = getExample("bar-tooltip");

export const metadata: Metadata = { title: meta.title, description: meta.blurb };

// Prerender or fail the build: readDemoSource only works at build time.
export const dynamic = "error";

export default function Page() {
  return (
    <ExamplePage
      meta={meta}
      fallbackHeight={380}
      notes={
        <>
          Hover any bar. The tooltip sits bottom-right of the cursor and follows it, flipping left
          or up rather than running off the chart edge — it places from the pointer because
          anchoring to the bar would put it at the midpoint of a bar that can be wider than the
          viewport. Replacing <code className="font-mono">bars.taskBar.slots.root</code> removes it,
          since the default root is what renders the slot.
        </>
      }
    >
      <BarTooltipDemo />
    </ExamplePage>
  );
}
