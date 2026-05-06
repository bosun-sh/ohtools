# 02. Repository and Package

## Purpose

Define the Bun workspace, package structure, exports, scripts, dependency
policy, Astro docs package, examples package, and release artifacts for
Ohtools `v1.0.0`.

## Public Interfaces

Package name:

```json
{
  "name": "ohtools",
  "type": "module",
  "bin": {
    "ohtools": "./dist/bin/ohtools.js"
  }
}
```

Required public exports:

```json
{
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js"
  },
  "./adapters/mcp": {
    "types": "./dist/adapters/mcp.d.ts",
    "import": "./dist/adapters/mcp.js"
  },
  "./adapters/cli": {
    "types": "./dist/adapters/cli.d.ts",
    "import": "./dist/adapters/cli.js"
  },
  "./schemas": {
    "types": "./dist/schemas.d.ts",
    "import": "./dist/schemas.js"
  }
}
```

Root workspace:

```txt
.
├── apps/docs
├── examples/basic
├── packages/ohtools
├── spec
├── package.json
├── bun.lock
└── tsconfig.json
```

## Implementation Requirements

- Use Bun workspaces.
- Keep the runtime package in `packages/ohtools`.
- Keep docs in `apps/docs`.
- Keep runnable examples in `examples/*`.
- Use TypeScript source under `packages/ohtools/src`.
- Emit build output to `packages/ohtools/dist`.
- Build ESM only for `v1.0.0`.
- Build JavaScript with Bun and declarations with `tsc --emitDeclarationOnly`.
- Use Astro with MDX static pages for `apps/docs`.
- Publish only compiled files, type declarations, README, license, and package
  metadata.
- Keep official adapters in the main package for `v1.0.0`.
- Publish the `ohtools` CLI binary from `packages/ohtools/dist/bin/ohtools.js`.
- Keep examples private and excluded from npm publish.
- Root scripts must include:
  - `build`
  - `test`
  - `typecheck`
  - `lint`
  - `format`
  - `docs:dev`
  - `docs:build`
  - `release:check`

## Dependency Policy

- Required runtime dependencies:
  - `@modelcontextprotocol/typescript-sdk`
  - `effect`
- Required dev tooling:
  - Bun
  - TypeScript
  - Biome for linting and formatting
  - Astro and `@astrojs/mdx` for docs
  - `expect-type` for type tests
- New dependencies require a written reason in the pull request or task.
- Prefer platform and Bun APIs before adding utility libraries.
- Do not add runtime dependencies for code that can be written clearly in the
  core package.

## Release Artifacts

The npm package must include:

- `dist/**/*.js`
- `dist/**/*.d.ts`
- `README.md`
- `LICENSE`
- `package.json`

The GitHub release must include:

- Release notes.
- Changelog link.
- npm package link.
- docs site link.
- commit SHA and tag.

## Edge Cases

- Package export paths must not expose internal modules accidentally.
- The docs app must not import private source files from `packages/ohtools/src`;
  it must import public package exports.
- Examples may use workspace links locally but must document npm install usage.
- Build artifacts must be reproducible from a clean checkout.

## Tests

- Run `bun install` from a clean checkout.
- Run root build, test, typecheck, lint, and docs build commands.
- Verify `npm pack --dry-run` includes only intended files.
- Add an import smoke test for each public export path.

## Done Criteria

- Workspace layout exists.
- Package metadata and exports match this spec.
- Root scripts are wired and documented.
- Release artifact contents are verified in CI or `release:check`.
