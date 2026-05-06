# Ohtools Spec Index

## Purpose

This directory contains the staged specification set for building Ohtools from
an empty repository into a public `v1.0.0` npm package with a documentation site.
`SPEC.md` remains the high-level product vision. Each numbered directory
contains a `SPEC.md` implementation contract plus atomic task files under
`tasks/`.

## Public Interfaces

The spec set defines these public launch surfaces:

- `ohtools` npm package.
- `ohtools` root export for builders, core types, runtime types, and schema
  helpers.
- `ohtools/adapters/mcp` export.
- `ohtools/adapters/cli` export.
- `ohtools` CLI binary.
- Documentation site with getting-started, concepts, guides, API, adapters,
  examples, objectives, and changelog sections.
- Runnable examples under `examples/*`.

## Stage Map

| Stage | Name | Goal | Primary Specs |
| --- | --- | --- | --- |
| 0 | Project Foundation | Create the Bun workspace, package metadata, scripts, CI baseline, Astro docs app, examples app, README, license, contribution rules, and objectives harness. | `00`, `01`, `02`, `10`, `13`, `14` |
| 1 | Core Framework Kernel | Implement the immutable registry, core domain types, hierarchy graph, metadata model, exploration, execution planning, and build-time validation. | `03`, `05` |
| 2 | Public Builder and Plugin API | Implement the fluent app/plugin API, schema helpers, type inference targets, and merge/conflict semantics. | `04`, `06` |
| 3 | Runtime and Adapters | Implement Effect-powered execution, services/layers, typed errors, MCP adapter, CLI adapter, and adapter integration tests. | `07`, `08` |
| 4 | Developer Experience | Add examples, starter templates, generated docs, helpful errors, guide-level README content, and docs-site pages. | `09`, `11` |
| 5 | Public Launch | Publish the npm package, deploy docs, tag a GitHub release, run install smoke tests, and start maintenance. | `12` |

## Dependency Order

1. Read `SPEC.md` for the product intent and design principles.
2. Implement `00-ai-development-contract/SPEC.md` to lock AI execution rules.
3. Implement `01-roadmap/SPEC.md` to create stage gates.
4. Implement `02-repository-and-package/SPEC.md` to establish the workspace.
5. Implement `10-testing-quality-and-style/SPEC.md` before feature work so
   quality commands and CI are available from the start.
6. Implement `03-core-domain/SPEC.md`, then
   `05-hierarchy-explore-run/SPEC.md`.
7. Implement `04-builder-and-plugin-api/SPEC.md`, then
   `06-schema-and-validation/SPEC.md`.
8. Implement `07-effect-runtime/SPEC.md`, then `08-adapters/SPEC.md`.
9. Implement `09-developer-experience/SPEC.md` alongside
   `11-docs-site/SPEC.md`.
10. Implement `13-objectives-harness/SPEC.md` and
    `14-validation-scripts/SPEC.md` before broad feature work so goals and
    validation gates are fixed.
11. Complete `12-public-launch/SPEC.md` after all prior done criteria pass.

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
6. Store tasks as individual Markdown files under
   `spec/NN-name/tasks/*.md`.
7. Assign each task the smallest or cheapest approved model that is still
   reliable for the work.
8. Split each task into phases: plan, use cases, test / TDD, develop, and
   validate.
9. Let phases inherit the task model unless a phase needs a smaller or stronger
   model for reliability.

## Task Model Policy

Tasks may use these Codex subagent models:

- `gpt-5.4-mini`: default for docs, specs, planning, scaffolding, validation
  bookkeeping, and small changes.
- `gpt-5.3-codex`: default for normal TypeScript implementation, tests, API
  work, and refactors.
- `gpt-5.4`: use only for phases where runtime, adapter, schema, graph,
  release, or cross-module complexity makes the cheaper model less reliable.
- `gpt-5.5`: reserve for exceptional cross-spec conflict resolution or
  release-critical judgment that needs the strongest available model.

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
- Objectives harness: OKRs, KPIs, definition of ready, definition of done, and
  validation scripts.
- Spec layout: numbered directories with `SPEC.md` and `tasks/*.md`.
- Project context docs: `docs/OKRS.md`, `docs/KPIS.md`,
  `docs/TASK-HARNESS.md`, and `docs/VALIDATION.md`.

## Implementation Requirements

- Keep root `SPEC.md` as the product vision and numbered `SPEC.md` files as
  implementation contracts.
- Preserve the dependency order in this index unless a later decision updates
  the index and affected specs together.
- Convert each numbered spec into tasks before implementation begins for that
  stage.
- Each task file must include assigned model, owning specs, goal, scope,
  dependencies, phases, requirements, edge cases, tests and validation, and
  definition of done.
- Do not treat examples, docs, or launch work as optional for the first public
  version.
- Treat flexible wording in `SPEC.md` as superseded by concrete choices in
  numbered specs.
- Keep cross-spec terminology consistent: app, tool, group, hierarchy node,
  explore, run, next step, plugin, port, adapter, registry, and runtime.
- Treat validation scripts in `14-validation-scripts/SPEC.md` as the executable
  acceptance harness for all stages.
- Treat `docs/` objective files as required context for planning and executing
  tasks.

## Edge Cases

- If a numbered spec conflicts with `SPEC.md`, update the numbered spec only
  after deciding whether the product vision also needs revision.
- If a later implementation discovers an impossible requirement, document the
  decision in the affected spec before changing code.
- If a stage is split into smaller milestones, the original stage exit criteria
  still define completion.

## Tests

- Verify that all numbered spec directories exist before starting Stage 0.
- Verify that each numbered spec directory has `SPEC.md` and `tasks/*.md`.
- Verify that each numbered `SPEC.md` has purpose, public interfaces or data
  contracts where relevant, implementation requirements, edge cases, tests, and
  done criteria.
- Verify that each task file has the required task sections, an approved task
  model, and the required phases.
- Use stage exit criteria as acceptance checks for implementation task groups.

## Done Criteria

- All numbered spec directories listed in this index exist and have `SPEC.md`
  plus atomic task files.
- All numbered `SPEC.md` files have purpose, public interfaces or data
  contracts where relevant, implementation requirements, edge cases, tests, and
  done criteria.
- All task files include assigned models, phases, readiness fields, tests,
  validation, and done criteria.
- Each stage has clear entry criteria, exit criteria, and deliverables.
- A maintainer can create development tasks directly from the numbered specs.
