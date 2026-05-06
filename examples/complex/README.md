# Complex Graph Example

This example shows the recommended structure for larger apps: domain logic, application services, infrastructure, tool definitions, hierarchy, and app wiring live in separate files.

## Flow

1. `src/domain/graph.ts` contains graph types and algorithms.
2. `src/infrastructure/in-memory-graph-repository.ts` provides sample graph data.
3. `src/application/graph-service.ts` exposes use-case methods such as catalog inspection, BFS, DFS, and Dijkstra.
4. `src/tools/graph-tools.ts` turns service methods into exact-ID tools with `defineTool`.
5. `src/tools/graph-hierarchy.ts` declares the explorable structure with `defineGroup`, without changing the tool IDs.
6. `src/tooling/ohtools-store.ts` wires the repository, service, Ohtools app, hierarchy, metadata, and MCP adapter.
7. `src/scripts/run-demo.ts` uses `runtime.runTool(tool, input)` so output types come from the tool definitions.

## What To Copy

Use this structure when tools are not all owned by one file. Define each tool near the application service it calls, compose hierarchy separately, and keep app construction in a small store or entrypoint. Prefer `defineTool` for reusable exact-ID tools and `defineGroup` when hierarchy is part of the application design.

## Try It

```sh
bun run --cwd examples/complex typecheck
bun run --cwd examples/complex demo
```
