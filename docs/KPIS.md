# KPIs

## Maintenance KPIs

Every compatibility-sensitive change must meet these KPIs before merge:

- Task readiness: 100% of implementation tasks meet the definition of ready
  before coding.
- Task completion: 100% of completed tasks meet the definition of done.
- Validation pass rate: 100% of required validation scripts pass before release.
- Public example health: 100% of examples touched by the change typecheck or
  run.
- Docs freshness: 100% of public API or behavior changes update docs or include
  a documented reason docs are unaffected.

## Public `0.1.0` KPIs

The release cannot ship until these KPIs are true:

- Package smoke tests pass against the packed package.
- Package smoke tests pass against the npm-published package.
- Internal docs links pass.
- Type declarations are emitted for all public exports.
- No skipped tests remain without an issue reference and release note entry.

## Pre-1.0 KPIs

Before promoting to `1.0.0`:

- At least a few real implementations exercise builder, plugin, schema, CLI,
  and MCP usage.
- Known compatibility issues are resolved or explicitly accepted.
- Breaking changes since `0.1.0` are documented in the changelog.
