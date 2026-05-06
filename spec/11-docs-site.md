# 11. Docs Site

## Purpose

Define the Astro documentation site structure, MDX content requirements, API
docs, tutorials, examples, launch pages, and publishing flow.

## Public Interfaces

Docs site sections:

```txt
/
/getting-started
/concepts
/guides
/api
/adapters
/examples
/objectives
/changelog
```

Required page source format:

- Static content pages use MDX.
- Shared layouts/components use Astro components.

Required MDX pages:

- `/getting-started`
- `/concepts/app`
- `/concepts/tools`
- `/concepts/hierarchy`
- `/concepts/plugins`
- `/guides/first-tool`
- `/guides/plugin-composition`
- `/guides/effect-services`
- `/adapters/mcp`
- `/adapters/cli`
- `/api`
- `/examples/basic`
- `/objectives`
- `/changelog`

Required public links:

- npm package.
- GitHub repository.
- API reference.
- Basic example.
- MCP adapter guide.
- CLI adapter guide.

## Implementation Requirements

- Docs site lives in `apps/docs`.
- Docs site uses Astro with `@astrojs/mdx`.
- Docs must build from a clean checkout with Bun.
- Docs examples must import from public package exports.
- Getting started must show Bun installation and first tool creation.
- Concepts must explain app, tool, group, hierarchy node, explore, run, next
  steps, plugin, port, and adapter.
- API docs must document public exports, not private internals.
- Adapter docs must include MCP stdio setup and CLI commands.
- Examples pages must link to runnable source in `examples/*`.
- Launch pages must include install instructions and version compatibility.
- Objectives page must include OKRs, KPIs, definition of ready, definition of
  done, validation scripts, and stage gates.
- Objectives page content must stay aligned with `docs/OKRS.md`,
  `docs/KPIS.md`, `docs/TASK-HARNESS.md`, and `docs/VALIDATION.md`.
- The site must state that Bun is the only supported runtime for the first
  version.

## Edge Cases

- Docs must not promise Node, Deno, browser, or HTTP transport support.
- API pages must not expose unstable internal file paths.
- Generated API docs must be checked for broken links.
- Versioned docs are not implemented in `v1.0.0`; the launch docs must identify
  the released package version.
- Examples that require MCP clients must also include a local smoke-test path.

## Tests

- Build docs in CI.
- Link-check internal docs links before launch.
- Typecheck docs code snippets where tooling supports it.
- Smoke test the getting-started example.
- Verify all public export links resolve.

## Done Criteria

- Docs site builds.
- Required sections exist.
- Getting started leads to a working Ohtools app.
- Public launch checklist links to deployed docs.
