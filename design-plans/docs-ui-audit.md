# Docs entry and example browsing audit

Written against: `246ced9fe64a8bac5fbe7e19fc0818afb480f48d`
Date: 2026-10-08
Method: source inspection only. No rendered evidence was supplied or requested. Product source was not modified.

## Design language

- Audited surface: `apps/docs`, specifically `/` and the shared `/examples/*` browsing and demo presentation. Other applications and library-internal visuals are excluded.
- Design sources: `apps/docs/app/layout.tsx` imports `globals.css`; that stylesheet supplies system sans/mono fonts, white/slate surfaces and class-based dark variants. `app/page.tsx`, `components/nav.tsx` and `components/demo-shell.tsx` provide current compositions, not a separately documented mandatory design standard. No governing DESIGN.md was found.
- Documented decisions: preserve the CSS cascade order in `globals.css`; `ClientOnly` documents why charts wait for hydration; `ExamplePage` and `DemoShell` document live-example/source correspondence. These govern rendering and composition preservation, not a mandate for a particular landing-page hierarchy.
- Governing owners and consumers: root layout → globals → homepage; example layout → Nav → EXAMPLES/EXAMPLE_GROUPS; individual example page → ExamplePage → ClientOnly and DemoShell → chart and highlighted source. BasicDemo → Gantt and the shared sample fixture. The homepage and Nav use the same example metadata. Dark styling is class-based; the source does not establish an automatic dark-mode preference or theme-toggle requirement.
- Explicit exceptions: None documented.

## Findings

No supported findings were found.

The review checked homepage labels against its linked destinations; navigation active/inactive styles; the hidden-below-md sidebar branch; light/dark styles; the demo/source panels; and basic versus shared example compositions. These do not establish a deterministic UI correction under the evidence rules. In particular, the absence of mobile navigation cannot alone establish the intended replacement, and homepage width versus example width is not a proven inconsistency. Source alone cannot substantiate claims that the pages look sparse, lack hierarchy, or have poor density.

## Improve first

No supported recommendation.

## User-requested addition

The user separately requested a landing page on the main route. That is authorized new design scope, not an audit defect. Its implementation proposal is in `design-plans/docs-landing-page.md`. Broader shared-shell restyling has no selected, evidence-backed change and is not included.

## Verification boundary

Only files in design-plans/ were written. No dependency installation, formatter, build, or product UI inspection was run. The repository gate installs dependencies and creates build artifacts, so it is deferred to the implementation phase under this read-only skill. Earlier local handoff notes mention a Turbopack worker-port restriction; that is historical context, not a fresh verification result for this audit.
