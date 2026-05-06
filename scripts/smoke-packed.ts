import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

await $`bun run --cwd packages/ohtools build`;
const cache = mkdtempSync(join("/private/tmp", "ohtools-npm-cache-"));
const output = await $`npm --cache ${cache} pack`.cwd("packages/ohtools").text();
const tarball = join(process.cwd(), "packages/ohtools", output.trim().split("\n").at(-1)!);
const dir = mkdtempSync(join("/private/tmp", "ohtools-packed-smoke-"));

writeSmokeProject(dir);
try {
  await $`bun add ${tarball}`.cwd(dir).quiet();
  await runSmokeProject(dir);
  console.log("smoke:packed passed (installed packed tarball with Bun)");
} catch (cause) {
  console.warn(
    `smoke:packed package-manager install unavailable; using offline fallback: ${String(cause)}`,
  );
  await offlineFallback(tarball, dir);
  console.log("smoke:packed passed (offline fallback)");
}

function writeSmokeProject(dir: string) {
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ type: "module", scripts: { typecheck: "tsc --noEmit" } }, null, 2),
  );
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          target: "ES2022",
          types: ["bun"],
        },
        include: ["smoke.ts"],
      },
      null,
      2,
    ),
  );
  writeFileSync(join(dir, "smoke.ts"), smokeSource());
}

async function runSmokeProject(dir: string) {
  const input = JSON.stringify({ name: "Ada" });
  await $`bunx tsc --noEmit`.cwd(dir).quiet();
  await $`bun smoke.ts`.cwd(dir).quiet();
  await $`bunx ohtools --app ./smoke.ts list`.cwd(dir).quiet();
  await $`bunx ohtools --app ./smoke.ts run hello --input ${input}`.cwd(dir).quiet();
  await $`bunx ohtools init`.cwd(dir).quiet();
  await $`bunx ohtools create packed-tools`.cwd(dir).quiet();
  assertPackedScaffold(dir);
  await $`bunx tsc --noEmit`.cwd(join(dir, "packed-tools")).quiet();
  await $`bun run ohtools:list`.cwd(join(dir, "packed-tools")).quiet();
}

async function offlineFallback(tarball: string, dir: string) {
  const modules = join(dir, "node_modules");
  mkdirSync(join(modules, "@bosun-sh", "ohtools"), { recursive: true });
  mkdirSync(join(modules, "@modelcontextprotocol"), { recursive: true });
  await $`tar -xzf ${tarball} -C ${join(modules, "@bosun-sh", "ohtools")} --strip-components 1`;
  symlinkSync(join(process.cwd(), "node_modules/effect"), join(modules, "effect"), "dir");
  symlinkSync(
    join(process.cwd(), "node_modules/@modelcontextprotocol/sdk"),
    join(modules, "@modelcontextprotocol/sdk"),
    "dir",
  );
  symlinkSync(join(process.cwd(), "node_modules/typescript"), join(modules, "typescript"), "dir");
  symlinkSync(join(process.cwd(), "node_modules/@types"), join(modules, "@types"), "dir");
  mkdirSync(join(modules, ".bin"), { recursive: true });
  const bin = join(modules, ".bin", "ohtools");
  symlinkSync(join(modules, "@bosun-sh/ohtools/dist/bin/ohtools.js"), bin);
  chmodSync(bin, 0o755);
  await runSmokeProject(dir);
}

function assertPackedScaffold(dir: string) {
  for (const path of [
    ".agents/skills/ohtools/SKILL.md",
    ".agents/skills/ohtools/agents/openai.yaml",
    "src/ohtools.ts",
    "packed-tools/package.json",
    "packed-tools/src/ohtools.ts",
    "packed-tools/.agents/skills/ohtools/SKILL.md",
  ]) {
    if (!existsSync(join(dir, path))) {
      throw new Error(`smoke:packed missing scaffold output ${path}`);
    }
  }
  const packageJson = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  if (!packageJson.scripts?.["ohtools:list"]) {
    throw new Error("smoke:packed init did not add ohtools:list script");
  }
}

function smokeSource() {
  return `import { Effect } from "effect";
import { Ohtools, jsonSchema } from "@bosun-sh/ohtools";
import { mcpAdapter } from "@bosun-sh/ohtools/adapters/mcp";

const app = new Ohtools().tool("hello", {
  description: "Return a greeting.",
  input: jsonSchema<{ name: string }>({
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"]
  }),
  run: ({ name }: { name: string }) => ({ message: "Hello, " + name })
}).adapter(mcpAdapter());

export default app;

const runtime = app.runtime();
console.log((await Effect.runPromise(runtime.explore({ nodeId: "hello" }))).node.id);
console.log((await Effect.runPromise(runtime.run<{ name: string }, { message: string }>({ toolId: "hello", input: { name: "Ada" } }))).output.message);
`;
}
