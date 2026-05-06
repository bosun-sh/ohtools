# 14. Validation Scripts

## Purpose

Define the scripts that implementation agents must create for local validation,
CI, stage gates, and public `v1.0.0` release readiness.

## Public Interfaces

Root `package.json` must expose these scripts:

```json
{
  "scripts": {
    "build": "bun run --filter '*' build",
    "test": "bun test",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "format": "biome format --write .",
    "format:check": "biome format .",
    "docs:dev": "bun --cwd apps/docs dev",
    "docs:build": "bun --cwd apps/docs build",
    "spec:check": "bun run scripts/spec-check.ts",
    "examples:check": "bun run scripts/examples-check.ts",
    "pack:check": "bun run scripts/pack-check.ts",
    "smoke:packed": "bun run scripts/smoke-packed.ts",
    "smoke:npm": "bun run scripts/smoke-npm.ts",
    "validate": "bun run validate:stage5",
    "validate:stage0": "bun run spec:check && bun run typecheck && bun run lint && bun run docs:build",
    "validate:stage1": "bun run validate:stage0 && bun test packages/ohtools/src/core",
    "validate:stage2": "bun run validate:stage1 && bun run examples:check",
    "validate:stage3": "bun run validate:stage2 && bun test packages/ohtools/src/adapters",
    "validate:stage4": "bun run validate:stage3 && bun run docs:build",
    "validate:stage5": "bun run validate:stage4 && bun run pack:check && bun run smoke:packed",
    "release:check": "bun run validate:stage5"
  }
}
```

The script command strings define intent. Implementation may split commands into
small TypeScript files under `scripts/` to keep cross-platform behavior
deterministic, but the root script names must match exactly.

## Script Requirements

`spec:check` must verify:

- All required spec directories exist.
- Each numbered spec directory has `SPEC.md`.
- Each numbered spec directory has `tasks/` with at least one Markdown task
  file.
- Required project context files exist:
  - `docs/README.md`
  - `docs/OKRS.md`
  - `docs/KPIS.md`
  - `docs/TASK-HARNESS.md`
  - `docs/VALIDATION.md`
- Every numbered `SPEC.md` and `README.md` contains purpose, public interfaces,
  implementation requirements, edge cases, tests, and done criteria.
- Every task file contains assigned model, owning specs, goal, scope,
  dependencies, phases, requirements, edge cases, tests and validation, and
  definition of done.
- Every task file uses only approved Codex models: `gpt-5.4-mini`,
  `gpt-5.3-codex`, `gpt-5.4`, and `gpt-5.5`.
- Every task has plan, use cases, test / TDD, develop, and validate phases.
- Task model selection must prefer the smallest or cheapest model that remains
  reliable for the task, with stronger models reserved for phases that need
  them.
- No numbered spec contains unresolved placeholders: `TODO`, `TBD`,
  `chosen later`, `or equivalent`, or `where feasible`.
- `SPEC.md` contains `Resolved for Public v1`.

`examples:check` must verify:

- Every `examples/*` package typechecks.
- Every example imports only public package exports.
- `examples/basic` exercises define, compose plugin, explore, run, and MCP
  exposure.

`pack:check` must verify:

- `npm pack --dry-run` includes only intended package files.
- Public exports resolve from packed output.
- `bin.ohtools` points to an executable built file.
- Type declarations exist for every public export.

`smoke:packed` must verify:

- A temporary Bun project can install the packed tarball.
- The temporary project can create an app, explore a tool, run a tool, start the
  MCP adapter in a local harness, and run the CLI adapter.

`smoke:npm` must verify:

- A temporary Bun project can install `ohtools@1.0.0` from npm.
- The same smoke path used by `smoke:packed` passes against the public package.

## Stage Validation Requirements

Stage validation scripts must be cumulative:

- `validate:stage0` checks specs, toolchain, lint, typecheck, and docs build.
- `validate:stage1` includes Stage 0 and core tests.
- `validate:stage2` includes Stage 1 and public API/example checks.
- `validate:stage3` includes Stage 2 and runtime/adapter checks.
- `validate:stage4` includes Stage 3 and docs/examples readiness checks.
- `validate:stage5` includes Stage 4, package dry-run, and packed smoke tests.
- `validate` aliases `validate:stage5`.
- `release:check` aliases `validate:stage5`.

## Implementation Requirements

- Use Bun and TypeScript for custom validation scripts.
- Keep validation scripts deterministic and cross-platform.
- Avoid network access except in `smoke:npm`, which runs only after npm publish
  or in explicit release verification.
- Scripts must print concise pass/fail output with the failing check name.
- Scripts must exit non-zero on failure.
- CI must run `bun run validate` before merge to main once Stage 5 exists.
- Release workflow must run `bun run release:check` before npm publish and
  `bun run smoke:npm` after npm publish.

## Edge Cases

- Stage-specific test paths may not exist during earlier scaffolding; the
  matching validation script must fail with an actionable message once that
  stage is active.
- `format` rewrites files and is not a validation gate; `format:check` is the
  non-mutating validation command.
- `smoke:npm` must not run in normal pull-request CI because it depends on the
  published package.
- Temporary smoke projects must be created outside the repository and cleaned up
  after success.

## Tests

- Unit test custom script helpers where practical.
- Add fixture failures for `spec:check`.
- Add fixture failures for missing task files, invalid task sections, invalid
  phase names, and unapproved task or phase models.
- Add package fixture checks for `pack:check`.
- Run `validate:stage0` in CI as soon as Stage 0 exists.
- Expand CI to `validate` before public `v1.0.0`.

## Done Criteria

- All root validation script names exist.
- Stage validation scripts are cumulative.
- `release:check` runs all release-blocking local checks.
- Objectives docs reference the implemented script names.
- `spec:check` verifies required project context files, numbered spec
  directories, `SPEC.md` files, atomic task files, approved models, and required
  task phases.
- CI and release workflows use these script names.
