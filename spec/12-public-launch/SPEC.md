# 12. Public Launch

## Purpose

Define npm publishing, semver, changelog, GitHub release, docs deployment,
launch checklist, smoke tests, and post-launch maintenance for Ohtools
`v1.0.0`.

## Public Interfaces

Release artifacts:

- npm package `ohtools`.
- Git tag `vX.Y.Z`.
- GitHub release.
- Deployed docs site for the released version.
- Changelog entry.
- Objectives harness showing all v1 launch gates complete.

Versioning:

- Use semver.
- Public launch version is `1.0.0`.
- Treat public API removals as breaking changes after `1.0.0`.

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
- Publish with npm provenance enabled.
- Deploy docs after the package version is final.
- Tag the exact commit used for npm publish.
- GitHub release notes must include install command, highlights, known
  limitations, docs link, and npm link.
- Release checklist must include final KPI status from
  `13-objectives-harness/SPEC.md`.

## Smoke Tests

- Create a temporary project.
- Install `ohtools` from npm.
- Create a basic app with one tool.
- Build and typecheck the app with Bun.
- Explore the tool.
- Run the tool.
- Start MCP adapter in a local smoke harness.
- Run CLI adapter against the same app.

## Edge Cases

- If npm publish succeeds but docs deploy fails, keep the package published and
  ship a follow-up docs fix; do not republish the same version.
- If docs deploy succeeds but npm publish fails, remove or update launch links
  before announcing.
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
- Docs deployment must be verified by fetching the public URL.

## Done Criteria

- npm package is published.
- Docs site is deployed and links to the package.
- GitHub release and changelog are published.
- Smoke tests pass against the public package.
- Maintenance process is documented.
- Objectives page marks `v1.0.0` launch gates complete.
