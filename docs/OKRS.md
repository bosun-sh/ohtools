# OKRs

## Objective 1: Build a decision-complete AI-driven framework implementation

Key results:

- Public behavior is covered by tests, examples, or docs.
- Compatibility-sensitive changes include acceptance criteria before coding.
- Release checks are executable by script.

## Objective 2: Ship a public `0.1.0` package

Key results:

- Packed package installs into a clean Bun project.
- Root exports, adapter exports, and CLI binary pass smoke tests.
- Release docs identify the exact published version.

## Objective 2.1: Exercise `0.1.0` before a `1.0.0` API lock

Key results:

- Real implementations validate the builder, plugin, schema, CLI, and MCP APIs.
- Compatibility issues are tracked before promoting the API to `1.0.0`.
- Any pre-1.0 breaking change is documented in the changelog.

## Objective 3: Make hierarchical MCP tooling clear to users and agents

Key results:

- Basic example demonstrates define, compose plugin, explore, run, next steps,
  and MCP exposure.
- Generated docs include every tool, schema, hierarchy path, and next step.
- Docs site explains app, tool, group, hierarchy, plugin, runtime, MCP adapter,
  and CLI adapter.

## Objective 4: Keep implementation quality high enough for autonomous iteration

Key results:

- Tests cover core, builder, schema, runtime, adapters, examples, docs, and
  release smoke path.
- Validation scripts run locally and in CI.
- Errors use stable codes and actionable messages.
