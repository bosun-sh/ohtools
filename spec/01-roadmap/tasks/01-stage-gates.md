# Stage Gates

## Assigned Model

- Task default: `gpt-5.4-mini`

## Owning Specs

- `spec/01-roadmap/SPEC.md`
- `docs/TASK-HARNESS.md`

## Goal

Convert roadmap stages into enforceable entry and exit gates.

## Scope

- Roadmap stages and validation gates.
- Keep changes limited to this task's owning package, docs, examples, or validation surface.
- Update public docs or examples when this task changes public behavior.

## Dependencies

- Follow the numeric spec dependency order from `spec/README.md`.
- Complete earlier tasks in this spec directory when they define types, APIs, scripts, or fixtures consumed by this task.

## Phases

| Phase | Assigned Model | Deliverable |
| --- | --- | --- |
| Plan | Inherit task default | Implementation notes, file ownership, dependencies, and risk check. |
| Use Cases | Inherit task default | Acceptance scenarios and edge cases derived from the owning spec. |
| Test / TDD | gpt-5.3-codex | Failing or updated tests before implementation where practical. |
| Develop | Inherit task default | Scoped implementation that satisfies the task requirements. |
| Validate | Inherit task default | Commands run, results recorded, and done criteria checked. |

## Requirements

- Read the owning specs and required project context docs before implementation.
- Implement only the behavior described by this task title and goal.
- Preserve public names, exports, CLI commands, error codes, and wire shapes defined by the owning specs.
- Record any missing or contradictory product decision in the owning spec before coding past it.

## Edge Cases

- Include all edge cases from `spec/01-roadmap/SPEC.md` that apply to this task.
- Do not silently relax validation, ordering, immutability, or public-surface constraints from the owning spec.
- If external dependency behavior conflicts with the spec, update the spec before changing implementation behavior.

## Tests and Validation

- Add or update the tests listed in `spec/01-roadmap/SPEC.md` that apply to this task.
- Run the narrowest relevant test command during development.
- Run the stage validation command from `14-validation-scripts` before marking the task complete when that command exists.
- Record every validation command and result in the task output.

## Definition of Done

- Implementation matches the owning specs.
- Required tests are added or updated and pass locally.
- Required validation scripts pass locally or the task output documents why the script does not exist yet.
- Docs and examples are updated for public behavior, or the task output states why they are unaffected.
- No unrelated files are changed.
- The task output records model usage for phases that did not inherit the task default.
