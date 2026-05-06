# Release Checklist

Ohtools v1.0.0 release actions are manual unless this document explicitly names
a local validation command. Do not publish, deploy, tag, or create a GitHub
release without explicit maintainer direction.

## Package Metadata

- Confirm `packages/ohtools/package.json` name, version, license, repository,
  homepage, bugs URL, exports, files, dependencies, and `bin.ohtools`.
- Run `bun run pack:check` and confirm every public export has JavaScript and
  declaration artifacts.
- Review `npm pack --dry-run` output for unexpected files.

## Pre-Publish Validation

```sh
bun run release:check
```

`release:check` is the release-blocking local gate. It includes spec checks,
typecheck, lint, tests, docs build, package checks, and packed smoke.

## Publish

- Publish `ohtools@1.0.0` from `packages/ohtools`.
- Use npm provenance when publishing from a trusted CI environment.
- Do not run `bun run smoke:npm` until the package is visible from the npm
  registry.

## Post-Publish Smoke

```sh
bun run smoke:npm
```

The npm smoke creates a temporary Bun project, installs `ohtools@1.0.0`,
typechecks, explores and runs a tool, exercises the CLI, and checks the local
MCP resource helper.

## Docs Deploy

- Run `bun run docs:build`.
- Run `bun run docs:links` and `bun run docs:snippets`.
- Deploy the static Astro site from `apps/docs`.
- Confirm the deployed docs identify Bun as the supported runtime and state that
  HTTP/SSE transports are not part of v1.0.0.

## Tag And GitHub Release

- Tag the exact commit that passed `bun run release:check`.
- Create the GitHub release from that tag.
- Include changelog highlights, npm package link, docs URL, known limitations,
  and the post-publish `smoke:npm` result.

## Known v1.0.0 Limitations

- Bun is the supported runtime.
- MCP support is stdio-focused; HTTP/SSE transports are not implemented.
- Promise handlers can be raced for cancellation, but only Effect handlers are
  interrupted cooperatively.
- Coverage enforcement is documented as a release follow-up until a stable,
  non-mutating coverage gate is selected.

## Maintenance Policy

- Keep specs, docs, examples, and tests aligned with public behavior changes.
- Patch releases must run `bun run release:check` before publish.
- Security or data-loss fixes may shorten the docs-update path, but must add a
  release note and follow-up issue before publishing.
