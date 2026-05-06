# 01. Roadmap

## Purpose

Define the staged path from an empty repository to public Ohtools `v1.0.0`. The
roadmap controls scope, stage gates, and the order in which technical
capabilities become required.

## Public Interfaces

This spec defines project milestones rather than runtime APIs. The public
release must expose:

- `ohtools` npm package.
- Astro documentation site.
- CLI binary.
- Example projects.
- Public API reference generated or maintained from source types.
- Objectives harness.
- GitHub release notes and changelog.

## Stage 0: Project Foundation

Entry criteria:

- Repository exists and can accept TypeScript source.
- `spec/` contains the staged specification set.

Deliverables:

- Bun workspace with `packages/ohtools`, `apps/docs`, and `examples/basic`.
- Root scripts for build, test, typecheck, lint, format, and docs.
- Astro + MDX docs app.
- Biome lint/format config.
- `expect-type` type test setup.
- Objectives page and validation scripts.
- Package metadata, license, README, contribution guide, and CI workflow.
- Baseline tests that prove the toolchain runs.

Exit criteria:

- `bun install`, `bun run build`, `bun test`, and `bunx tsc --noEmit` succeed.
- `bun run validate:stage0` succeeds.
- CI runs the same commands.
- Package exports are declared even if some implementation files are placeholders.

## Stage 1: Core Framework Kernel

Entry criteria:

- Stage 0 exit criteria pass.
- Repository layout and public package boundaries are stable.

Deliverables:

- Core domain model for tools, groups, hierarchy nodes, metadata, next steps,
  execution results, and framework errors.
- Immutable registry and build output.
- Graph construction and validation.
- Explore and run planning functions without transport coupling.

Exit criteria:

- A fixture app can define two related tools and produce a validated registry.
- Exploration returns documentation and next steps without executing handlers.
- Run planning detects missing tools, unavailable tools, and invalid cycles.

## Stage 2: Public Builder and Plugin API

Entry criteria:

- Stage 1 domain functions are tested independently.

Deliverables:

- `Ohtools` app builder.
- `plugin(...)` builder.
- `.use(...)`, `.tool(...)`, `.group(...)`, `.adapter(...)`, and `.build()`.
- Conflict behavior for duplicate tools, groups, adapters, and metadata.
- Schema helper exports and type inference tests.

Exit criteria:

- Users can build the first vertical slice through only public APIs.
- Plugin composition is deterministic and covered by tests.
- Public TypeScript declarations match documented examples.

## Stage 3: Runtime and Adapters

Entry criteria:

- Stage 2 public APIs are stable enough for adapter implementation.

Deliverables:

- Effect runtime integration for tool handlers.
- Dependency injection through services/layers.
- Typed framework errors.
- Cancellation, scopes, and cleanup behavior.
- MCP adapter.
- CLI adapter.
- Adapter-level integration tests.

Exit criteria:

- The same app runs through direct runtime calls, MCP, and CLI.
- Handler failures are normalized into documented error payloads.
- MCP graph exposure passes smoke tests against the MCP SDK.

## Stage 4: Developer Experience

Entry criteria:

- Stage 3 vertical slice works end to end.

Deliverables:

- Guide-quality README.
- Examples for basic, plugin composition, Effect services, MCP server, and CLI.
- Starter template.
- Generated or source-derived tool documentation.
- Helpful error messages with actionable context.
- Documentation site content.

Exit criteria:

- A new user can install dependencies, run an example, and understand the core
  workflow from docs alone.
- Example code is tested or typechecked in CI.
- Docs site builds from clean checkout.

## Stage 5: Public Launch

Entry criteria:

- Stages 0 through 4 pass locally and in CI.
- Version, package metadata, docs URLs, and release notes are final.

Deliverables:

- Published npm package.
- Deployed docs site.
- GitHub release and tag.
- Changelog.
- Public smoke-test report.
- Maintenance policy.

Exit criteria:

- A clean project can install `ohtools` from npm and run the basic example.
- Docs link to the exact released version.
- Post-launch issue triage and patch process are documented.

## Implementation Requirements

- Do not skip stage exit criteria unless a later spec explicitly supersedes
  them.
- Keep `v1.0.0` narrow: app builder, plugin builder, core types, schema
  helpers, MCP adapter, CLI adapter, docs, and examples.
- Treat Bun as the only supported runtime.
- Keep each stage releasable internally before starting broad work in the next
  stage.

## Edge Cases

- If a dependency blocks Stage 0 setup, document the blocker in the stage task
  and avoid adding unrelated infrastructure.
- If MCP SDK behavior changes, update `08-adapters.md` and adapter tests before
  altering public APIs.
- If type inference goals conflict with API clarity, keep runtime behavior
  simple and document inference limitations.

## Tests

- Stage gate tests must run in CI.
- Every stage must include at least one smoke test that proves the primary
  deliverable works.
- Public examples must be typechecked or executed.
- Stage gates must use the scripts defined in `14-validation-scripts.md`.

## Done Criteria

- Each stage has tracked tasks mapped to its deliverables.
- Stage entry and exit criteria are represented in CI or release checklists.
- The first vertical slice can be assigned and implemented without additional
  product decisions.
