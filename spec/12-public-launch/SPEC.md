# 12. Public Launch

## Purpose

Define npm publishing, semver, changelog, smoke tests, and post-launch
maintenance for the Ohtools `0.1.0` package release.

## Public Interfaces

Release artifacts:

- npm package `@bosun-sh/ohtools`.
- Git tag `vX.Y.Z` when explicitly requested.
- GitHub release when explicitly requested.
- Deployed docs site for the released version when explicitly requested.
- Changelog entry.
- Objectives harness showing all v1 launch gates complete.

Versioning:

- Use semver.
- Public package release version is `0.1.0`.
- Treat public API removals as breaking changes after a stable `1.0.0`.

## Implementation Requirements

- Run `bun install` from a clean checkout before release.
- Run build, test, typecheck, lint, docs build, and package dry-run.
- Confirm package metadata:
  - name
  - version
  - description
  - license
  - repository
  - homepage
  - bugs URL
  - exports
  - files
- Publish the scoped package with `npm publish --access public`.
- Keep docs deployment deferred for the `0.1.0` package release.
- Do not tag or create a GitHub release unless explicitly requested.
- Release checklist must include final KPI status from
  `13-objectives-harness/SPEC.md`.

## Smoke Tests

- Create a temporary project.
- Install `@bosun-sh/ohtools` from npm.
- Create a basic app with one tool.
- Build and typecheck the app with Bun.
- Explore the tool.
- Run the tool.
- Start MCP adapter in a local smoke harness.
- Run CLI adapter against the same app.

## Edge Cases

- If docs deploy is run later and fails, keep the package published and ship a
  follow-up docs fix; do not republish the same version.
- If a release tag points at the wrong commit, create a corrected tag only after
  documenting the mistake.
- If smoke tests find an adapter issue after publish, triage as a patch release
  unless the package is unusable.

## Post-Launch Maintenance

- Triage issues by bug, docs, feature, question, and adapter compatibility.
- Keep a changelog for every release.
- Patch critical validation, execution, and adapter bugs quickly.
- Review dependency updates before merging.
- Track MCP SDK compatibility explicitly.
- Do not expand runtime support beyond Bun without a new spec.

## Tests

- `release:check` must execute all release-blocking checks.
- npm package dry-run must be inspected or asserted.
- Smoke tests must run against the packed package before npm publish and against
  npm after publish.
- Docs deployment verification is deferred for this release.

## Done Criteria

- npm package is published.
- Changelog is updated.
- Smoke tests pass against the public package.
- Maintenance process is documented.
- Objectives page marks `0.1.0` package release gates complete.
