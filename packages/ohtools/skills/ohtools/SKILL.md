# Ohtools

Use this skill when creating, extending, reviewing, or releasing an Ohtools app or
plugin.

Ohtools apps are Bun TypeScript projects that define explorable AI tools with the
`@bosun-sh/ohtools` builder API, validate tool boundaries with schemas, and expose
the registry through CLI or MCP adapters.

## Load Order

1. Read `references/project-orientation.md` before changing an existing repo.
2. Read `references/app-creation.md` for new 0-1 apps or scaffolded projects.
3. Read only the authoring reference that matches the work: tools, plugins,
   schemas, adapters, docs, or release validation.

## Working Contract

- Preserve the existing runtime API and command surface unless the task explicitly
  asks for a breaking change.
- Prefer `defineTool`, `defineGroup`, and `plugin` for reusable units; use
  `new Ohtools()` for app composition.
- Give every executable tool a clear description and a JSON Schema input whenever
  an agent or MCP client will call it.
- Keep exploration side-effect free. Put external effects in tool handlers or
  injected Effect services.
- Add or update docs and examples whenever behavior changes in a user-visible way.
- Run the smallest useful tests first, then the release gates for package or
  scaffold changes.

## References

- `references/project-orientation.md`: repository map, contracts, and ownership.
- `references/app-creation.md`: new app workflow and starter expectations.
- `references/tool-plugin-authoring.md`: tool, group, and plugin patterns.
- `references/schema-validation.md`: schema and validation conventions.
- `references/adapters.md`: CLI and MCP adapter patterns.
- `references/docs-examples.md`: docs and example expectations.
- `references/test-release.md`: validation gates before release.
