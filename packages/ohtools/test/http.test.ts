import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Effect } from "effect";
import {
  conflict,
  ErrorCode,
  jsonSchema,
  notFound,
  Ohtools,
  refine,
  throwError,
  unauthorized,
} from "../src";
import { HttpStatus, httpHandler, httpServerConfig, httpStatusFor } from "../src/adapters/http";

const idSchema = jsonSchema<{ id: string; name?: string }>({
  type: "object",
  properties: { id: { type: "string" }, name: { type: "string" } },
  required: ["id"],
});

const appNotFound = refine(notFound, "application_not_found");

const build = () =>
  new Ohtools()
    .tool("echo", {
      description: "Echo.",
      input: jsonSchema<{ text: string }>({
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      }),
      run: (input) => input,
    })
    .tool("steps", {
      description: "Emits progress.",
      run: async (_i, ctx) => {
        ctx.emit?.({ step: 1 });
        ctx.emit?.({ step: 2 });
        return "done";
      },
    })
    .tool("slow", {
      description: "Waits.",
      run: (_i, ctx) =>
        new Promise((_resolve, reject) =>
          ctx.signal?.addEventListener("abort", () => reject(new Error("x"))),
        ),
    })
    .tool("boom", {
      description: "Throws.",
      run: () => {
        throw new Error("secret detail");
      },
    })
    .tool("clash", { description: "Conflict.", run: () => throwError(conflict("Already there.")) })
    .tool("whoami", {
      description: "Reads context.",
      run: (_i, ctx) => ({ user: ctx.metadata.user ?? null }),
    })
    .tool("apps.get", {
      description: "Get application.",
      http: { method: "GET", path: "/applications/:id" },
      input: idSchema,
      run: ({ id }) =>
        id === "1" ? { id, name: "ok" } : Effect.fail(appNotFound(`Application ${id} not found.`)),
    })
    .tool("apps.patch", {
      description: "Patch application.",
      http: { method: "PATCH", path: "/applications/:id" },
      input: idSchema,
      run: (input) => input,
    })
    .tool("only.explore", { description: "Explore only.", mode: "explore", run: () => null });

const call = (handler: (req: Request) => Promise<Response>, path: string, init: RequestInit = {}) =>
  handler(new Request(`http://x${path}`, init));
const post = (body: unknown, extra: RequestInit = {}): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
  ...extra,
});

describe("http errors", () => {
  test("every code has a status", () => {
    for (const code of Object.values(ErrorCode)) {
      expect(httpStatusFor({ code, message: "" })).toBeGreaterThanOrEqual(400);
    }
  });
});

describe("http handler", () => {
  const handler = httpHandler(build(), { cors: { origin: ["https://app.test"] } });

  test("introspection routes", async () => {
    expect(await (await call(handler, "/tools")).json()).toMatchObject({ ok: true });
    expect((await call(handler, "/explore/echo")).status).toBe(200);
    expect((await call(handler, "/graph")).status).toBe(200);
    const docs = await (await call(handler, "/docs?format=json")).json();
    expect(docs.ok).toBe(true);
    expect((await call(handler, "/docs")).headers.get("content-type")).toContain("markdown");
  });

  test("run, validation, bad json, size, unknown", async () => {
    const run = await call(handler, "/tools/echo", post({ text: "hi" }));
    expect(run.status).toBe(200);
    expect((await run.json()).data.output).toEqual({ text: "hi" });
    expect((await call(handler, "/tools/echo", post({}))).status).toBe(422);
    const bad = await call(handler, "/tools/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    expect(bad.status).toBe(400);
    expect(
      (
        await call(handler, "/tools/echo", {
          method: "POST",
          body: "x",
          headers: { "content-type": "text/plain" },
        })
      ).status,
    ).toBe(400);
    expect((await call(handler, "/nope")).status).toBe(404);
    expect((await call(handler, "/tools/missing", post({}))).status).toBe(404);
    const small = httpHandler(build(), { maxBodyBytes: 5 });
    expect((await call(small, "/tools/echo", post({ text: "too long" }))).status).toBe(413);
  });

  test("405 with Allow, explore-only tool, HEAD, OPTIONS", async () => {
    const wrong = await call(handler, "/tools/echo");
    expect(wrong.status).toBe(405);
    expect(wrong.headers.get("allow")).toContain("POST");
    expect((await call(handler, "/tools/only.explore", post({}))).status).toBe(405);
    const head = await call(handler, "/tools", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    const options = await call(handler, "/tools/echo", {
      method: "OPTIONS",
      headers: { origin: "https://app.test" },
    });
    expect(options.status).toBe(204);
    expect(options.headers.get("access-control-allow-origin")).toBe("https://app.test");
    const other = await call(handler, "/tools", { headers: { origin: "https://evil.test" } });
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });

  test("opt-in REST maps params, query and body; params win", async () => {
    const get = await call(handler, "/applications/1?name=q");
    expect((await get.json()).data.output).toEqual({ id: "1", name: "ok" });
    const missing = await call(handler, "/applications/9");
    expect(missing.status).toBe(404);
    expect((await missing.json()).error).toMatchObject({
      code: ErrorCode.NOT_FOUND,
      reason: "application_not_found",
    });
    const patch = await call(handler, "/applications/7", {
      ...post({ id: "spoofed", name: "n" }),
      method: "PATCH",
    });
    expect((await patch.json()).data.output).toEqual({ id: "7", name: "n" });
  });

  test("route validation throws at creation", () => {
    const dup = new Ohtools()
      .tool("a", { description: "a", http: { method: "GET", path: "/x/:id" }, run: () => 1 })
      .tool("b", { description: "b", http: { method: "GET", path: "/x/:other" }, run: () => 1 });
    expect(() => httpHandler(dup)).toThrow();
    const builtin = new Ohtools().tool("a", {
      description: "a",
      http: { method: "GET", path: "/tools" },
      run: () => 1,
    });
    expect(() => httpHandler(builtin)).toThrow();
    const ex = new Ohtools().tool("a", {
      description: "a",
      mode: "explore",
      http: { method: "GET", path: "/z" },
      run: () => 1,
    });
    expect(() => httpHandler(ex)).toThrow();
    const wild = new Ohtools().tool("a", {
      description: "a",
      http: { method: "GET", path: "/z/*" },
      run: () => 1,
    });
    expect(() => httpHandler(wild)).toThrow();
  });

  test("context hook: failure maps, metadata reaches handler", async () => {
    const guarded = httpHandler(build(), {
      context: (req) => {
        const user = req.headers.get("x-user-id");
        return user ? { user } : Effect.fail(unauthorized("Sign in."));
      },
    });
    expect((await call(guarded, "/tools/whoami", post({}))).status).toBe(401);
    const ok = await call(
      guarded,
      "/tools/whoami",
      post({}, { headers: { "content-type": "application/json", "x-user-id": "u1" } }),
    );
    expect((await ok.json()).data.output).toEqual({ user: "u1" });
  });

  test("handler errors map and are sanitized", async () => {
    expect((await call(handler, "/tools/clash", post({}))).status).toBe(409);
    const boom = await call(handler, "/tools/boom", post({}));
    expect(boom.status).toBe(500);
    const body = await boom.json();
    expect(body.error.message).toBe("Internal server error.");
    expect(body.error.cause).toBeUndefined();
    const debug = await (
      await call(httpHandler(build(), { debug: true }), "/tools/boom", post({}))
    ).json();
    expect(debug.error.message).toContain("secret detail");
    expect(debug.error.cause).toBeUndefined();
  });

  test("introspection:false hides GET routes", async () => {
    const closed = httpHandler(build(), { introspection: false });
    expect((await call(closed, "/tools")).status).toBe(404);
    expect((await call(closed, "/graph")).status).toBe(404);
    expect((await call(closed, "/tools/echo", post({ text: "a" }))).status).toBe(200);
  });

  test("HttpStatus table is exported", () => {
    expect(HttpStatus.NOT_FOUND).toBe(404);
  });
});

describe("sse", () => {
  const handler = httpHandler(build());
  const sse = {
    ...post({}),
    headers: { "content-type": "application/json", accept: "text/event-stream" },
  };

  test("start, progress, progress, result", async () => {
    const res = await call(handler, "/tools/steps", sse);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    const events = [...(await res.text()).matchAll(/^event: (\w+)$/gm)].map((m) => m[1]);
    expect(events).toEqual(["start", "progress", "progress", "result"]);
  });

  test("failure ends with error; pre-stream errors are JSON", async () => {
    const res = await call(handler, "/tools/boom", sse);
    expect([...(await res.text()).matchAll(/^event: (\w+)$/gm)].map((m) => m[1])).toEqual([
      "start",
      "error",
    ]);
    expect((await call(handler, "/tools/missing", sse)).status).toBe(404);
    expect((await call(handler, "/tools/echo", sse)).status).toBe(422);
  });
});

describe("bun server transports", () => {
  const app = build();
  const config = httpServerConfig(app, {
    mcp: true,
    websocket: true,
    context: () => ({ user: "ws" }),
  });
  const server = Bun.serve({
    port: 0,
    fetch: config.fetch as never,
    websocket: config.websocket as never,
  });
  const base = `http://localhost:${server.port}`;

  test("mcp streamable http lists and calls tools", async () => {
    const client = new Client({ name: "t", version: "1" });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names).toContain("echo");
    expect(names).toContain("ohtools.explore");
    const result = await client.callTool({ name: "echo", arguments: { text: "hi" } });
    expect(JSON.stringify(result.content)).toContain("hi");
    await client.close();
  });

  const open = () =>
    new Promise<{ ws: WebSocket; next: () => Promise<any> }>((resolve) => {
      const ws = new WebSocket(`ws://localhost:${server.port}/ws`);
      const queue: any[] = [];
      let waiter: ((v: any) => void) | undefined;
      ws.onmessage = (e) => {
        const msg = JSON.parse(String(e.data));
        if (waiter) {
          waiter(msg);
          waiter = undefined;
        } else queue.push(msg);
      };
      ws.onopen = () =>
        resolve({
          ws,
          next: () =>
            queue.length
              ? Promise.resolve(queue.shift())
              : new Promise((r) => {
                  waiter = r;
                }),
        });
    });

  test("websocket run, cancel, malformed", async () => {
    const { ws, next } = await open();
    ws.send(JSON.stringify({ id: "1", type: "run", toolId: "steps", input: {} }));
    expect((await next()).type).toBe("progress");
    expect((await next()).type).toBe("progress");
    expect(await next()).toMatchObject({ id: "1", type: "result" });
    ws.send(JSON.stringify({ id: "2", type: "run", toolId: "slow" }));
    await Bun.sleep(20);
    ws.send(JSON.stringify({ id: "2", type: "cancel" }));
    expect((await next()).error.code).toBe(ErrorCode.CANCELLED);
    ws.send("not json");
    expect(await next()).toMatchObject({
      id: null,
      type: "error",
      error: { code: ErrorCode.BAD_REQUEST },
    });
    ws.close();
  });

  test("teardown", () => {
    server.stop(true);
  });
});
