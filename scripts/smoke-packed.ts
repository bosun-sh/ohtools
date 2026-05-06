import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

await $`bun run --cwd packages/ohtools build`;
const cache = mkdtempSync(join("/private/tmp", "ohtools-npm-cache-"));
const output = await $`npm --cache ${cache} pack`.cwd("packages/ohtools").text();
const tarball = join(process.cwd(), "packages/ohtools", output.trim().split("\n").at(-1)!);
const dir = mkdtempSync(join("/private/tmp", "ohtools-smoke-"));
writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }, null, 2));
writeFileSync(
  join(dir, "smoke.ts"),
  `import { Effect } from "effect";
import { Ohtools, jsonSchema } from "ohtools";
const app = new Ohtools().tool("hello", {
  description: "Return a greeting.",
  input: jsonSchema({ type: "object", properties: { name: { type: "string" } }, required: ["name"] }),
  run: ({ name }) => ({ message: "Hello, " + name })
});
const runtime = app.runtime();
console.log((await Effect.runPromise(runtime.explore({ nodeId: "hello" }))).node.id);
console.log((await Effect.runPromise(runtime.run({ toolId: "hello", input: { name: "Ada" } }))).output.message);
`,
);
const modules = join(dir, "node_modules");
mkdirSync(join(modules, "ohtools"), { recursive: true });
mkdirSync(join(modules, "@modelcontextprotocol"), { recursive: true });
await $`tar -xzf ${tarball} -C ${join(modules, "ohtools")} --strip-components 1`;
symlinkSync(join(process.cwd(), "node_modules/effect"), join(modules, "effect"), "dir");
symlinkSync(
  join(process.cwd(), "node_modules/@modelcontextprotocol/sdk"),
  join(modules, "@modelcontextprotocol/sdk"),
  "dir",
);
await $`env TMPDIR=/private/tmp bun smoke.ts`.cwd(dir);
console.log("smoke:packed passed");
