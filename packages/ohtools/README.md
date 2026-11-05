# Ohtools

Define tool registries with a fluent TypeScript API, explore them without side
effects, run them through an Effect runtime, and expose them through MCP or CLI.

Use the published
[`@bosun-sh/ohtools`](https://www.npmjs.com/package/@bosun-sh/ohtools)
package for npm-backed CLI, install, and version operations.

Create a new Bun TypeScript app:

```sh
npx @bosun-sh/ohtools create my-tools
cd my-tools
bun install
bun run ohtools:list
```

Or initialize an existing project:

```sh
npx @bosun-sh/ohtools init
```

Both commands install `.agents/skills/ohtools` so agents can discover Ohtools
project guidance locally.

Projects that do not already include the scaffolded skill can install the shared
skill registry entry:

```sh
npx skills add https://github.com/bosun-sh/skills --skill ohtools
```

```ts
import { Ohtools, jsonSchema } from "@bosun-sh/ohtools";

export default new Ohtools().tool("hello", {
  description: "Return a greeting.",
  input: jsonSchema<{ name: string }>({
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"]
  }),
  run: ({ name }) => ({ message: `Hello, ${name}` })
});
```

For modular apps, define tools once and compose hierarchy elsewhere:

```ts
import { Effect } from "effect";
import { Ohtools, defineGroup, defineTool, jsonSchema } from "@bosun-sh/ohtools";

const hello = defineTool({
  id: "people.hello",
  description: "Return a greeting.",
  input: jsonSchema<{ name: string }>({
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"]
  }),
  run: ({ name }) => ({ message: `Hello, ${name}` })
});

const people = defineGroup({ id: "people", description: "People tools." }, (group) =>
  group.tool(hello)
);

const runtime = new Ohtools().group(people).runtime();
const result = await Effect.runPromise(runtime.runTool(hello, { name: "Ada" }));

result.output.message;
```

## HTTP, REST, SSE, WebSockets, tRPC

`@bosun-sh/ohtools/adapters/http` serves the same tools to a dashboard frontend
and to agents. `POST /tools/:toolId` runs any tool; add `http: { method, path }`
to a tool for a REST route. `Accept: text/event-stream` streams progress,
`mcp: true` mounts MCP Streamable HTTP, and `websocket: true` (Bun) adds `/ws`.

```ts
import { httpHandler } from "@bosun-sh/ohtools/adapters/http";

Bun.serve({ port: 3000, fetch: httpHandler(app, { context: (req) => ({ userId: "u1" }) }) });
```

Errors are transport-neutral constants (`notFound`, `conflict`, `refine(...)`)
that map to HTTP statuses, CLI exit codes, and tRPC codes. A typed tRPC v11
router is available from `@bosun-sh/ohtools/adapters/trpc` (`@trpc/server` is an
optional peer). See `examples/http-dashboard` and the docs site.

