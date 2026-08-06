import "server-only";

import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

export type HighlightLang = "tsx" | "css";

let highlighter: Promise<HighlighterCore> | undefined;

function getHighlighter(): Promise<HighlighterCore> {
  // Cached across the whole build: with every page prerendered this runs once
  // per language set, not once per page.
  highlighter ??= createHighlighterCore({
    langs: [import("@shikijs/langs/tsx"), import("@shikijs/langs/css")],
    themes: [
      import("@shikijs/themes/github-light-default"),
      import("@shikijs/themes/github-dark-default"),
    ],
    // The JS RegExp engine keeps Shiki's wasm binary out of the module graph —
    // it is the asset most likely to go missing under output file tracing.
    engine: createJavaScriptRegexEngine(),
  });
  return highlighter;
}

/**
 * Server-side syntax highlighting. Emits both themes as CSS variables so dark
 * mode is pure CSS, costing the visitor zero JavaScript.
 */
export async function highlight(code: string, lang: HighlightLang): Promise<string> {
  const shiki = await getHighlighter();
  return shiki.codeToHtml(code.trimEnd(), {
    lang,
    themes: { light: "github-light-default", dark: "github-dark-default" },
    defaultColor: false,
    cssVariablePrefix: "--shiki-",
  });
}
