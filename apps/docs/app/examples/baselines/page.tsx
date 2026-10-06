import type { Metadata } from "next";
import { ExamplePage } from "@/components/example-page";
import { getExample } from "@/lib/examples";
import { BaselinesDemo } from "./demo";

const meta = getExample("baselines");

export const metadata: Metadata = { title: meta.title, description: meta.blurb };

export const dynamic = "error";

export default function Page() {
  return (
    <ExamplePage
      meta={meta}
      fallbackHeight={340}
      notes={
        <>
          Each thin line is a consumer-supplied plan. Hover for its title and dates, then drag a
          live bar: the plans stay fixed while the current schedule moves. Summary plans are
          supplied explicitly, and milestone plans appear as points. Toggle Show baselines to
          compare the current schedule with or without its plans. Use the counters to adjust line
          height, strip padding, and the gap between plans in pixels.
        </>
      }
    >
      <BaselinesDemo />
    </ExamplePage>
  );
}
