import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseApiDeclarations, type ApiDeclaration } from "./api-declarations";
import { API_SECTIONS, apiSectionForSymbol } from "./api";

let declarations: Promise<ApiDeclaration[]> | undefined;

/**
 * Like readDemoSource, this runs only while prerendering. Both pnpm dev and
 * Turbo's docs build build the library first. Keep callers static so deploying
 * the generated site never requires the source checkout or TypeScript parser.
 */
export function readApi(): Promise<ApiDeclaration[]> {
  declarations ??= readFile(
    path.resolve(process.cwd(), "../../packages/react-gantt/dist/index.d.ts"),
    "utf8",
  ).then((source) => {
    const entries = parseApiDeclarations(source);
    const names = new Set(entries.map((entry) => entry.name));
    for (const section of API_SECTIONS) {
      for (const name of section.symbols) {
        if (!names.has(name)) {
          throw new Error(`API reference lists a missing export: ${name}`);
        }
      }
    }
    for (const entry of entries) {
      if (!apiSectionForSymbol(entry.name)) {
        throw new Error(`Assign the public export ${entry.name} to an API section.`);
      }
    }
    return entries;
  });
  return declarations;
}
