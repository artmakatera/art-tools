import ts from "typescript";

export interface ApiMember {
  name: string;
  type: string;
  optional: boolean;
  description: string;
}

export interface ApiDeclaration {
  name: string;
  kind: "Component" | "Function" | "Type" | "Constant";
  description: string;
  code: string;
  members: ApiMember[];
  supportingCode: string;
}

type Declaration =
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.FunctionDeclaration
  | ts.VariableStatement;

// API Extractor renames React's default import in the bundle. Use its familiar
// namespace in the displayed signatures without changing the library artifact.
function clean(text: string): string {
  return text.replace(/\bdefault_\d+\b/g, "React").trim();
}

function documentation(node: ts.Node): string {
  return ts
    .getJSDocCommentsAndTags(node)
    .filter(ts.isJSDoc)
    .map((comment) => ts.getTextOfJSDocComment(comment.comment) ?? "")
    .join("\n\n")
    .replace(/\{@link ([^}]+)\}/g, "$1");
}

function declarationName(node: Declaration): string | undefined {
  if (ts.isVariableStatement(node)) {
    const first = node.declarationList.declarations[0];
    return first && ts.isIdentifier(first.name) ? first.name.text : undefined;
  }
  return node.name?.text;
}

/** Parse the published declaration surface, never implementation bodies. */
export function parseApiDeclarations(source: string): ApiDeclaration[] {
  const file = ts.createSourceFile("index.d.ts", source, ts.ScriptTarget.Latest, true);
  const nodes = new Map<string, Declaration>();
  const exported = new Set<string>();
  for (const statement of file.statements) {
    if (
      !ts.isInterfaceDeclaration(statement) &&
      !ts.isTypeAliasDeclaration(statement) &&
      !ts.isFunctionDeclaration(statement) &&
      !ts.isVariableStatement(statement)
    ) {
      continue;
    }
    const name = declarationName(statement);
    if (!name) {
      continue;
    }
    nodes.set(name, statement);
    if (statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      exported.add(name);
    }
  }

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const print = (node: Declaration): string => {
    if (!ts.isFunctionDeclaration(node)) {
      return clean(printer.printNode(ts.EmitHint.Unspecified, node, file));
    }
    // Destructuring aliases are implementation details. The parameter's type is
    // the public contract, and remains exactly the type from the declaration.
    const parameters = node.parameters.map((parameter, index) =>
      ts.isIdentifier(parameter.name)
        ? parameter
        : ts.factory.updateParameterDeclaration(
            parameter,
            parameter.modifiers,
            parameter.dotDotDotToken,
            ts.factory.createIdentifier(index === 0 ? "props" : `argument${index + 1}`),
            parameter.questionToken,
            parameter.type,
            parameter.initializer,
          ),
    );
    const signature = ts.factory.updateFunctionDeclaration(
      node,
      node.modifiers,
      node.asteriskToken,
      node.name,
      node.typeParameters,
      parameters,
      node.type,
      undefined,
    );
    return clean(printer.printNode(ts.EmitHint.Unspecified, signature, file));
  };

  function membersOf(node: Declaration, visited = new Set<string>()): ApiMember[] {
    const name = declarationName(node)!;
    if (visited.has(name)) {
      return [];
    }
    visited.add(name);
    const members = new Map<string, ApiMember>();
    if (ts.isInterfaceDeclaration(node)) {
      for (const clause of node.heritageClauses ?? []) {
        for (const parent of clause.types) {
          const inherited = nodes.get(parent.expression.getText(file));
          if (inherited) {
            for (const member of membersOf(inherited, visited)) {
              members.set(member.name, member);
            }
          }
        }
      }
    }
    const own = ts.isInterfaceDeclaration(node)
      ? node.members
      : ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)
        ? node.type.members
        : [];
    for (const member of own) {
      if (!ts.isPropertySignature(member)) {
        continue;
      }
      const memberName = member.name.getText(file);
      members.set(memberName, {
        name: memberName,
        type: clean(member.type?.getText(file) ?? "unknown"),
        optional: Boolean(member.questionToken),
        description: documentation(member),
      });
    }
    return [...members.values()];
  }

  function supportingTypes(node: Declaration): string {
    const found = new Set<string>();
    function visit(child: ts.Node) {
      if (ts.isTypeReferenceNode(child)) {
        const name = child.typeName.getText(file);
        const referenced = nodes.get(name);
        if (referenced && !exported.has(name) && !found.has(name)) {
          found.add(name);
          ts.forEachChild(referenced, visit);
        }
      }
      ts.forEachChild(child, visit);
    }
    visit(node);
    return [...found].map((name) => print(nodes.get(name)!)).join("\n\n");
  }

  return [...exported].map((name) => {
    const node = nodes.get(name)!;
    const kind = ts.isFunctionDeclaration(node)
      ? /^[A-Z]/.test(name)
        ? "Component"
        : "Function"
      : ts.isVariableStatement(node)
        ? name.startsWith("use")
          ? "Function"
          : "Constant"
        : "Type";
    return {
      name,
      kind,
      description: documentation(node),
      code: print(node),
      members: membersOf(node),
      supportingCode: supportingTypes(node),
    };
  });
}
