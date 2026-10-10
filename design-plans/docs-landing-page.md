# Introduce the library with a live chart on the docs homepage

Written against: `246ced9fe64a8bac5fbe7e19fc0818afb480f48d`
Date: 2026-10-08
Status: implemented in apps/docs/app/page.tsx on 2026-10-08; verification limitations recorded below.

## Evidence chain

- Surface: `/` in `apps/docs`.
- Problem: the user explicitly requested a landing page on the main route. The current `apps/docs/app/page.tsx:8` renders a narrow introduction, install instructions and grouped example links. This is a new composition request, not a claim that the existing directory violates a design contract.
- Design evidence: `apps/docs/app/globals.css:13` establishes the cascade and `:26` establishes fonts. The current homepage at `:9`, `:17` and `:30` supplies introduction, install and catalog content. `apps/docs/components/demo-shell.tsx:26` supplies the wider example-page container and `:38` supplies the live-chart panel treatment. These are reusable exemplars rather than mandatory universal style rules.
- Owner: `apps/docs/app/page.tsx`; root layout supplies global styling. The examples layout applies only below `/examples` and does not wrap `/`.
- Scope and affected surfaces: directly `/`; verify linked example routes and the reused BasicDemo on `/examples/basic`. Existing example layouts remain independently owned.
- Uncertainty: no browser evidence was collected. Proposed hierarchy and responsive layout require rendered review. No specific branding, conversion target or new theme was requested.

## Design decision

Replace the directory-first composition with an introduction, live preview, installation and complete example catalog, in that order. Retain the existing slate palette, system typography, light/dark treatments and bordered panel style. The real chart demonstrates the product without inventing marketing statistics or drawing a fake schedule.

Proposed structure:

1. Compact product navigation: package name linking to `/`, `Examples` linking to `#examples`, and `Install` linking to `#install`.
2. Introductory header: heading `A composable Gantt chart for React.` Supporting text: `Build scheduling interfaces with task hierarchies, dependencies, working-time calendars, and a chart you can customize.` Links: `Try the basic chart` → `/examples/basic`; `Browse examples` → `#examples`.
3. Live preview labeled `Live chart`, followed by `View this example and its source` → `/examples/basic`.
4. Install instructions with the existing package command and stylesheet import.
5. `Explore the examples` catalog, retaining every group and entry from the existing metadata.

These section choices and copy are a proposal for the user's requested addition, not findings derived from an existing design rule. Feature claims are supported by the corresponding entries in `apps/docs/lib/examples.ts`; no benchmark claims, customer logos, pricing, or version badges are added.

## Reuse

- `BasicDemo` from `apps/docs/app/examples/basic/demo.tsx`: already renders the actual Gantt with `mockTasks` and height 420. Reuse the component unchanged; do not fork the fixture or create a second chart implementation.
- `ClientOnly` from `apps/docs/components/client-only.tsx`: preserve its locale/date-geometry hydration protection. Use the same 420px skeleton and `animate-pulse bg-slate-100 dark:bg-slate-800` treatment as ExamplePage.
- `EXAMPLES` and `EXAMPLE_GROUPS` from `apps/docs/lib/examples.ts`: one content owner for navigation and the homepage catalog.
- `Link` from `next/link`: existing internal navigation primitive.
- Existing Tailwind utilities and theme values: `max-w-5xl`, `px-6`, `py-16`, `gap-10` for the page; `text-3xl font-semibold tracking-tight` for the primary heading; `text-slate-600 dark:text-slate-400` for supporting text. Reuse homepage link-panel padding, borders and hover states for the intro links and catalog cards.
- Exemplar: `DemoShell` live panel uses `overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900`. Reuse that treatment around the preview, not the entire DemoShell, whose article heading/source contract belongs to example pages.
- Global typography, chart stylesheet and CSS layers remain owned by `app/globals.css` and loaded once by `app/layout.tsx`.

No new shared primitive is necessary. Compose the landing page locally; repetition alone does not warrant changing DemoShell or introducing a new button/card design system.

## Changes

1. `apps/docs/app/page.tsx`
   - Change: compose the five sections above within a `max-w-5xl` page container, preserving the existing `px-6 py-16` spacing and `gap-10` rhythm. Use the existing heading scale instead of a new oversized display type system. Header links wrap on narrow screens; the preview occupies its own full-width row.
   - Change: place BasicDemo inside ClientOnly with a matching 420px skeleton and the existing live-panel treatment. Include a visible link to the basic example immediately below it; that route continues to display the exact demo source. Keep the new navigation separate from the examples sidebar.
   - Change: give the install section `id="install"` and wrap all grouped catalog sections under `id="examples"`. Retain the exact package command and stylesheet import. Keep commands in horizontally scrollable mono panels.
   - Change: retain group order, entry titles, blurbs, destinations and dark/hover classes from current EXAMPLES rendering. Use `grid grid-cols-1 gap-2 md:grid-cols-2` within each group as the proposed catalog presentation; long text wraps and cards use `min-w-0`.
   - Change: replace the old introduction with the proposed header text. The live-preview link says where source is available, rather than implying source is displayed under homepage links.
   - Preserve: `export const dynamic = "error"`, server-page composition, static content, the package identity, all existing example destinations, and the existing stylesheet import convention. Do not add a page-wide client boundary.
   - Verify: the preview is a working chart after hydration, the initial placeholder has the same height, install and catalog anchors land on the correct sections, and all catalog links retain their current routes.

2. Existing reusable owners, consumed without editing
   - Preserve: BasicDemo, ClientOnly, ExamplePage, DemoShell, Nav, EXAMPLES, sample fixture, globals and root/examples layouts.
   - Verify: `/examples/basic` still shows the same chart and exact source; other example pages inherit no incidental homepage styling.

## Scope

- Inherit: visitors to `/` see the new composition; shared components do not receive new default styling.
- Verify: `/`, `/examples/basic`, `/examples/timeline-elements`, `/examples/theming-css-modules` and `/examples/virtualization` as representative linked surfaces and light/dark/source variants.
- Exclude: library geometry and interaction changes, new features or exports, dependency updates, publishing/version changes, the playground, example-source restructuring, shared navigation redesign, new theme controls, analytics and search. No new design-document changes have been accepted.

## Validation

- Product: a visitor can identify the library, view its real chart, find installation instructions, open the basic example with source, and browse the full catalog.
- Interface: inspect the implemented page at 375, 768 and 1440px viewport widths; also inspect the existing `.dark` state. These widths are review cases, not new CSS breakpoint tokens. Check long catalog text, wrapped header links, the initial skeleton and hydrated chart. Confirm no document-wide horizontal overflow; source and chart scrolling stay within their existing containers. The narrow chart may retain its existing internal scroll behavior.
- System: use the imported example metadata and current primitives; no duplicated example catalog, second stylesheet import, new font download, global palette override, or new dependency. Do not claim inherited chart theming changes merely because the surrounding page has dark styles.
- Repository: before editing, read AGENTS.md and current local handoff state and run `./init.sh` as a baseline. After implementation, `./init.sh` must pass before completion is claimed. Run `git diff --check` for patch hygiene. Run `pnpm dev` to respect the required library-before-app build sequence for rendered checks. Tests should target any introduced behavior, not mirror static markup.
- Current verification: audit only; none of those implementation checks has been run for this plan. Prior handoff notes report a docs Turbopack worker-port restriction. If reproduced, record the actual output and report the gate as blocked; an alternative webpack build does not replace it.

## Stop conditions

- Stop if BasicDemo, ClientOnly, metadata ownership or the governing CSS layers differ from this evidence; retrace them before implementation.
- Stop if the landing preview requires changing library behavior or mutating the shared sample data.
- Stop if fulfilling a requested design direction requires a new palette, new shared component system, or shared example-shell redesign; those choices are outside this scoped plan.
- Do not invent a passing verification result when the gate or rendered validation is unavailable.

## Design documentation

- After acceptance and validation: none. The page composition is not a library behavior decision and introduces no domain term requiring an ADR or glossary change. If the user later accepts an app-wide design contract, document that separately under its agreed owner.

## Implementation verification

- Reused BasicDemo and ClientOnly unchanged; homepage is still a static server page.
- All example entries and group ordering come from the existing metadata.
- 587 tests / 53 files, type checks, lint (6 existing warnings), formatting and library build pass.
- Required ./init.sh reproduces the baseline docs Turbopack worker-port restriction.
- No browser is connected, so viewport and dark-state visual review remains unverified.
- Separate webpack docs build passes all 23 static pages. Generated HTML contains all 20 example destinations, install/examples anchors and the expected heading; every linked example page was generated. This does not replace browser review or the required gate.
