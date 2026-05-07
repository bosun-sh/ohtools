# Validation

## Required Root Scripts

The root package must expose these validation commands:

```txt
bun run examples:check
bun run pack:check
bun run smoke:packed
bun run smoke:npm
bun run validate
bun run release:check
bun run publish:ohtools
```

## Release Validation

```txt
bun run validate
```

Release:

```txt
bun run release:check
```

After npm publish:

```txt
bun run smoke:npm
```

## Rules

- `validate` runs typecheck, lint, tests, examples, docs checks, package checks,
  and packed-package smoke.
- `release:check` aliases `validate`.
- `smoke:npm` is not part of pull-request CI.
- `format` rewrites files and is not a validation gate; use `format:check` for
  non-mutating validation.
- Coverage gates for `packages/ohtools/src` are a pre-1.0 follow-up; add a
  non-mutating coverage command before a 1.0 release readiness gate.
