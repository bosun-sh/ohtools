# Transports

Implemented: MCP (stdio and Streamable HTTP), CLI, HTTP (RPC, opt-in REST, SSE,
WebSocket) and tRPC. GraphQL and gRPC are deliberately deferred.

## GraphQL

- Needs the `graphql` dependency and a JSON Schema to SDL conversion. Tool inputs
  are arbitrary JSON Schema (unions, `additionalProperties`, recursive refs) that
  SDL cannot always express, so a lossy or rejecting converter would be part of the
  adapter.
- Tool ids and `RunResult` are RPC-shaped; a graph of types would have to be
  invented. Much of the value (typed client, one endpoint) already comes from tRPC
  and the REST routes.
- Revisit when: a user has an existing GraphQL gateway and needs ohtools tools in
  it, and the tool schemas they use convert cleanly.

## gRPC

- Needs protobuf generation from JSON Schema (same expressiveness gap, plus field
  numbering that must stay stable across versions) and HTTP/2, where Bun's `http2`
  support is uneven.
- The main wins (streaming, binary framing) are already covered for browsers and
  agents by SSE, WebSockets and MCP.
- Revisit when: service-to-service callers require gRPC and Bun's HTTP/2 server
  support is reliable.
