# Ohtools

[![CI](https://github.com/bosun-sh/ohtools/actions/workflows/ci.yml/badge.svg)](https://github.com/bosun-sh/ohtools/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@bosun-sh/ohtools)](https://www.npmjs.com/package/@bosun-sh/ohtools)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

Bun-first TypeScript framework for explorable AI-operable tool apps.

Ohtools helps you define typed tools, organize them into hierarchies, and expose
the same registry through local and agent-facing adapters. It is built for teams
that want AI agents to inspect tool maps, schemas, hierarchy, and metadata before
running handlers that may have side effects.

## Why Ohtools Exists

Most tool servers give agents a flat list of callable functions. Ohtools treats
the tool app itself as something an agent can explore. Agents can ask what tools
exist, how they are grouped, what inputs and outputs are expected, what metadata
is attached, and which node to inspect next before they run anything.

That makes Ohtools a fit for:

- internal operations tools that need typed, validated inputs
- MCP servers that should be inspectable before execution
- plugin-style tool packages shared across multiple apps
- local automation where CLI smoke checks and agent behavior should use the same
  registry

## Features

- Typed tool definitions with exact IDs and TypeScript inference.
- JSON Schema validation for tool input and output.
- Explorable hierarchy and graph metadata for tools and groups.
- Effect-powered runtime execution and error normalization.
- Plugin composition for reusable, separately owned tool sets.
- CLI adapter for `list`, `explore`, `run`, `graph`, and generated docs.
- MCP stdio adapter with executable tools, `ohtools.explore`, `ohtools.graph`,
  and graph resources.
- Generated JSON and Markdown docs from the registry.
- Scaffolded agent skill in created projects.
- Validation harness for types, docs, examples, package checks, and smoke
  tests.

## Quickstart

Create a new Ohtools app with the published
[`@bosun-sh/ohtools`](https://www.npmjs.com/package/@bosun-sh/ohtools)
package:

```sh
npx @bosun-sh/ohtools create my-tools
cd my-tools
bun install
bun run ohtools:list
```

The scaffold creates `src/ohtools.ts`, package scripts, and a local
`.agents/skills/ohtools` skill so future coding agents can read the project
contract before editing tools, plugins, adapters, docs, or examples.

Projects that do not already include the scaffolded skill can install the shared
skill registry entry:

```sh
npx skills add https://github.com/bosun-sh/skills --skill ohtools
```

## Existing Projects

For an existing Bun TypeScript project, install the package and peer runtime
dependencies:

```sh
bun add @bosun-sh/ohtools effect @modelcontextprotocol/sdk
```

You can also scaffold Ohtools into the current project:

```sh
npx @bosun-sh/ohtools init
```

## Minimal App

```ts
import { Ohtools, jsonSchema } from "@bosun-sh/ohtools";

export default new Ohtools({ name: "my-tools" }).tool("hello", {
  description: "Return a greeting.",
  input: jsonSchema<{ name: string }>({
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"],
    additionalProperties: false
  }),
  output: jsonSchema<{ message: string }>({
    type: "object",
    properties: { message: { type: "string" } },
    required: ["message"],
    additionalProperties: false
  }),
  run: ({ name }) => ({ message: `Hello, ${name}` })
});
```

## CLI

The CLI loads an app module that exports `default` or `app`.

```sh
bunx ohtools --app ./src/ohtools.ts list
bunx ohtools --app ./src/ohtools.ts explore hello
bunx ohtools --app ./src/ohtools.ts run hello --input '{"name":"Ada"}'
bunx ohtools --app ./src/ohtools.ts graph
```

`list` shows registered tools. `explore` returns descriptors and graph context
without calling handlers. `run` validates input, executes the selected tool, and
validates output. `graph` returns the built graph. Commands emit JSON envelopes
by default, with `--human` available for readable output.

## MCP Stdio

Attach the MCP adapter when an MCP client should launch your Bun process over
stdio and inspect the registry before executing tools.

```ts
import { Ohtools } from "@bosun-sh/ohtools";
import { mcpAdapter } from "@bosun-sh/ohtools/adapters/mcp";

export const app = new Ohtools({ name: "ops-tools" })
  .tool("hello", {
    description: "Return a greeting.",
    run: () => ({ message: "Hello" })
  })
  .adapter(mcpAdapter({ stdio: true }));
```

Start the adapter from a small Bun entrypoint:

```ts
import { app } from "./ohtools";

const registry = app.build();
const handle = registry.adapters.get("mcp")?.attach({
  registry,
  runtime: (options) => app.runtime(options)
});

await handle?.start();
```

MCP support is stdio-only in 0.1.

## Core Concepts

- App: an `Ohtools` builder that collects tools, groups, metadata, plugins, and
  adapters.
- Tool: a typed handler with an ID, description, optional schemas, runtime mode,
  metadata, and next-step hints.
- Schema: a runtime parser, usually declared with `jsonSchema`, that also
  carries TypeScript input and output types.
- Group: a hierarchy node that organizes tools and other groups without changing
  tool IDs.
- Registry: the immutable built graph used by adapters, docs, exploration, and
  runtime execution.
- Plugin: a reusable contribution that can own tools, groups, and metadata before
  being composed into an app.
- Adapter: a boundary that exposes the same registry to an interface such as the
  CLI or MCP stdio.

## Examples

- [Basic example](examples/basic) shows the first app and plugin shape.
- [MCP stdio example](examples/mcp-stdio) shows MCP server wiring.
- [Plugin composition example](examples/plugin-composition) shows reusable plugin
  ownership.
- [Complex graph example](examples/complex) shows a larger app split across
  domain, application, infrastructure, tools, hierarchy, and wiring.

## Documentation

- [Docs site](https://ohtools.dev)
- [Getting started](https://ohtools.dev/getting-started/)
- [API reference](https://ohtools.dev/api/)
- [CLI adapter](https://ohtools.dev/adapters/cli/)
- [MCP adapter](https://ohtools.dev/adapters/mcp/)
- [Changelog](CHANGELOG.md)
- [Contributing guide](CONTRIBUTING.md)
- [License](LICENSE)

## Development

Install dependencies and run the local checks:

```sh
bun install
bun test
bun run validate
```

Useful narrower checks:

```sh
bun run format:check
bun run docs:links
bun run docs:snippets
```

Release-facing checks are available through:

```sh
bun run release:check
```

## Version And Support

The current package is `@bosun-sh/ohtools@0.1.1`, licensed under Apache-2.0.

Ohtools 0.1 is Bun-only. Node, Deno, browser runtimes, HTTP, SSE, and
streamable HTTP transports are intentionally outside the 0.1 scope.

The package is stable enough for real implementations, but it is still
pre-1.0. Public APIs should be treated carefully, and any breaking changes
before 1.0 will be documented in the changelog.
