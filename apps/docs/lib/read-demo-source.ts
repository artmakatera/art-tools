import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Read a demo's own source so the page can display exactly what it runs.
 *
 * `process.cwd()` is `apps/docs` under `next dev`, `next build` and
 * `next start` — turbo runs the script there and Next does not chdir. Do **not**
 * use `import.meta.dirname`/`__dirname`: both bundlers rewrite those to the
 * emitted chunk's location under `.next/server/…`, not the source tree.
 *
 * This is a build-time-only capability. Under `output: "standalone"` the
 * generated server does `process.chdir(__dirname)`, and `app/**\/demo.tsx` is
 * never traced into the bundle (the path is computed, so nft cannot see it).
 * Every caller therefore sets `export const dynamic = "error"`, which turns a
 * stray runtime render into a build failure instead of a 500 in production.
 */
export function readDemoSource(slug: string, file = "demo.tsx"): Promise<string> {
  return readFile(path.join(process.cwd(), "app", "examples", slug, file), "utf8");
}
