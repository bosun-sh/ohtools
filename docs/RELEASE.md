# Release Checklist

Ohtools 0.1.0 release actions are manual unless this document explicitly names
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

`release:check` is the release-blocking local gate. It includes typecheck, lint,
tests, examples, docs checks, package checks, and packed smoke.

## Publish

- Publish `@bosun-sh/ohtools@0.1.0` from `packages/ohtools`.
- The preferred path is the manual GitHub Actions `Release` workflow. It runs
  `bun run release:check`, publishes with
  `bun publish --access public --cwd packages/ohtools`, then runs
  `bun run smoke:npm`.
- Configure the repository secret `NPM_TOKEN`; the workflow passes it as
  `NPM_CONFIG_TOKEN` for automated `bun publish`.
- The workflow uses the `npm` GitHub Actions environment so maintainers can add
  approval or branch protection before publishing.
- For a maintainer-directed local publish, run `bun publish --access public`
  from `packages/ohtools` after `bun run release:check` succeeds.
- Do not run `bun run smoke:npm` until the package is visible from the npm
  registry.

## Post-Publish Smoke

```sh
bun run smoke:npm
```

The npm smoke creates a temporary Bun project, installs `@bosun-sh/ohtools@0.1.0`,
typechecks, explores and runs a tool, exercises the CLI, and checks the local
MCP resource helper.

## Docs Deploy

Docs deployment is deferred for the 0.1.0 package release. Before a later docs
deploy, run `bun run docs:build`, `bun run docs:links`, and
`bun run docs:snippets`, then deploy the static Astro site from `apps/docs`.

## Tag And GitHub Release

- Tag the exact commit that passed `bun run release:check`.
- Create the GitHub release from that tag.
- Include changelog highlights, npm package link, docs URL, known limitations,
  and the post-publish `smoke:npm` result.

## Known 0.1.0 Limitations

- Bun is the supported runtime.
- MCP support is stdio-focused; HTTP/SSE transports are not implemented.
- Promise handlers can be raced for cancellation, but only Effect handlers are
  interrupted cooperatively.
- Coverage enforcement is documented as a release follow-up until a stable,
  non-mutating coverage gate is selected.

## Maintenance Policy

- Keep docs, examples, and tests aligned with public behavior changes.
- Patch releases must run `bun run release:check` before publish.
- Security or data-loss fixes may shorten the docs-update path, but must add a
  release note and follow-up issue before publishing.
- Ohtools is pre-1.0. Breaking changes before `1.0.0` should still be called out
  clearly in the changelog and release notes.
