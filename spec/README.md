# Ohtools Spec Index

## Purpose

This directory contains the staged specification set for building Ohtools from
an empty repository into a public `v1.0.0` npm package with a documentation site.
`SPEC.md` remains the high-level product vision. The numbered specs convert
that vision into implementation contracts for public `v1.0.0`.

## Public Interfaces

The spec set defines these public launch surfaces:

- `ohtools` npm package.
- `ohtools` root export for builders, core types, runtime types, and schema
  helpers.
- `ohtools/adapters/mcp` export.
- `ohtools/adapters/cli` export.
- `ohtools` CLI binary.
- Documentation site with getting-started, concepts, guides, API, adapters,
  examples, and changelog sections.
- Runnable examples under `examples/*`.

## Stage Map

| Stage | Name | Goal | Primary Specs |
| --- | --- | --- | --- |
| 0 | Project Foundation | Create the Bun workspace, package metadata, scripts, CI baseline, Astro docs app, examples app, README, license, and contribution rules. | `00`, `01`, `02`, `10` |
| 1 | Core Framework Kernel | Implement the immutable registry, core domain types, hierarchy graph, metadata model, exploration, execution planning, and build-time validation. | `03`, `05` |
| 2 | Public Builder and Plugin API | Implement the fluent app/plugin API, schema helpers, type inference targets, and merge/conflict semantics. | `04`, `06` |
| 3 | Runtime and Adapters | Implement Effect-powered execution, services/layers, typed errors, MCP adapter, CLI adapter, and adapter integration tests. | `07`, `08` |
| 4 | Developer Experience | Add examples, starter templates, generated docs, helpful errors, guide-level README content, and docs-site pages. | `09`, `11` |
| 5 | Public Launch | Publish the npm package, deploy docs, tag a GitHub release, run install smoke tests, and start maintenance. | `12` |

## Dependency Order

1. Read `SPEC.md` for the product intent and design principles.
2. Implement `00-ai-development-contract.md` to lock AI execution rules.
3. Implement `01-roadmap.md` to create stage gates.
4. Implement `02-repository-and-package.md` to establish the workspace.
5. Implement `10-testing-quality-and-style.md` before feature work so quality
   commands and CI are available from the start.
6. Implement `03-core-domain.md`, then `05-hierarchy-explore-run.md`.
7. Implement `04-builder-and-plugin-api.md`, then
   `06-schema-and-validation.md`.
8. Implement `07-effect-runtime.md`, then `08-adapters.md`.
9. Implement `09-developer-experience.md` alongside `11-docs-site.md`.
10. Complete `12-public-launch.md` after all prior done criteria pass.

## First Vertical Slice

The first implementation milestone must prove the framework shape end to end:

- Define tools with input/output schemas and metadata.
- Compose at least one plugin into an app with `.use(...)`.
- Build an immutable registry.
- Explore a tool without side effects.
- Run a tool through the Effect runtime.
- Return next-step information after explore and run.
- Expose the same graph through the MCP adapter.

## Converting Specs Into Tasks

For each numbered spec:

1. Convert each implementation requirement into one or more tracked tasks.
2. Keep tasks stage-scoped unless a dependency is explicit in this index.
3. Add tests from the spec before marking a task complete.
4. Treat done criteria as the acceptance checklist for the task group.
5. Update docs or examples whenever a public API or behavior changes.

## Global Defaults

- Runtime: Bun only.
- Source language: TypeScript.
- Public launch target: `v1.0.0` npm package plus Astro documentation site.
- Main dependencies: `@modelcontextprotocol/typescript-sdk`, `effect`, and
  Bun tooling.
- Public exports: app builder, plugin builder, core types, schema helpers, and
  official adapters.
- Architecture: hexagonal core with ports/adapters and vertical plugin slices.
- Docs stack: Astro with MDX static content.
- Lint and format stack: Biome.
- Type tests: `expect-type`.

## Implementation Requirements

- Keep `SPEC.md` as the product vision and use numbered specs for implementation
  contracts.
- Preserve the dependency order in this index unless a later decision updates
  the index and affected specs together.
- Convert each numbered spec into tasks before implementation begins for that
  stage.
- Do not treat examples, docs, or launch work as optional for the first public
  version.
- Treat flexible wording in `SPEC.md` as superseded by concrete choices in
  numbered specs.
- Keep cross-spec terminology consistent: app, tool, group, hierarchy node,
  explore, run, next step, plugin, port, adapter, registry, and runtime.

## Edge Cases

- If a numbered spec conflicts with `SPEC.md`, update the numbered spec only
  after deciding whether the product vision also needs revision.
- If a later implementation discovers an impossible requirement, document the
  decision in the affected spec before changing code.
- If a stage is split into smaller milestones, the original stage exit criteria
  still define completion.

## Tests

- Verify that all numbered files exist before starting Stage 0.
- Verify that each numbered spec has purpose, public interfaces or data
  contracts where relevant, implementation requirements, edge cases, tests, and
  done criteria.
- Use stage exit criteria as acceptance checks for implementation task groups.

## Done Criteria

- All files listed in this index exist and have purpose, public interfaces or
  data contracts where relevant, implementation requirements, edge cases, tests,
  and done criteria.
- Each stage has clear entry criteria, exit criteria, and deliverables.
- A maintainer can create development tasks directly from the numbered specs.
