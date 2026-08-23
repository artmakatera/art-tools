import type { Metadata } from "next";
import { ExamplePage } from "@/components/example-page";
import { getExample } from "@/lib/examples";
import { BaseUiTooltipDemo } from "./demo";

const meta = getExample("bar-tooltip-base-ui");

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
          Same slot as the built-in tooltip, a different library behind it. There is no{" "}
          <code className="font-mono">open</code> prop for the two to disagree about: the chart
          holds no open state, so Base UI&rsquo;s <code className="font-mono">Tooltip.Root</code> is
          the only thing tracking hover. This one anchors above the bar and waits 150ms, rather than
          following the cursor immediately — both are the slot&rsquo;s decisions to make.
        </>
      }
    >
      <BaseUiTooltipDemo />
    </ExamplePage>
  );
}
