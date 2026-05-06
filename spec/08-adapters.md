# 08. Adapters

## Purpose

Define official MCP and CLI adapter requirements, mapping rules, transport
behavior, and adapter tests.

## Public Interfaces

Adapter definition:

```ts
export interface AdapterDefinition {
  id: AdapterId;
  kind: "mcp" | "cli" | string;
  attach(app: BuiltOhtoolsApp): AdapterHandle;
}

export interface AdapterHandle {
  start(options?: unknown): Promise<void> | void;
  stop?(): Promise<void> | void;
}
```

MCP adapter:

```ts
export function mcpAdapter(options?: McpAdapterOptions): AdapterDefinition;
```

CLI adapter:

```ts
export function cliAdapter(options?: CliAdapterOptions): AdapterDefinition;
```

## Implementation Requirements

- Keep adapters outside the core domain.
- Adapters consume a built registry and runtime; they must not mutate app or
  registry state.
- Adapter construction must be cheap and side-effect free.
- Starting an adapter is the point where transports, process I/O, or SDK
  servers are initialized.
- Adapter errors must use stable `OhtoolsError` codes before being translated to
  transport-specific responses.
- Adapter tests must run without external network services.

## MCP Requirements

- Use `@modelcontextprotocol/typescript-sdk`.
- Map executable Ohtools tools to MCP tools.
- Expose exploration through an MCP tool named `ohtools.explore`.
- Expose graph serialization through an MCP tool named `ohtools.graph`.
- Expose graph documentation as MCP resources:
  - `ohtools://graph`
  - `ohtools://tools/{toolId}`
  - `ohtools://groups/{groupId}`
- Convert input schemas to MCP-compatible JSON Schema.
- Normalize Ohtools errors into MCP error responses.
- Preserve tool IDs exactly. IDs are already constrained to MCP-safe characters.
- Support stdio transport for `v1.0.0`.
- Do not implement HTTP, SSE, or streamable HTTP transports in `v1.0.0`.

## CLI Requirements

- Provide commands for:
  - listing tools
  - exploring a tool or group
  - running a tool with JSON input
  - printing graph JSON
- Output machine-readable JSON by default for agent usage.
- Support human-readable mode with `--human`.
- Return non-zero exit codes for validation, missing tool, execution, and
  adapter errors.
- Do not require a separate CLI package for `v1.0.0`.
- Publish a `bin.ohtools` executable.
- CLI command shape is:
  - `ohtools --app ./path/to/app.ts list`
  - `ohtools --app ./path/to/app.ts explore <nodeId>`
  - `ohtools --app ./path/to/app.ts run <toolId> --input '{"json":true}'`
  - `ohtools --app ./path/to/app.ts graph`
- Default CLI output envelope is `{ "ok": true, "data": ... }` on success and
  `{ "ok": false, "error": OhtoolsError }` on failure.
- Exit codes are `0` success, `1` adapter error, `2` invalid CLI usage, `3`
  validation error, `4` missing tool or group, and `5` handler error.

## Edge Cases

- MCP schema conversion fails when a tool lacks an object input JSON Schema; the
  adapter must surface an actionable error.
- Tools that are explore-only must not appear as executable MCP tools.
- CLI JSON input parse errors must include the command and argument name.
- Adapter startup must fail if registry build errors exist.
- Adapter stop must be idempotent.
- Multiple adapters can be registered on one app, but starting them is explicit.

## Tests

- MCP adapter maps tool definitions to SDK tool registrations.
- MCP adapter exposes graph exploration.
- MCP adapter normalizes validation and execution errors.
- CLI adapter lists tools, explores, runs, and prints graph JSON.
- CLI adapter returns documented exit codes.
- Adapter start/stop idempotency tests.

## Done Criteria

- `ohtools/adapters/mcp` and `ohtools/adapters/cli` exports work.
- The first vertical slice is exposed through MCP.
- CLI can run the same example app without code changes.
- Adapter tests run in CI without external services.
