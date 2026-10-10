// @vitest-environment node
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EXAMPLES, EXAMPLE_GROUPS } from "@/lib/examples";

const examplesDirectory = new URL("../app/examples/", import.meta.url);

describe("example registry", () => {
  it("has unique slugs and declared groups", () => {
    expect(new Set(EXAMPLES.map(({ slug }) => slug)).size).toBe(EXAMPLES.length);
    for (const example of EXAMPLES) {
      expect(EXAMPLE_GROUPS).toContain(example.group);
    }
  });

  it("provides a page and demo for every entry", () => {
    for (const { slug } of EXAMPLES) {
      for (const file of ["page.tsx", "demo.tsx"]) {
        const path = fileURLToPath(new URL(`${slug}/${file}`, examplesDirectory));
        expect(existsSync(path), path).toBe(true);
      }
    }
  });

  it("lists every example route exactly once", () => {
    const routes = readdirSync(examplesDirectory, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() && existsSync(new URL(`${entry.name}/page.tsx`, examplesDirectory)),
      )
      .map((entry) => entry.name);
    expect(EXAMPLES.map(({ slug }) => slug).toSorted()).toEqual(routes.toSorted());
  });
});
