# CLI Usage Example

This example shows the simplest app shape for CLI-oriented use: one app, one tool, no schema, and no explicit adapter setup in the example itself.

## Flow

1. `src/app.ts` creates `new Ohtools()`.
2. `.tool("hello", spec)` registers a runnable tool with a stable ID.
3. The handler returns `{ message: "hello" }`.
4. The exported app can be loaded by the Ohtools CLI using the `--app` option.

## What To Copy

Use this style for quick local tools, demos, or smoke fixtures. Add `input` and `output` schemas when the CLI should validate JSON input and output.

## Try It

```sh
bun run --cwd examples/cli-usage typecheck
bunx ohtools --app examples/cli-usage/src/app.ts list
bunx ohtools --app examples/cli-usage/src/app.ts run hello --input '{}'
```
