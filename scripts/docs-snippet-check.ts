import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { $ } from "bun";

const root = process.cwd();
const pagesRoot = join(root, "apps/docs/src/pages");
const snippets = walk(pagesRoot)
  .filter((path) => path.endsWith(".mdx"))
  .flatMap((path) => extractTypeScriptSnippets(path));

const failures = snippets
  .flatMap((snippet) => unsupportedImports(snippet))
  .map((failure) => `${failure.source}: ${failure.message}`);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

if (snippets.length === 0) {
  console.log("docs:snippets passed (0 TypeScript snippets)");
  process.exit(0);
}

const tempRoot = mkdtempSync(join(tmpdir(), "ohtools-docs-snippets-"));
try {
  const srcDir = join(tempRoot, "src");
  mkdirSync(srcDir);
  snippets.forEach((snippet, index) => {
    writeFileSync(
      join(srcDir, `snippet-${index + 1}.ts`),
      `// ${snippet.source}\n${snippet.code}\n`,
    );
  });
  writeFileSync(
    join(tempRoot, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          skipLibCheck: true,
          typeRoots: [`${root}/node_modules/@types`],
          types: ["bun"],
          baseUrl: root,
          paths: {
            effect: ["node_modules/effect/dist/dts/index.d.ts"],
            "@bosun-sh/ohtools": ["packages/ohtools/src/index.ts"],
            "@bosun-sh/ohtools/schemas": ["packages/ohtools/src/schemas.ts"],
            "@bosun-sh/ohtools/adapters/mcp": ["packages/ohtools/src/adapters/mcp.ts"],
            "@bosun-sh/ohtools/adapters/cli": ["packages/ohtools/src/adapters/cli.ts"],
          },
          noEmit: true,
        },
        include: ["src/**/*.ts"],
      },
      null,
      2,
    ),
  );
  await $`bunx tsc -p ${tempRoot}/tsconfig.json --noEmit`;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log(`docs:snippets passed (${snippets.length} TypeScript snippets)`);

interface Snippet {
  source: string;
  code: string;
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function extractTypeScriptSnippets(path: string): Snippet[] {
  const text = readFileSync(path, "utf8");
  const snippets: Snippet[] = [];
  let index = 0;
  for (const match of text.matchAll(/```(ts|typescript|tsx)(?:[ \t]+[^\n]*)?\n([\s\S]*?)```/g)) {
    index += 1;
    const code = match[2].trim();
    if (match[0].includes("docs-snippet: skip")) continue;
    snippets.push({
      source: `${display(path)} code fence ${index}`,
      code,
    });
  }
  return snippets;
}

function unsupportedImports(snippet: Snippet) {
  return [...snippet.code.matchAll(/\bfrom\s+["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter(
      (specifier) => specifier.startsWith("@bosun-sh/ohtools/") && !allowedOhtoolsExport(specifier),
    )
    .map((specifier) => ({
      source: snippet.source,
      message: `imports non-public package path ${specifier}`,
    }));
}

function allowedOhtoolsExport(specifier: string) {
  return [
    "@bosun-sh/ohtools/adapters/mcp",
    "@bosun-sh/ohtools/adapters/cli",
    "@bosun-sh/ohtools/schemas",
  ].includes(specifier);
}

function display(path: string) {
  return relative(root, path).split(sep).join("/");
}
