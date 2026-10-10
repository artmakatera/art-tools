// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { API_SECTIONS, apiSectionForSymbol, getApiSection } from "@/lib/api";
import { API_CONTENT } from "@/lib/api-content";
import { parseApiDeclarations } from "@/lib/api-declarations";
import { EXAMPLES } from "@/lib/examples";

const library = new URL("../../../packages/react-gantt/", import.meta.url);
const source = readFileSync(new URL("dist/index.d.ts", library), "utf8");
const declarations = parseApiDeclarations(source);

describe("API reference", () => {
  it("documents exactly the public entry point, with one section per export", () => {
    const entry = ts.createSourceFile(
      "index.ts",
      readFileSync(new URL("src/index.ts", library), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const exports = entry.statements.flatMap((statement) =>
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
        ? statement.exportClause.elements.map((element) => element.name.text)
        : [],
    );
    expect(declarations.map(({ name }) => name).toSorted()).toEqual(exports.toSorted());
    expect(new Set(API_SECTIONS.map(({ slug }) => slug)).size).toBe(API_SECTIONS.length);
    for (const declaration of declarations) {
      expect(apiSectionForSymbol(declaration.name), declaration.name).toBeDefined();
    }
    const listed = API_SECTIONS.flatMap((section) => section.symbols);
    expect(new Set(listed).size).toBe(listed.length);
    for (const symbol of listed) {
      expect(exports, symbol).toContain(symbol);
    }
    for (const section of API_SECTIONS) {
      expect(API_CONTENT[section.slug], section.slug).toBeDefined();
      for (const slug of API_CONTENT[section.slug]!.examples) {
        expect(
          EXAMPLES.some((example) => example.slug === slug),
          slug,
        ).toBe(true);
      }
    }
    expect(getApiSection("missing")).toBeUndefined();
    expect(apiSectionForSymbol("PrivateImplementation")).toBeUndefined();
  });

  it("includes inherited properties and preserves requiredness and callback signatures", () => {
    const props = declarations.find(({ name }) => name === "GanttProps")!;
    expect(props.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "tasks", type: "GanttTask[]", optional: false }),
        expect.objectContaining({ name: "height", type: "number", optional: true }),
        expect.objectContaining({ name: "columns", type: "ColumnDef[]", optional: true }),
        expect.objectContaining({ name: "onTasksChange", type: "(tasks: GanttTask[]) => void" }),
      ]),
    );
    expect(props.members.find(({ name }) => name === "height")?.description).toContain(
      "omit to grow with content",
    );
    expect(declarations.find(({ name }) => name === "GanttProviderProps")?.members).toContainEqual(
      expect.objectContaining({ name: "children", optional: false }),
    );
    expect(declarations.find(({ name }) => name === "ColumnApi")?.members).toContainEqual(
      expect.objectContaining({ name: "revealTask" }),
    );
    expect(declarations.find(({ name }) => name === "TaskDependency")?.members).toHaveLength(4);
  });

  it("shows supporting types without advertising them as exports", () => {
    const grid = declarations.find(({ name }) => name === "GanttGrid")!;
    expect(grid.code).toContain("props?: GanttGridProps");
    expect(grid.code).not.toContain("slotsProp");
    expect(grid.supportingCode).toContain("interface GanttGridProps");
    expect(declarations.some(({ name }) => name === "GanttGridProps")).toBe(false);
    expect(declarations.find(({ name }) => name === "GanttTask")?.supportingCode).toContain(
      '"milestone"',
    );
    expect(declarations.find(({ name }) => name === "GanttEngineProps")?.code).not.toContain(
      "default_2",
    );
  });

  it("type-checks every usage example against the package", () => {
    const options: ts.CompilerOptions = {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      skipLibCheck: true,
      noEmit: true,
    };
    const files = new Map(
      API_SECTIONS.map((section) => [
        fileURLToPath(new URL(`../api-example-${section.slug}.tsx`, import.meta.url)),
        API_CONTENT[section.slug]!.code,
      ]),
    );
    const host = ts.createCompilerHost(options);
    const originalGetSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
      const code = files.get(fileName);
      if (code !== undefined) {
        return ts.createSourceFile(fileName, code, languageVersion, true, ts.ScriptKind.TSX);
      }
      return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
    };
    const program = ts.createProgram([...files.keys()], options, host);
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .map(
        (diagnostic) =>
          `${diagnostic.file?.fileName}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`,
      );
    expect(diagnostics).toEqual([]);
  }, 15000);
});
