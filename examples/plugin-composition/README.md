# Plugin Composition Example

This example shows how to package tools as a plugin and compose that plugin into an app.

## Flow

1. `src/app.ts` creates an `issues` plugin with `plugin("issues")`.
2. The plugin registers `issues.list`.
3. The exported app calls `.use(issues)` to include the plugin contribution.
4. Building or running the app sees plugin tools as normal registry tools.

## What To Copy

Use plugins when a group of tools should be reused across apps or owned by another package. Keep IDs stable and explicit inside plugins so consuming apps do not rename tools unexpectedly.

## Try It

```sh
bun run --cwd examples/plugin-composition typecheck
bunx ohtools --app examples/plugin-composition/src/app.ts list
```
