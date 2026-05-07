# MCP Stdio Example

This example shows how to start an Ohtools app as an MCP stdio server.

## Flow

1. `src/server.ts` creates an app with one `hello` tool.
2. `.adapter(mcpAdapter({ stdio: true }))` registers the MCP adapter in stdio mode.
3. The app is built into a registry.
4. The MCP adapter is fetched from the registry, attached to `{ registry, runtime }`, and started.

## What To Copy

Use this shape when another MCP client will launch your process over stdio. Keep tool definitions in the app, attach `mcpAdapter({ stdio: true })`, then start the adapter from your server entrypoint.

## Try It

```sh
bun run --cwd examples/mcp-stdio typecheck
bun examples/mcp-stdio/src/server.ts
```
