import type { Metadata } from "next";
import { ExamplePage } from "@/components/example-page";
import { getExample } from "@/lib/examples";
import { SlotsDemo } from "./demo";

const meta = getExample("slots");

export const metadata: Metadata = { title: meta.title, description: meta.blurb };

// Prerender or fail the build: readDemoSource only works at build time.
export const dynamic = "error";

export default function Page() {
  return (
    <ExamplePage meta={meta} fallbackHeight={380}>
      <SlotsDemo />
    </ExamplePage>
  );
}
