# Ohtools Starter Template

Bun and TypeScript starter for an Ohtools app with a typed tool, input/output schemas, next-step metadata, and the CLI adapter.

## Flow

1. `src/app.ts` creates `new Ohtools({ name: "starter" })`.
2. `.tool("hello", spec)` registers a simple runnable tool.
3. `input` and `output` use `jsonSchema<T>()` so the handler input and runtime output are typed and validated.
4. `next: []` shows where follow-up recommendations would be declared.
5. `.adapter(cliAdapter())` attaches CLI support for local use.

## What To Copy

Use this as a starting point for a new app. Add more fluent `.tool(...)` calls for simple projects, or move to `defineTool` and `defineGroup` when tools need to live in separate files.

## Try It

```sh
bun run --cwd examples/starter-template typecheck
bunx ohtools --app examples/starter-template/src/app.ts list
bunx ohtools --app examples/starter-template/src/app.ts docs
bunx ohtools --app examples/starter-template/src/app.ts docs --format json
```
