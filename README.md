# Ohtools

Ohtools is a Bun-first TypeScript framework for defining AI-operable tools,
organizing them into explorable hierarchies, and exposing them through adapters
such as MCP and CLI.

```ts
import { Ohtools, jsonSchema } from "ohtools";

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

Run locally with Bun:

```sh
bun install
bun test
bun run validate
```

Ohtools v1 supports Bun only. Node, Deno, browser, HTTP, SSE, and streamable HTTP
transports are intentionally outside the v1 scope.
