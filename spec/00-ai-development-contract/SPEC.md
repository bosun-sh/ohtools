# 00. AI Development Contract

## Purpose

Define how AI agents must convert this specification set into implementation
work from an empty repository to public `v1.0.0`. This file removes process
ambiguity for 100% AI-driven development.

## Public Interfaces

The public `v1.0.0` launch surface is fixed:

- npm package `@bosun-sh/ohtools`.
- Bun-only TypeScript runtime.
- Root package exports for app/plugin builders, core types, runtime types, and
  schema helpers.
- `@bosun-sh/ohtools/adapters/mcp` export.
- `@bosun-sh/ohtools/adapters/cli` export and `ohtools` CLI binary.
- Astro documentation site with MDX static pages.
- Objectives harness with OKRs, KPIs, task readiness, task done criteria, and
  validation scripts.
- Runnable examples under `examples/*`.

Required project context files:

- `docs/README.md`
- `docs/OKRS.md`
- `docs/KPIS.md`
- `docs/TASK-HARNESS.md`
- `docs/VALIDATION.md`

## Implementation Requirements

- Implement specs in numeric order unless a spec explicitly states a dependency
  on a later file.
- Before coding each stage, create tracked tasks from that stage's
  implementation requirements, tests, and done criteria.
- Store each numbered spec as `spec/NN-name/SPEC.md` and its atomic tasks as
  individual files under `spec/NN-name/tasks/`.
- Each task must include an assigned model, owning specs, goal, scope,
  dependencies, phases, requirements, edge cases, tests and validation, and
  definition of done.
- Assign each task the smallest or cheapest approved model that can still
  complete the work reliably.
- Each task must include these phases: plan, use cases, test / TDD, develop,
  and validate.
- Phase model assignments inherit the task model by default and may override it
  only when a smaller or stronger model is more reliable for that phase.
- Before coding any task, read the required project context files in `docs/`
  and the owning specs.
- Do not defer public API, tooling, release, or wire-format decisions to coding
  agents. If a decision is missing, update the relevant spec first.
- Do not add non-specified runtime dependencies without updating
  `02-repository-and-package/SPEC.md`.
- Do not change public names, exports, CLI commands, error codes, or adapter
  wire shapes without updating the owning spec and all affected examples.
- Do not skip docs or tests for public behavior.
- Keep each stage mergeable with all required commands passing.
- Treat `SPEC.md` as product vision and numbered specs as the v1 contract.

## Stage Task Checklist

Stage 0 tasks:

- Create Bun workspace, package metadata, TypeScript config, Biome config, CI,
  license, README, contribution guide, docs app shell, and basic example shell.
- Wire build, test, typecheck, lint, format, docs, and release-check scripts.
- Add objectives docs and validation scripts from `13` and `14`.
- Use `gpt-5.4-mini` for docs, planning, and scaffolding tasks unless
  TypeScript implementation complexity requires `gpt-5.3-codex`.

Stage 1 tasks:

- Implement core IDs, metadata, errors, tool/group definitions, immutable
  registry, graph model, graph validation, exploration planning, and run
  planning.
- Use `gpt-5.3-codex` by default, with selective `gpt-5.4` phase overrides for
  graph or traversal complexity.

Stage 2 tasks:

- Implement `Ohtools`, `plugin`, group builder, schema helpers, metadata API,
  conflict handling, and public type tests.
- Use `gpt-5.3-codex` by default, with selective `gpt-5.4` phase overrides for
  schema inference design.

Stage 3 tasks:

- Implement Effect runtime, service/layer support, cancellation/timeouts, MCP
  adapter, CLI adapter, CLI binary, and adapter integration tests.
- Use `gpt-5.3-codex` by default, with selective `gpt-5.4` phase overrides for
  runtime, cancellation, MCP, and CLI integration complexity.

Stage 4 tasks:

- Implement examples, generated docs, helpful errors, starter template, README
  guides, and Astro MDX docs pages.
- Use `gpt-5.4-mini` for docs-site content tasks and `gpt-5.3-codex` for
  generated docs, examples, and error-formatting implementation.

Stage 5 tasks:

- Run release checks, pack/install smoke tests, docs deployment checks, npm
  publish, GitHub tag/release, changelog, and post-launch maintenance docs.
- Use `gpt-5.4-mini` for checklist and maintenance docs, `gpt-5.3-codex` for
  smoke script work, and `gpt-5.4` for release-critical validation phases.

## Edge Cases

- If a generated task conflicts with a spec, the spec wins until it is updated.
- If an implementation agent finds contradictory specs, it must stop coding,
  record the contradiction, and update specs before continuing.
- If an external dependency API differs from these specs, update the adapter or
  package spec before changing implementation behavior.

## Tests

- Add a spec-readiness check that verifies every numbered `SPEC.md` has
  purpose, public interfaces, implementation requirements, edge cases, tests,
  and done criteria.
- Add a task-readiness check that verifies every numbered spec directory has
  task files with assigned models, required phases, tests, validation, and done
  criteria.
- Add a model-readiness check that rejects task or phase assignments outside
  the approved Codex model roster.
- Add a terminology check before v1 that confirms public examples use only
  documented exports and commands.
- Run all stage exit checks before advancing to the next stage.
- Use definition of ready before starting each task and definition of done before
  closing each task.

## Done Criteria

- An implementation agent can start Stage 0 without asking product or tooling
  questions.
- Required project context files exist in `docs/` and are referenced by specs.
- Every public v1 behavior has an owning spec.
- Every numbered spec directory has atomic task files with model assignments
  and phase assignments.
- Every stage has executable acceptance checks.
