# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-11-05

### Added

- Docker configuration for building and deploying the docs site.
- HTTP adapter (`@bosun-sh/ohtools/adapters/http`): web-standard `httpHandler`,
  `httpServerConfig` and `httpAdapter` for Bun. `POST /tools/:toolId` runs any tool;
  tools can opt in to REST routes with `http: { method, path }`. Introspection
  routes, per-request `context` hook, CORS, body-size limit and sanitized errors.
- Server-Sent Events run streams, MCP over Streamable HTTP (`mcpHttpHandler`,
  `createMcpServer`) and a WebSocket transport (Bun).
- `context.emit` for tool progress events, streamed by SSE and WebSocket.
- tRPC v11 adapter (`@bosun-sh/ohtools/adapters/trpc`) with nested routers and
  client type inference; `@trpc/server` is an optional peer dependency.
- Transport-neutral error model: `ErrorCode` constants, `errorClass`,
  `isClientError`/`isServerError`/`matchError`, constructors (`notFound`,
  `conflict`, ...), `refine`, `sanitizeError`, and `reason` on errors.
- `examples/http-dashboard`, HTTP/tRPC/errors docs, and `docs/TRANSPORTS.md`
  (why GraphQL and gRPC are deferred).

### Changed

- `OhtoolsErrorCode` gains members (`OHTOOLS_BAD_REQUEST`, `UNAUTHORIZED`,
  `FORBIDDEN`, `NOT_FOUND`, `METHOD_NOT_ALLOWED`, `CONFLICT`, `PAYLOAD_TOO_LARGE`,
  `RATE_LIMITED`, `NOT_IMPLEMENTED`, `UNAVAILABLE`). Exhaustive `switch`es over it
  may need new cases. The CLI maps `OHTOOLS_NOT_FOUND` to exit code 4.

### Fixed

- MCP tools with a JSON Schema input failed at call time because the schema was
  passed where the SDK expects Zod; tools are now served through the SDK's
  low-level request handlers.

## [0.2.0] - 2026-06-28

## [0.1.1] - 2026-05-25

### Changed

- `ohtools init` and `ohtools create` now install the skill via
  `npx skills add https://github.com/bosun-sh/skills --skill ohtools` instead
  of bundling a static copy.

## [0.1.0] - 2026-05-09

### Added

- Initial public Ohtools package, CLI, MCP adapter, examples, docs, and release
  validation harness.

[Unreleased]: https://github.com/bosun-sh/ohtools/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/bosun-sh/ohtools/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/bosun-sh/ohtools/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/bosun-sh/ohtools/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/bosun-sh/ohtools/releases/tag/v0.1.0
