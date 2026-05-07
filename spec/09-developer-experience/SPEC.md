# 09. Developer Experience

## Purpose

Define ergonomics, examples, error messages, generated docs, starter templates,
and local development workflow for Ohtools users and maintainers.

## Public Interfaces

Primary import:

```ts
import { Ohtools, plugin, jsonSchema } from "@bosun-sh/ohtools";
import { mcpAdapter } from "@bosun-sh/ohtools/adapters/mcp";
```

Basic example target:

```ts
const app = new Ohtools()
  .tool("hello", {
    description: "Return a greeting.",
    input: jsonSchema({ type: "object", properties: { name: { type: "string" } } }),
    run: ({ name }) => ({ message: `Hello, ${name}` }),
    next: [],
  })
  .adapter(mcpAdapter());
```

## Implementation Requirements

- Keep common APIs fluent and discoverable.
- Keep examples short enough to paste into a new project.
- Include examples for:
  - basic tool
  - plugin composition
  - grouped hierarchy
  - Effect service dependency
  - MCP stdio server
  - CLI usage
- Error messages must include:
  - stable error code
  - human-readable message
  - affected tool/group/plugin path
  - suggested fix when obvious
- Generated docs must include tool ID, description, input schema, output schema,
  hierarchy path, and next steps.
- Generated docs output format is Markdown by default and JSON with
  `--format json`.
- Starter template must use Bun and TypeScript.
- Local workflow must work with `bun install`, `bun test`, and `bun run dev`
  in examples and the docs app.

## Edge Cases

- Error messages must remain useful when plugin composition creates the failing
  definition far from the app root.
- Examples must not rely on unpublished private imports.
- Generated docs must handle tools without output schemas.
- Starter template must not include secrets, private URLs, or local machine
  paths.
- Public docs must state that Bun is the only supported runtime.

## Tests

- Typecheck all examples.
- Execute the basic example in CI.
- Snapshot generated docs for a fixture app.
- Test error message formatting for duplicate tool, invalid schema, missing
  next step, and handler failure.
- Validate starter template installation path.

## Done Criteria

- README teaches the first vertical slice.
- Examples are runnable or typechecked in CI.
- Error messages are structured and actionable.
- Generated docs are usable by both humans and agents.
