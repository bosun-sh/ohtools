# Task Harness

## Definition of Ready

A task is ready when all of the following are true:

- The task references one or more owning specs.
- The expected user-visible behavior or internal contract is stated.
- Public APIs, file ownership, and affected package boundaries are identified.
- The task has an assigned model from the approved Codex model roster.
- The assigned model is the smallest or cheapest model that can complete the
  task reliably.
- The task has plan, use cases, test / TDD, develop, and validate phases.
- Any phase model override is justified by reliability, cost, or task size.
- Required tests and validation scripts are listed.
- Dependencies on previous tasks or stages are listed.
- Edge cases from the owning specs are included in the task.
- The task can be implemented without asking a product or tooling question.

Tasks that change public API, CLI commands, adapter wire shapes, error codes, or
release behavior are not ready until the owning spec is updated first.

## Definition of Done

A task is done when all of the following are true:

- Implementation matches the owning specs.
- Required tests are added or updated.
- Required validation scripts pass locally.
- Public examples and docs are updated when behavior changes.
- Error paths use documented `OhtoolsErrorCode` values.
- No unrelated files are changed.
- The task output records the commands run and their results.
- The task output records which model completed each phase when phase
  assignments differ from the task default.

Tasks that touch public behavior are not done until docs and examples either
reflect the change or explicitly remain unchanged because the behavior is
internal only.

## Agent Workflow

For every task:

1. Read the owning specs.
2. Read this task harness.
3. Confirm the task is ready.
4. Confirm the assigned model and phase model overrides are still the smallest
   reliable choices for the work.
5. Plan the scoped implementation.
6. Write use cases and acceptance scenarios.
7. Add or update tests before implementation where practical.
8. Implement only the scoped change.
9. Run the required validation scripts.
10. Record validation results in the task output.
11. Close the task only when the definition of done is satisfied.

## Approved Model Roster

- `gpt-5.4-mini`: docs, specs, planning, scaffolding, validation bookkeeping,
  and small changes.
- `gpt-5.3-codex`: normal TypeScript implementation, tests, API work, and
  refactors.
- `gpt-5.4`: complex runtime, adapter, schema, graph, release, or cross-module
  phases where the cheaper model is less reliable.
- `gpt-5.5`: exceptional cross-spec conflict resolution or release-critical
  judgment only.
