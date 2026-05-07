import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";

const packageName = "@bosun-sh/ohtools@0.1.0";
const dir = mkdtempSync(join(tmpdir(), "ohtools-npm-smoke-"));

console.log(`smoke:npm installing ${packageName} in ${dir}`);
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
      include: ["app.ts"],
    },
    null,
    2,
  ),
);
writeFileSync(
  join(dir, "app.ts"),
  `import { Effect } from "effect";
import { Ohtools, jsonSchema } from "@bosun-sh/ohtools";
import { mcpAdapter, mcpResources } from "@bosun-sh/ohtools/adapters/mcp";

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
const explored = await Effect.runPromise(runtime.explore({ nodeId: "hello" }));
const result = await Effect.runPromise(runtime.run<{ name: string }, { message: string }>({
  toolId: "hello",
  input: { name: "Ada" }
}));
if (explored.node.id !== "hello" || result.output.message !== "Hello, Ada") {
  throw new Error("npm smoke runtime failed");
}
if (!mcpResources(app.build()).some((resource) => resource.uri === "ohtools://graph")) {
  throw new Error("npm smoke MCP resources failed");
}
`,
);

await $`bun add ${packageName}`.cwd(dir);
await $`bun add -d typescript @types/bun`.cwd(dir);
await $`bunx tsc --noEmit`.cwd(dir);
await $`bun app.ts`.cwd(dir);
await $`bunx ohtools --app ./app.ts explore hello`.cwd(dir);
await $`bunx ohtools --app ./app.ts run hello --input ${JSON.stringify({ name: "Ada" })}`.cwd(dir);
await $`bunx ohtools --app ./app.ts graph`.cwd(dir);

console.log("smoke:npm passed");
