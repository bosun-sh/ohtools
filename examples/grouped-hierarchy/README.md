# Grouped Hierarchy Example

This example shows how to organize simple tools under a group while keeping the fluent builder style.

## Flow

1. `src/app.ts` creates `new Ohtools()`.
2. `.group("issues", callback)` creates a group node.
3. `.describe(...)` adds group documentation that appears during exploration.
4. `.tool("list", spec)` and `.tool("inspect", spec)` register relative tool IDs.
5. Because the tools are added inside the group callback, their final IDs are `issues.list` and `issues.inspect`.

## What To Copy

Use grouped shorthand when tools are small and naturally owned by the group. If a tool should keep an exact ID defined in another file, use `defineTool` and pass the definition to `group.tool(tool)` instead.

## Try It

```sh
bun run --cwd examples/grouped-hierarchy typecheck
bunx ohtools --app examples/grouped-hierarchy/src/app.ts explore issues
```
