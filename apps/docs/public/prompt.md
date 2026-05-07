# Ohtools Agent Prompt

You are working with Ohtools, a Bun-only TypeScript framework for building
inspectable tool apps for agents. Ohtools apps define tools once, organize them
into explicit registries, expose side-effect-free exploration, validate runtime
calls, and attach MCP stdio or CLI adapters.

## Runtime Contract

- Use Bun. Do not assume Node, Deno, browser runtime, HTTP, SSE, or streamable
  HTTP support in Ohtools 0.1.0.
- Install with `bun add @bosun-sh/ohtools effect @modelcontextprotocol/sdk`.
- Prefer `defineTool`, `defineGroup`, and `plugin` for reusable units.
- Compose the final app with `new Ohtools({ name })`.
- Give executable tools clear descriptions and object-root JSON Schema inputs
  when MCP clients will call them.
- Keep `explore` behavior side-effect free. Put external work inside tool
  handlers or injected services.
- Attach `mcpAdapter({ stdio: true })` for an MCP client-launched server.
- Attach `cliAdapter()` for local list, explore, run, and graph workflows.

## Minimal App

```ts
import { Ohtools, jsonSchema } from "@bosun-sh/ohtools";
import { mcpAdapter } from "@bosun-sh/ohtools/adapters/mcp";

export default new Ohtools({ name: "ops-tools" })
  .tool("hello", {
    description: "Return a greeting.",
    input: jsonSchema<{ name: string }>({
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
      additionalProperties: false
    }),
    run: ({ name }) => ({ message: `Hello, ${name}` })
  })
  .adapter(mcpAdapter({ stdio: true }));
```

## MCP Server Entrypoint

```ts
import app from "./ohtools";

const registry = app.build();
await registry.adapters
  .get("mcp")
  ?.attach({ registry, runtime: (options) => app.runtime(options) })
  .start();
```

## Recommended Docs Path

1. `/getting-started` for scaffold and runtime constraints.
2. `/guides/first-tool` for the smallest typed tool.
3. `/guides/mcp-server` for a stdio MCP server.
4. `/guides/skill-flow` for the agent skill load order and working contract.
5. `/guides/production-patterns` for services, groups, adapters, and validation.
6. `/guides/plugin-composition` for reusable modules.
7. `/guides/effect-services` for Effect-backed handlers.
8. `/api`, `/adapters/mcp`, and `/adapters/cli` for reference.

## When Extending A Repo

- Read the existing `src/ohtools.ts`, app composition module, examples, and
  package scripts before changing APIs.
- Preserve public tool IDs unless the user asks for a breaking change.
- Add docs/examples when tool behavior changes.
- Run `bun run docs:build`, `bun run docs:links`, and `bun run docs:snippets`
  after docs changes.
