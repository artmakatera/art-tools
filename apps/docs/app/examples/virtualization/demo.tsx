"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Gantt } from "@am/react-gantt";
import { generateMockData } from "@am/mock-data/generator";

const SIZES = [1_000, 10_000, 100_000];

/**
 * Rows AND columns are windowed, so cost tracks the viewport, not the dataset.
 *
 * Generate in the browser, inside useMemo — never in a Server Component. A
 * 100k-task array built on the server would be serialized into the RSC flight
 * payload and shipped over the wire as hundreds of megabytes of Date objects.
 *
 * The memo also matters for correctness, not just speed: `<Gantt>` treats
 * `tasks` as an identity-stable seed for its change log, so regenerating the
 * array on every render would throw away the user's edits.
 *
 * Switching size is deferred. Generating 100k tasks (~250ms) and preparing them
 * for the chart (~150ms) is uninterruptible main-thread work, so `count` drives
 * the radios at urgent priority while `deferredCount` drives the data: React
 * paints the new selection immediately, then re-renders the chart at transition
 * priority with the previous one still on screen and interactive. This does not
 * make the work shorter — it stops it from blocking the response to the click.
 */
export function VirtualizationDemo() {
  const [count, setCount] = useState(10_000);
  const deferredCount = useDeferredValue(count);
  const isStale = deferredCount !== count;

  const { tasks, dependencies } = useMemo(
    () => generateMockData(deferredCount, { seed: 1, yearsRange: [2023, 2025] }),
    [deferredCount],
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>
        <span style={{ fontSize: 13 }}>Dataset:</span>
        {SIZES.map((size) => (
          <label key={size} style={{ fontSize: 13, display: "inline-flex", gap: 4, alignItems: "center" }}>
            <input
              type="radio"
              name="size"
              checked={count === size}
              onChange={() => setCount(size)}
            />
            {size.toLocaleString()}
          </label>
        ))}
        <span style={{ fontSize: 12, color: "#475569" }} aria-live="polite">
          {isStale
            ? `generating ${count.toLocaleString()} tasks…`
            : `${tasks.length.toLocaleString()} tasks · ${dependencies.length.toLocaleString()} links`}
        </span>
      </div>
      <div style={{ opacity: isStale ? 0.6 : 1, transition: "opacity 120ms linear" }}>
        <Gantt tasks={tasks} dependencies={dependencies} rowHeight={32} height={480} zoomWheel />
      </div>
    </div>
  );
}
