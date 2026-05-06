# Basic Example

This example shows the smallest useful Ohtools app that still includes schema validation, plugin composition, and an MCP adapter.

## Flow

1. `src/app.ts` creates a `greetings` plugin with `plugin("greetings")`.
2. The plugin registers a `hello` tool with a JSON Schema input.
3. The handler receives typed input from `jsonSchema<{ name: string }>()` and returns a greeting object.
4. The exported app composes the plugin into `new Ohtools()` and attaches `mcpAdapter()`.
5. `src/smoke.ts` exercises the runtime so the example can be checked automatically.

## What To Copy

Use this structure when you want a small app with one or more related tools that may later be reused as a plugin. Keep simple tools inline, add schemas when callers should get validation and typed handler input, and attach adapters at the app boundary.

## Try It

```sh
bun run --cwd examples/basic typecheck
bun run --cwd examples/basic smoke
```
