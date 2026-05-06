# 13. Objectives Harness

## Purpose

Define the objective system used to guide AI-driven development from zero to
public `v1.0.0`. The harness makes success measurable through OKRs, KPIs,
definitions of ready and done, validation scripts, and launch gates.

## Public Interfaces

The documentation site must expose an objectives page at:

```txt
/objectives
```

The page must include:

- OKRs.
- KPIs.
- Definition of ready for a task.
- Definition of done for a task.
- Validation scripts and when to run them.
- Stage gates from Stage 0 through Stage 5.
- Release readiness checklist for `v1.0.0`.

Canonical source docs:

- `docs/OKRS.md`
- `docs/KPIS.md`
- `docs/TASK-HARNESS.md`
- `docs/VALIDATION.md`

The Astro `/objectives` page must be built from or kept content-equivalent with
these files.

## OKRs

Objective 1: Build a decision-complete AI-driven framework implementation.

- Key result: every public behavior has an owning spec.
- Key result: every stage has task-level acceptance criteria.
- Key result: every stage exit check is executable by script.

Objective 2: Ship a stable public `v1.0.0` package.

- Key result: packed package installs into a clean Bun project.
- Key result: root exports, adapter exports, and CLI binary pass smoke tests.
- Key result: release docs identify the exact published version.

Objective 3: Make hierarchical MCP tooling clear to users and agents.

- Key result: basic example demonstrates define, explore, run, next steps, and
  MCP exposure.
- Key result: generated docs include every tool, schema, hierarchy path, and
  next step.
- Key result: docs site explains app, tool, group, hierarchy, plugin, runtime,
  MCP adapter, and CLI adapter.

Objective 4: Keep implementation quality high enough for autonomous iteration.

- Key result: tests cover core, builder, schema, runtime, adapters, examples,
  docs, and release smoke path.
- Key result: validation scripts run locally and in CI.
- Key result: errors use stable codes and actionable messages.

## KPIs

Required KPIs for every stage:

- Spec coverage: 100% of public behavior touched by the stage has an owning
  spec section.
- Task readiness: 100% of implementation tasks meet the definition of ready
  before coding.
- Task completion: 100% of completed tasks meet the definition of done.
- Validation pass rate: 100% of required validation scripts pass before stage
  exit.
- Public example health: 100% of examples touched by the stage typecheck or run.
- Docs freshness: 100% of public API or behavior changes update docs or include
  a documented reason docs are unaffected.

Required KPIs before public `v1.0.0`:

- Package smoke tests pass against the packed package.
- Package smoke tests pass against the npm-published package.
- Internal docs links pass.
- Type declarations are emitted for all public exports.
- No unresolved spec contradictions remain.
- No skipped tests remain without an issue reference and release note entry.

## Definition of Ready for a Task

A task is ready when all of the following are true:

- The task references one or more owning specs.
- The expected user-visible behavior or internal contract is stated.
- Public APIs, file ownership, and affected package boundaries are identified.
- Required tests and validation scripts are listed.
- Dependencies on previous tasks or stages are listed.
- Edge cases from the owning specs are included in the task.
- The task can be implemented without asking a product or tooling question.

Tasks that change public API, CLI commands, adapter wire shapes, error codes, or
release behavior are not ready until the owning spec is updated first.

## Definition of Done for a Task

A task is done when all of the following are true:

- Implementation matches the owning specs.
- Required tests are added or updated.
- Required validation scripts pass locally.
- Public examples and docs are updated when behavior changes.
- Error paths use documented `OhtoolsErrorCode` values.
- No unrelated files are changed.
- The task output records the commands run and their results.

Tasks that touch public behavior are not done until docs and examples either
reflect the change or explicitly remain unchanged because the behavior is
internal only.

## Stage Gates

Stage 0 gate:

- Workspace, scripts, CI, Astro docs shell, Biome, TypeScript, and example shell
  exist.
- `bun run validate:stage0` passes.

Stage 1 gate:

- Core registry, graph, exploration planning, and run planning are implemented.
- `bun run validate:stage1` passes.

Stage 2 gate:

- Public builders, plugin composition, schema helpers, and type tests are
  implemented.
- `bun run validate:stage2` passes.

Stage 3 gate:

- Effect runtime, MCP adapter, CLI adapter, and adapter tests are implemented.
- `bun run validate:stage3` passes.

Stage 4 gate:

- Examples, starter template, generated docs, README, and Astro MDX docs pages
  are implemented.
- `bun run validate:stage4` passes.

Stage 5 gate:

- Packed package, npm install smoke path, docs deployment check, changelog, and
  release checklist are complete.
- `bun run validate:stage5` passes.

## Implementation Requirements

- Add the objectives harness to the Astro docs site as MDX content.
- Keep OKRs and KPIs versioned in `docs/OKRS.md` and `docs/KPIS.md`.
- Keep task readiness and done criteria versioned in `docs/TASK-HARNESS.md`.
- Keep script usage guidance versioned in `docs/VALIDATION.md`.
- Link the objectives page from getting started, contribution docs, and release
  checklist.
- Implement validation scripts according to `14-validation-scripts.md`.
- CI must run `bun run validate` before public `v1.0.0`.
- Each stage task list must include the relevant definition of ready and done
  checks.

## Edge Cases

- A task that only updates docs still needs ready and done checks.
- A task that changes tests but not runtime behavior must still record
  validation commands.
- A task blocked by missing spec decisions must stop and update specs before
  implementation.
- A stage cannot pass by manually inspecting outputs that have scripted checks
  defined in `14-validation-scripts.md`.

## Tests

- Docs build includes `/objectives`.
- Internal link check reaches `/objectives`.
- `docs/OKRS.md`, `docs/KPIS.md`, `docs/TASK-HARNESS.md`, and
  `docs/VALIDATION.md` exist.
- Validation scripts referenced by the objectives page exist.
- Stage validation scripts fail when their required command list is incomplete.

## Done Criteria

- Objectives page content exists in docs.
- Project objective docs exist under `docs/`.
- OKRs and KPIs are defined for `v1.0.0`.
- Definition of ready and definition of done are explicit.
- Validation scripts are specified and linked.
- Stage gates are executable by scripts.
