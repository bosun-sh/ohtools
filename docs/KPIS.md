# KPIs

## Stage KPIs

Every stage must meet these KPIs before exit:

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

## Public `0.1.0` KPIs

The release cannot ship until these KPIs are true:

- Package smoke tests pass against the packed package.
- Package smoke tests pass against the npm-published package.
- Internal docs links pass.
- Type declarations are emitted for all public exports.
- No unresolved spec contradictions remain.
- No skipped tests remain without an issue reference and release note entry.
