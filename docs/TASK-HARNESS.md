# Task Harness

## Definition of Ready

A task is ready when all of the following are true:

- The expected user-visible behavior or internal contract is stated.
- Public APIs, file ownership, and affected package boundaries are identified.
- Required tests and validation scripts are listed.
- Dependencies on previous tasks are listed.
- Edge cases and compatibility risks are included in the task.
- The task can be implemented without asking a product or tooling question.

Tasks that change public API, CLI commands, adapter wire shapes, error codes, or
release behavior are not ready until docs, tests, examples, and changelog impact
are identified.

## Definition of Done

A task is done when all of the following are true:

- Implementation matches the requested behavior and documented public contract.
- Required tests are added or updated.
- Required validation scripts pass locally.
- Public examples and docs are updated when behavior changes.
- Error paths use documented `OhtoolsErrorCode` values.
- No unrelated files are changed.
- The task output records the commands run and their results.

Tasks that touch public behavior are not done until docs and examples either
reflect the change or explicitly remain unchanged because the behavior is
internal only.

## Agent Workflow

For every task:

1. Read this task harness and nearby docs or examples.
2. Confirm the task is ready.
3. Plan the scoped implementation.
4. Write use cases and acceptance scenarios.
5. Add or update tests before implementation where practical.
6. Implement only the scoped change.
7. Run the required validation scripts.
8. Record validation results in the task output.
9. Close the task only when the definition of done is satisfied.
