# CLI And MCP Adapters

CLI commands use the app entry path:

```sh
bunx ohtools --app ./src/ohtools.ts list
bunx ohtools --app ./src/ohtools.ts explore hello
bunx ohtools --app ./src/ohtools.ts run hello --input '{"name":"Ada"}'
bunx ohtools --app ./src/ohtools.ts graph
bunx ohtools --app ./src/ohtools.ts docs
```

Add MCP support by composing `mcpAdapter()` into the app:

```ts
import { Ohtools } from "@bosun-sh/ohtools";
import { mcpAdapter } from "@bosun-sh/ohtools/adapters/mcp";

export default new Ohtools().tool(hello).adapter(mcpAdapter());
```

Use stdio only in a process intended to serve MCP:

```ts
mcpAdapter({ stdio: true })
```

Adapter code should translate registry and runtime behavior without changing
tool semantics. Keep validation and handler errors normalized as Ohtools errors.
