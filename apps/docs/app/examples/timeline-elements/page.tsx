import type { Metadata } from "next";
import { ExamplePage } from "@/components/example-page";
import { getExample } from "@/lib/examples";
import { TimelineElementsDemo } from "./demo";

const meta = getExample("timeline-elements");
export const metadata: Metadata = { title: meta.title, description: meta.blurb };
export const dynamic = "error";

export default function Page() {
  return (
    <ExamplePage
      meta={meta}
      fallbackHeight={340}
      notes={
        <>
          Hover a marker label for its date. Scroll vertically to keep labels below the calendar, or
          click the custom Review button. Markers stay fixed while tasks move. Offscreen custom
          components unmount and reset their local state.
        </>
      }
    >
      <TimelineElementsDemo />
    </ExamplePage>
  );
}
