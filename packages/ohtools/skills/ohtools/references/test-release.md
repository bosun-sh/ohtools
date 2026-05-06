# Test And Release Gates

Use focused checks while developing:

```sh
bun test packages/ohtools/test/adapters.test.ts
bun run typecheck
```

Before release or package scaffold changes, run:

```sh
bun test
bun run typecheck
bun run pack:check
bun run smoke:packed
```

Package checks must confirm that built JS, declarations, the `ohtools` binary,
skills, and scaffold templates are present in the packed package.

Smoke checks should install or unpack the tarball, then verify app imports and
CLI commands from the installed package.
