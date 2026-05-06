# 00. AI Development Contract

## Purpose

Define how AI agents must convert this specification set into implementation
work from an empty repository to public `v1.0.0`. This file removes process
ambiguity for 100% AI-driven development.

## Public Interfaces

The public `v1.0.0` launch surface is fixed:

- npm package `ohtools`.
- Bun-only TypeScript runtime.
- Root package exports for app/plugin builders, core types, runtime types, and
  schema helpers.
- `ohtools/adapters/mcp` export.
- `ohtools/adapters/cli` export and `ohtools` CLI binary.
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
- Before coding any task, read the required project context files in `docs/`
  and the owning specs.
- Do not defer public API, tooling, release, or wire-format decisions to coding
  agents. If a decision is missing, update the relevant spec first.
- Do not add non-specified runtime dependencies without updating
  `02-repository-and-package.md`.
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

Stage 1 tasks:

- Implement core IDs, metadata, errors, tool/group definitions, immutable
  registry, graph model, graph validation, exploration planning, and run
  planning.

Stage 2 tasks:

- Implement `Ohtools`, `plugin`, group builder, schema helpers, metadata API,
  conflict handling, and public type tests.

Stage 3 tasks:

- Implement Effect runtime, service/layer support, cancellation/timeouts, MCP
  adapter, CLI adapter, CLI binary, and adapter integration tests.

Stage 4 tasks:

- Implement examples, generated docs, helpful errors, starter template, README
  guides, and Astro MDX docs pages.

Stage 5 tasks:

- Run release checks, pack/install smoke tests, docs deployment checks, npm
  publish, GitHub tag/release, changelog, and post-launch maintenance docs.

## Edge Cases

- If a generated task conflicts with a spec, the spec wins until it is updated.
- If an implementation agent finds contradictory specs, it must stop coding,
  record the contradiction, and update specs before continuing.
- If an external dependency API differs from these specs, update the adapter or
  package spec before changing implementation behavior.

## Tests

- Add a spec-readiness check that verifies every numbered spec has purpose,
  public interfaces, implementation requirements, edge cases, tests, and done
  criteria.
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
- Every stage has executable acceptance checks.
