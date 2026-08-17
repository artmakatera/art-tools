/**
 * Nav metadata only — no components, no dynamic imports.
 *
 * Each example is its own route directory (`app/examples/<slug>/`) rather than a
 * `[slug]` route: `next/dynamic` cannot take a template-literal path, and static
 * directories additionally give colocated `demo.module.css`, per-route CSS
 * chunking, and freedom from Next's generated `PageProps` types (which would
 * couple a bare `tsc --noEmit` to a prior `next typegen`).
 *
 * Keep this list in sync with the directories under `app/examples/`.
 */

export type ExampleGroup = "Core" | "Customization" | "Interaction" | "Scale & SSR";

export interface ExampleMeta {
  slug: string;
  title: string;
  blurb: string;
  group: ExampleGroup;
}

export const EXAMPLES: ExampleMeta[] = [
  {
    slug: "basic",
    title: "Basic chart",
    blurb: "The smallest thing that renders: a task array and a height.",
    group: "Core",
  },
  {
    slug: "read-only",
    title: "Read-only chart",
    blurb:
      "One prop removes every editing affordance: no bar drag or resize, no progress or connector handles, no actions column.",
    group: "Core",
  },
  {
    slug: "custom-columns",
    title: "Custom columns",
    blurb: "Define the task-list columns yourself, including a render-prop action column.",
    group: "Core",
  },
  {
    slug: "hierarchy",
    title: "Hierarchy & bar types",
    blurb: "Parent/child nesting with summary, milestone, and task bars.",
    group: "Core",
  },
  {
    slug: "dependencies",
    title: "Dependencies",
    blurb: "All four link types, lag, and the cascading reschedule that follows a move.",
    group: "Core",
  },
  {
    slug: "working-time",
    title: "Working time",
    blurb: "Weekends, holidays and business hours that the scheduler, drag and cascade all honour.",
    group: "Core",
  },
  {
    slug: "composable",
    title: "Composable API",
    blurb: "Assemble GanttProvider, TaskList and GanttGrid yourself for full layout control.",
    group: "Core",
  },
  {
    slug: "slots",
    title: "Slots & slotProps",
    blurb: "Swap or restyle any internal element, driven by its ownerState.",
    group: "Customization",
  },
  {
    slug: "theming-css-variables",
    title: "Theming with CSS variables",
    blurb: "Retheme the whole chart through --am-gantt-* custom properties, including dark mode.",
    group: "Customization",
  },
  {
    slug: "theming-css-modules",
    title: "Theming with CSS Modules",
    blurb: "Scope the same tokens to one instance with a colocated CSS Module.",
    group: "Customization",
  },
  {
    slug: "custom-zoom",
    title: "Custom zoom ladder",
    blurb: "Define your own zoom rungs, each with its own scales and column width.",
    group: "Customization",
  },
  {
    slug: "imperative-api",
    title: "Imperative API",
    blurb: "Drive the chart from outside via apiRef: create, update, undo, redo, scroll, zoom.",
    group: "Interaction",
  },
  {
    slug: "task-editing",
    title: "Editing tasks",
    blurb: "Wire onTaskEdit to your own dialog and commit a minimal TaskPatch.",
    group: "Interaction",
  },
  {
    slug: "virtualization",
    title: "100,000 tasks",
    blurb: "Both axes are windowed, so the row count barely affects render cost.",
    group: "Scale & SSR",
  },
  {
    slug: "nextjs-ssr",
    title: "Using it with Next.js",
    blurb: "Why the chart must be client-only, and what breaks if it isn't.",
    group: "Scale & SSR",
  },
];

export const EXAMPLE_GROUPS: ExampleGroup[] = [
  "Core",
  "Customization",
  "Interaction",
  "Scale & SSR",
];

export function getExample(slug: string): ExampleMeta {
  const found = EXAMPLES.find((e) => e.slug === slug);
  if (!found) {
    throw new Error(`Unknown example slug: ${slug}`);
  }
  return found;
}
