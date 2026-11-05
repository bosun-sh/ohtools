# HTTP Dashboard Example

A job-application tracker exposed over REST for a dashboard frontend and over MCP for an AI agent, from the same four tool definitions.

## Flow

1. `src/app.ts` defines the tools with `defineTool`. Each carries an `http` route, so it is also reachable as REST.
2. Missing applications fail with `refine(notFound, "application_not_found")`, which becomes HTTP 404 with `reason: "application_not_found"`.
3. `src/server.ts` serves everything with `httpServerConfig`: REST under `/api`, MCP at `/api/mcp`, CORS for the dashboard origin.
4. The `context` hook reads `x-user-id`. This is a demo, not authentication.

## Try It

```sh
bun run --cwd examples/http-dashboard start
curl -i -H 'x-user-id: u1' -X POST localhost:3000/api/applications \
  -H 'content-type: application/json' -d '{"company":"Acme","role":"Engineer"}'
curl -i -H 'x-user-id: u1' localhost:3000/api/applications
curl -i -H 'x-user-id: u1' -X PATCH localhost:3000/api/applications/1 \
  -H 'content-type: application/json' -d '{"status":"interview"}'
curl -i -X DELETE localhost:3000/api/applications/999
curl -N -H 'accept: text/event-stream' -H 'content-type: application/json' \
  -X POST localhost:3000/api/tools/applications.create -d '{"company":"Acme","role":"Dev"}'
```

Point an MCP client at `http://localhost:3000/api/mcp` to use the same tools as an agent.
