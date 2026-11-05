import { httpServerConfig } from "@bosun-sh/ohtools/adapters/http";
import app from "./app";

const config = httpServerConfig(app, {
  basePath: "/api",
  // Demo only, NOT authentication: any caller can claim any id. Verify a real session/JWT here.
  context: (request) => ({ userId: request.headers.get("x-user-id") ?? "anonymous" }),
  cors: { origin: ["http://localhost:5173"] },
  mcp: true, // agents connect to http://localhost:3000/api/mcp
});

const server = Bun.serve({
  port: 3000,
  fetch: config.fetch as never,
  websocket: config.websocket as never,
});
console.log(`Dashboard API on ${server.url}api (REST) and ${server.url}api/mcp (MCP)`);
