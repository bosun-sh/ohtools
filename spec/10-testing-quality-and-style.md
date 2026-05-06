# 10. Testing, Quality, and Style

## Purpose

Define the test matrix, type tests, integration tests, Tiger Style expectations,
lint/format strategy, coverage gates, and CI requirements.

## Public Interfaces

Required commands:

```txt
bun test
bun run typecheck
bun run lint
bun run format
bun run build
bun run release:check
bun run validate
bun run validate:stage0
bun run validate:stage1
bun run validate:stage2
bun run validate:stage3
bun run validate:stage4
bun run validate:stage5
```

Locked tooling:

- Test runner: Bun test.
- Type checker: TypeScript `tsc --noEmit`.
- Type assertions: `expect-type`.
- Lint and format: Biome.
- Docs build: Astro.

## Test Matrix

- Unit tests for core domain and graph behavior.
- Builder tests for fluent APIs and composition.
- Type tests for public inference.
- Runtime tests for sync, async, and Effect handlers.
- Adapter integration tests for MCP and CLI.
- Example smoke tests.
- Docs build test.
- Release package dry-run test.
- Objectives harness and validation script checks.

## Implementation Requirements

- Prefer deterministic tests with no network access.
- Keep fixtures small and readable.
- Test errors by stable code and relevant path, not full prose only.
- Type tests must fail CI when public inference regresses.
- Integration tests must use local transports or in-process harnesses.
- Coverage gates apply to `packages/ohtools/src`.
- Public examples must be included in typecheck or smoke tests.
- CI must run on pull requests and main branch pushes.
- Validation scripts must follow `14-validation-scripts.md`.

## Tiger Style Expectations

- Keep control flow explicit.
- Prefer simple data transformations over hidden mutation.
- Make invalid states hard to represent with types and build validation.
- Avoid global state in core modules.
- Handle all known error cases deliberately.
- Keep adapter code at the boundary; do not let transport concerns leak into the
  core.
- Add comments only where they clarify non-obvious behavior.

## Edge Cases

- Tests must not depend on local absolute paths.
- Snapshot tests must avoid excessive churn from unordered maps.
- Type tests must be isolated from implementation internals.
- Coverage gates must not block initial scaffolding before Stage 1, but they
  must be enforced before public launch.
- CI must make Bun version explicit.

## Tests

This spec is verified by:

- A CI workflow executing required commands.
- A coverage report for package source.
- At least one failing-fixture test for each documented error category.
- Example smoke tests in a clean workspace.
- `spec:check` verifying the spec set is implementation-ready.

## Done Criteria

- Required commands exist and pass.
- CI runs the required commands.
- Coverage gate is configured before public launch.
- Style expectations are referenced in contribution docs.
