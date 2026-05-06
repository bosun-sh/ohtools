# Validation

## Required Root Scripts

The root package must expose these validation commands:

```txt
bun run spec:check
bun run examples:check
bun run pack:check
bun run smoke:packed
bun run smoke:npm
bun run validate
bun run validate:stage0
bun run validate:stage1
bun run validate:stage2
bun run validate:stage3
bun run validate:stage4
bun run validate:stage5
bun run release:check
bun run publish:ohtools
```

## Stage Gates

Stage 0:

```txt
bun run validate:stage0
```

Stage 1:

```txt
bun run validate:stage1
```

Stage 2:

```txt
bun run validate:stage2
```

Stage 3:

```txt
bun run validate:stage3
```

Stage 4:

```txt
bun run validate:stage4
```

Includes docs build, internal link checks, and practical TypeScript snippet
checks.

Stage 5:

```txt
bun run validate:stage5
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

- Stage validation scripts are cumulative.
- `validate` aliases `validate:stage5`.
- `release:check` aliases `validate:stage5`.
- `smoke:npm` is not part of pull-request CI.
- `format` rewrites files and is not a validation gate; use `format:check` for
  non-mutating validation.
- Coverage gates for `packages/ohtools/src` are a public-launch follow-up; add a
  non-mutating coverage command before a stable release readiness gate.
