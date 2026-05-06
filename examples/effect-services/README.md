# Effect Services Example

This example shows that a tool handler can return an Effect value instead of a plain value or promise.

## Flow

1. `src/app.ts` creates `new Ohtools()`.
2. `.tool("effect.hello", spec)` registers a tool with a normal Ohtools ID.
3. The handler returns `Effect.succeed(...)`.
4. The runtime recognizes Effect handlers and executes them through the same `runtime.run` path as sync and async handlers.

## What To Copy

Use this style when your tools already use Effect for dependency injection, cancellation, retries, or resource management. For real services, type the app with the service environment and pass a layer through `app.runtime({ layer })`.

## Try It

```sh
bun run --cwd examples/effect-services typecheck
```
