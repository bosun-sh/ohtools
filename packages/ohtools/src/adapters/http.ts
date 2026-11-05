import { Effect } from "effect";
import { serializeGraph } from "../core";
import { generateDocsJson, generateDocsMarkdown } from "../docs";
import { makeError, normalizeError, sanitizeError, throwError } from "../errors";
import { parseWithSchema } from "../schemas";
import type {
  AdapterDefinition,
  BuiltOhtoolsApp,
  Envelope,
  ErrorEnvelope,
  HttpRoute,
  JsonValue,
  Metadata,
  OhtoolsError,
  OhtoolsErrorCode,
  OhtoolsRegistry,
  OhtoolsRuntime,
  RuntimeOptions,
} from "../types";
import { ErrorCode } from "../types";
import { type McpAdapterOptions, mcpHttpHandler } from "./mcp";

export const HttpStatus = {
  OK: 200,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_CONTENT: 422,
  TOO_MANY_REQUESTS: 429,
  CLIENT_CLOSED_REQUEST: 499,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;
export type HttpStatus = (typeof HttpStatus)[keyof typeof HttpStatus];

/** One exhaustive table: adding an `ErrorCode` without a status fails to compile. */
const statusByCode = {
  [ErrorCode.INVALID_ID]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.DUPLICATE_TOOL]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.DUPLICATE_GROUP]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.DUPLICATE_ADAPTER]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.INCOMPATIBLE_METADATA]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.MISSING_NEXT_STEP]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.TOOL_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.GROUP_NOT_RUNNABLE]: HttpStatus.METHOD_NOT_ALLOWED,
  [ErrorCode.TOOL_NOT_RUNNABLE]: HttpStatus.METHOD_NOT_ALLOWED,
  [ErrorCode.VALIDATION_ERROR]: HttpStatus.UNPROCESSABLE_CONTENT,
  [ErrorCode.HANDLER_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.NEXT_STEP_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.CANCELLED]: HttpStatus.CLIENT_CLOSED_REQUEST,
  [ErrorCode.TIMEOUT]: HttpStatus.GATEWAY_TIMEOUT,
  [ErrorCode.ADAPTER_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.BAD_REQUEST]: HttpStatus.BAD_REQUEST,
  [ErrorCode.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [ErrorCode.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.METHOD_NOT_ALLOWED]: HttpStatus.METHOD_NOT_ALLOWED,
  [ErrorCode.CONFLICT]: HttpStatus.CONFLICT,
  [ErrorCode.PAYLOAD_TOO_LARGE]: HttpStatus.PAYLOAD_TOO_LARGE,
  [ErrorCode.RATE_LIMITED]: HttpStatus.TOO_MANY_REQUESTS,
  [ErrorCode.NOT_IMPLEMENTED]: HttpStatus.NOT_IMPLEMENTED,
  [ErrorCode.UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
} as const satisfies Record<OhtoolsErrorCode, HttpStatus>;

export const httpStatusFor = (error: OhtoolsError): HttpStatus => statusByCode[error.code];

export type HttpContextResult =
  | Metadata
  | Promise<Metadata>
  | Effect.Effect<Metadata, OhtoolsError>;

export interface HttpAdapterOptions {
  /** Mount everything under this prefix, for example `/api`. */
  basePath?: string;
  /** Per-request hook; its result merges into `context.metadata`. ohtools ships no auth. */
  context?: (request: Request) => HttpContextResult;
  /** CORS is off unless set. `"*"` cannot be combined with `credentials`. */
  cors?: { origin: string | readonly string[]; credentials?: boolean };
  /** Serve the GET routes (`/tools`, `/explore`, `/graph`, `/docs`). Default true. */
  introspection?: boolean;
  /** Default 1 MiB. */
  maxBodyBytes?: number;
  /** Expose server-error messages in responses. Default false. */
  debug?: boolean;
  runtime?: RuntimeOptions;
  /** Mount MCP Streamable HTTP at `${basePath}/mcp`. */
  mcp?: true | McpAdapterOptions;
  /** Bun only: upgrade `GET ${basePath}/ws`. Ignored by `httpHandler` alone. */
  websocket?: boolean;
}

type Method = HttpRoute["method"];
type AppLike =
  | BuiltOhtoolsApp
  | { build(): OhtoolsRegistry; runtime(options?: RuntimeOptions): unknown };

interface Ctx {
  req: Request;
  params: Readonly<Record<string, string>>;
  url: URL;
  metadata: Metadata;
}

interface Route {
  method: Method;
  segments: readonly string[];
  handle: (ctx: Ctx) => Promise<Response>;
}

type ContextResult = { ok: true; metadata: Metadata } | { ok: false; error: OhtoolsError };

export interface WsData {
  metadata: Metadata;
  runs: Map<string, AbortController>;
}

const DEFAULT_MAX_BODY = 1024 * 1024;
const SEGMENT = /^(?:[A-Za-z0-9_\-.~]+|:[A-Za-z_][A-Za-z0-9_]*)$/;
const encoder = new TextEncoder();

const toApp = (app: AppLike): BuiltOhtoolsApp =>
  "registry" in app
    ? app
    : {
        registry: app.build(),
        runtime: (options) => app.runtime(options) as OhtoolsRuntime,
      };

const splitPath = (path: string) => path.split("/").filter(Boolean);
const shape = (segments: readonly string[]) =>
  segments.map((segment) => (segment.startsWith(":") ? ":" : segment)).join("/");

function adapterError(message: string, path?: string[]): never {
  return throwError(makeError(ErrorCode.ADAPTER_ERROR, message, { path }));
}

function validateBasePath(basePath: string | undefined) {
  if (!basePath || basePath === "/") return "";
  if (!basePath.startsWith("/") || basePath.endsWith("/")) {
    adapterError(`HTTP basePath "${basePath}" must start with "/" and not end with "/".`);
  }
  return basePath;
}

/** Web-standard `Request -> Response` handler. Works on Bun, Deno, Workers and Hono. */
export function httpHandler(
  app: AppLike,
  options: HttpAdapterOptions = {},
): (req: Request) => Promise<Response> {
  return createHttp(toApp(app), options).handle;
}

function createHttp(app: BuiltOhtoolsApp, options: HttpAdapterOptions) {
  const basePath = validateBasePath(options.basePath);
  const debug = options.debug ?? false;
  const maxBody = options.maxBodyBytes ?? DEFAULT_MAX_BODY;
  const cors = options.cors;
  if (cors?.credentials && cors.origin === "*") {
    adapterError('HTTP cors: origin "*" cannot be combined with credentials.');
  }
  const runtime = app.runtime(options.runtime);

  const runTool = (
    toolId: string,
    input: unknown,
    metadata: Metadata,
    signal?: AbortSignal,
    emit?: (event: JsonValue) => void,
  ) =>
    Effect.runPromise(
      Effect.either(
        runtime.run<unknown, unknown>({ toolId, input, context: { signal, metadata, emit } }),
      ),
    );

  const exploreNode = (nodeId: string | undefined, depth?: number, includeUnavailable?: boolean) =>
    Effect.runPromise(Effect.either(runtime.explore({ nodeId, depth, includeUnavailable })));

  // --- responses -----------------------------------------------------------

  const publicError = (error: OhtoolsError) => sanitizeError(error, debug);

  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", ...headers },
    });
  const ok = (data: unknown) => json(HttpStatus.OK, { ok: true, data } satisfies Envelope<unknown>);
  const fail = (error: OhtoolsError, headers?: Record<string, string>) =>
    json(
      httpStatusFor(error),
      { ok: false, error: publicError(error) } satisfies ErrorEnvelope,
      headers,
    );

  const withCors = (req: Request, res: Response): Response => {
    if (!cors) return res;
    const origin = req.headers.get("origin");
    const allowed = typeof cors.origin === "string" ? [cors.origin] : cors.origin;
    const headers = new Headers(res.headers);
    headers.append("vary", "Origin");
    if (origin && (allowed.includes("*") || allowed.includes(origin))) {
      headers.set("access-control-allow-origin", allowed.includes("*") ? "*" : origin);
      if (cors.credentials) headers.set("access-control-allow-credentials", "true");
    }
    return new Response(res.body, { status: res.status, headers });
  };

  // --- request parsing ---------------------------------------------------------

  async function readBody(req: Request): Promise<unknown> {
    const declared = Number(req.headers.get("content-length"));
    if (declared > maxBody) {
      throwError(makeError(ErrorCode.PAYLOAD_TOO_LARGE, `Request body exceeds ${maxBody} bytes.`));
    }
    if (!req.body) return {};
    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBody) {
        await reader.cancel();
        throwError(
          makeError(ErrorCode.PAYLOAD_TOO_LARGE, `Request body exceeds ${maxBody} bytes.`),
        );
      }
      chunks.push(value);
    }
    if (size === 0) return {};
    const type = req.headers.get("content-type") ?? "";
    if (!/\bjson\b/i.test(type)) {
      throwError(makeError(ErrorCode.BAD_REQUEST, "Content-Type must be application/json."));
    }
    const text = new TextDecoder().decode(Buffer.concat(chunks));
    try {
      return JSON.parse(text);
    } catch (cause) {
      return throwError(
        makeError(ErrorCode.BAD_REQUEST, "Request body is not valid JSON.", { cause }),
      );
    }
  }

  const resolveContext = async (req: Request): Promise<ContextResult> => {
    if (!options.context) return { ok: true, metadata: {} };
    try {
      const value = options.context(req);
      if (Effect.isEffect(value)) {
        const result = await Effect.runPromise(Effect.either(value));
        return result._tag === "Left"
          ? { ok: false, error: result.left }
          : { ok: true, metadata: result.right };
      }
      return { ok: true, metadata: await value };
    } catch (cause) {
      return { ok: false, error: normalizeError(cause, ErrorCode.ADAPTER_ERROR) };
    }
  };

  // --- SSE -----------------------------------------------------------------------

  const wantsStream = (req: Request) =>
    (req.headers.get("accept") ?? "").includes("text/event-stream");

  function streamRun(ctx: Ctx, toolId: string, input: unknown): Response {
    const abort = new AbortController();
    ctx.req.signal.addEventListener("abort", () => abort.abort(), { once: true });
    let closed = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: string, data: unknown) => {
          if (closed) return;
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        send("start", { toolId });
        runTool(toolId, input, ctx.metadata, abort.signal, (event) => send("progress", event))
          .then((result) => {
            if (result._tag === "Left") send("error", { error: publicError(result.left) });
            else send("result", result.right);
          })
          .catch((cause) =>
            send("error", { error: publicError(normalizeError(cause, ErrorCode.ADAPTER_ERROR)) }),
          )
          .finally(() => {
            if (closed) return;
            closed = true;
            controller.close();
          });
      },
      cancel() {
        closed = true;
        abort.abort();
      },
    });
    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  }

  async function runRoute(ctx: Ctx, toolId: string, input: unknown): Promise<Response> {
    if (wantsStream(ctx.req)) {
      // Fail fast with a normal JSON response before the stream opens.
      const tool = app.registry.tools.get(toolId);
      if (!tool) {
        return fail(
          makeError(ErrorCode.TOOL_NOT_FOUND, `Tool "${toolId}" was not found.`, {
            path: [toolId],
          }),
        );
      }
      if (tool.mode === "explore") {
        return fail(
          makeError(ErrorCode.TOOL_NOT_RUNNABLE, `Tool "${toolId}" is explore-only.`, {
            path: [toolId],
          }),
        );
      }
      try {
        parseWithSchema(tool.input, input, [toolId, "input"]);
      } catch (cause) {
        return fail(normalizeError(cause, ErrorCode.VALIDATION_ERROR));
      }
      return streamRun(ctx, toolId, input);
    }
    const result = await runTool(toolId, input, ctx.metadata, ctx.req.signal);
    return result._tag === "Left" ? fail(result.left) : ok(result.right);
  }

  // --- routes ------------------------------------------------------------------------

  const routes: Route[] = [];
  const reserved = new Set<string>();
  const add = (method: Method, path: string, handle: Route["handle"]) => {
    routes.push({ method, segments: splitPath(path), handle });
    reserved.add(`${method} ${shape(splitPath(path))}`);
  };

  if (options.introspection ?? true) {
    add("GET", "/tools", async () =>
      ok(
        [...app.registry.tools.values()].map((tool) => ({
          id: tool.id,
          title: tool.title,
          description: tool.description,
          mode: tool.mode ?? "both",
          http: tool.http,
        })),
      ),
    );
    const explore = async ({ params, url }: Ctx) => {
      const depth = url.searchParams.get("depth");
      const result = await exploreNode(
        params.nodeId,
        depth === null ? undefined : Number(depth),
        url.searchParams.get("includeUnavailable") === "true",
      );
      return result._tag === "Left" ? fail(result.left) : ok(result.right);
    };
    add("GET", "/explore", explore);
    add("GET", "/explore/:nodeId", explore);
    add("GET", "/graph", async () => ok(serializeGraph(app.registry.graph)));
    add("GET", "/docs", async ({ url }) => {
      const format = url.searchParams.get("format") ?? "markdown";
      if (format === "json") return ok(generateDocsJson(app.registry));
      if (format !== "markdown") {
        return fail(makeError(ErrorCode.BAD_REQUEST, `Unknown docs format "${format}".`));
      }
      return new Response(generateDocsMarkdown(app.registry), {
        headers: { "content-type": "text/markdown; charset=utf-8" },
      });
    });
  }
  add("POST", "/tools/:toolId", async (ctx) =>
    runRoute(ctx, ctx.params.toolId as string, await readBody(ctx.req)),
  );

  const mcpPath = options.mcp ? "/mcp" : undefined;
  const wsPath = options.websocket ? "/ws" : undefined;
  for (const path of [mcpPath, wsPath]) if (path) reserved.add(`* ${shape(splitPath(path))}`);

  for (const tool of app.registry.tools.values()) {
    const route = tool.http;
    if (!route) continue;
    const at = [tool.id, "http"];
    if (tool.mode === "explore")
      adapterError(`Explore-only tool "${tool.id}" cannot have an http route.`, at);
    const segments = splitPath(route.path);
    if (
      !route.path.startsWith("/") ||
      !segments.length ||
      !segments.every((s) => SEGMENT.test(s))
    ) {
      adapterError(`Tool "${tool.id}" has an invalid http path "${route.path}".`, at);
    }
    const key = `${route.method} ${shape(segments)}`;
    if (reserved.has(key) || reserved.has(`* ${shape(segments)}`)) {
      adapterError(
        `Tool "${tool.id}" http route ${route.method} ${route.path} is already taken.`,
        at,
      );
    }
    reserved.add(key);
    routes.push({
      method: route.method,
      segments,
      handle: async (ctx) => {
        const fromQuery = route.method === "GET" || route.method === "DELETE";
        const body = fromQuery ? Object.fromEntries(ctx.url.searchParams) : await readBody(ctx.req);
        if (typeof body !== "object" || body === null || Array.isArray(body)) {
          return fail(makeError(ErrorCode.BAD_REQUEST, "Request body must be a JSON object."));
        }
        return runRoute(ctx, tool.id, { ...body, ...ctx.params });
      },
    });
  }
  // Static segments win over `:param` segments.
  routes.sort((a, b) => count(a.segments) - count(b.segments));
  function count(segments: readonly string[]) {
    return segments.filter((s) => s.startsWith(":")).length;
  }

  function match(segments: readonly string[]) {
    const found: { route: Route; params: Record<string, string> }[] = [];
    for (const route of routes) {
      if (route.segments.length !== segments.length) continue;
      const params: Record<string, string> = {};
      const hit = route.segments.every((pattern, i) => {
        const actual = segments[i] as string;
        if (!pattern.startsWith(":")) return pattern === actual;
        params[pattern.slice(1)] = decodeURIComponent(actual);
        return true;
      });
      if (hit) found.push({ route, params });
    }
    return found;
  }

  const mcpHandler = options.mcp
    ? mcpHttpHandler(app, {
        ...(options.mcp === true ? {} : options.mcp),
        metadata: async (req) => {
          const result = await resolveContext(req);
          if (!result.ok) throwError(result.error);
          return result.metadata;
        },
      })
    : undefined;

  const MCP_METHODS = "GET, POST, DELETE, OPTIONS";

  async function route(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (basePath && url.pathname !== basePath && !url.pathname.startsWith(`${basePath}/`)) {
      return fail(makeError(ErrorCode.NOT_FOUND, "Not found."));
    }
    const path = url.pathname.slice(basePath.length) || "/";
    const segments = splitPath(path);
    const method = req.method.toUpperCase();

    if (mcpPath && path === mcpPath) {
      if (method === "OPTIONS") return preflight(req, MCP_METHODS);
      if (!MCP_METHODS.includes(method)) {
        return fail(makeError(ErrorCode.METHOD_NOT_ALLOWED, "Method not allowed."), {
          allow: MCP_METHODS,
        });
      }
      return (mcpHandler as NonNullable<typeof mcpHandler>)(req);
    }
    if (wsPath && path === wsPath) {
      // Reaching here means this runtime did not upgrade the connection.
      return fail(makeError(ErrorCode.BAD_REQUEST, "WebSocket upgrade required."));
    }

    let candidates: ReturnType<typeof match>;
    try {
      candidates = match(segments);
    } catch (cause) {
      return fail(
        makeError(ErrorCode.BAD_REQUEST, "Malformed percent-encoding in path.", { cause }),
      );
    }
    if (!candidates.length) return fail(makeError(ErrorCode.NOT_FOUND, `No route for ${path}.`));
    const allowed = [...new Set(candidates.map((c) => c.route.method))];
    const allow = [
      ...new Set([...allowed, ...(allowed.includes("GET") ? ["HEAD"] : []), "OPTIONS"]),
    ].join(", ");
    if (method === "OPTIONS") return preflight(req, allow);
    const effective = method === "HEAD" ? "GET" : method;
    const hit = candidates.find((c) => c.route.method === effective);
    if (!hit) {
      return fail(makeError(ErrorCode.METHOD_NOT_ALLOWED, `${method} is not allowed on ${path}.`), {
        allow,
      });
    }
    const context = await resolveContext(req);
    if (!context.ok) return fail(context.error);
    const res = await hit.route.handle({
      req,
      params: hit.params,
      url,
      metadata: context.metadata,
    });
    return method === "HEAD"
      ? new Response(null, { status: res.status, headers: res.headers })
      : res;
  }

  function preflight(req: Request, allow: string) {
    const headers: Record<string, string> = { allow };
    if (cors) {
      headers["access-control-allow-methods"] = allow;
      headers["access-control-allow-headers"] =
        req.headers.get("access-control-request-headers") ?? "content-type, authorization";
      headers["access-control-max-age"] = "600";
    }
    return new Response(null, { status: HttpStatus.NO_CONTENT, headers });
  }

  const handle = async (req: Request): Promise<Response> => {
    let res: Response;
    try {
      res = await route(req);
    } catch (cause) {
      res = fail(normalizeError(cause, ErrorCode.ADAPTER_ERROR));
    }
    return withCors(req, res);
  };

  // --- WebSocket (Bun) ------------------------------------------------------------

  const send = (ws: { send(data: string): unknown }, message: unknown) =>
    ws.send(JSON.stringify(message));

  const websocket = {
    open() {},
    message(
      ws: { data: WsData; send(data: string): unknown },
      raw: string | Buffer | ArrayBuffer | Uint8Array,
    ) {
      let id: string | null = null;
      const reply = (type: string, extra: Record<string, unknown>) =>
        send(ws, { id, type, ...extra });
      const error = (e: OhtoolsError) => reply("error", { error: publicError(e) });
      let message: Record<string, unknown>;
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
          throw new Error();
        message = parsed;
      } catch {
        return error(makeError(ErrorCode.BAD_REQUEST, "Message must be a JSON object."));
      }
      if (typeof message.id === "string" || typeof message.id === "number") id = String(message.id);
      if (id === null) return error(makeError(ErrorCode.BAD_REQUEST, 'Message needs an "id".'));
      const key = id;
      const { type } = message;

      if (type === "cancel") {
        const run = ws.data.runs.get(key);
        if (!run) return error(makeError(ErrorCode.BAD_REQUEST, `No in-flight request "${key}".`));
        run.abort();
        return;
      }
      if (type !== "run" && type !== "explore") {
        return error(makeError(ErrorCode.BAD_REQUEST, `Unknown message type "${String(type)}".`));
      }
      if (ws.data.runs.has(key)) {
        return error(makeError(ErrorCode.BAD_REQUEST, `Request "${key}" is already in flight.`));
      }
      const abort = new AbortController();
      ws.data.runs.set(key, abort);
      const done = (
        promise: Promise<{ _tag: "Left"; left: OhtoolsError } | { _tag: "Right"; right: unknown }>,
      ) =>
        promise
          .then((result) =>
            result._tag === "Left" ? error(result.left) : reply("result", { data: result.right }),
          )
          .catch((cause) => error(normalizeError(cause, ErrorCode.ADAPTER_ERROR)))
          .finally(() => ws.data.runs.delete(key));

      if (type === "explore") {
        const nodeId = typeof message.nodeId === "string" ? message.nodeId : undefined;
        return void done(exploreNode(nodeId));
      }
      if (typeof message.toolId !== "string") {
        ws.data.runs.delete(key);
        return error(makeError(ErrorCode.BAD_REQUEST, 'Run needs a string "toolId".'));
      }
      void done(
        runTool(message.toolId, message.input ?? {}, ws.data.metadata, abort.signal, (data) =>
          reply("progress", { data }),
        ),
      );
    },
    close(ws: { data: WsData }) {
      for (const run of ws.data.runs.values()) run.abort();
      ws.data.runs.clear();
    },
  };

  return { handle, websocket, resolveContext, fail, wsPath: wsPath && `${basePath}${wsPath}` };
}

export interface HttpServerConfig {
  fetch(
    req: Request,
    server: { upgrade(req: Request, options: { data: WsData }): boolean },
  ): Promise<Response | undefined>;
  websocket: ReturnType<typeof createHttp>["websocket"];
}

/** `fetch` + `websocket` pair for `Bun.serve`, including the WebSocket upgrade. */
export function httpServerConfig(app: AppLike, options: HttpAdapterOptions = {}): HttpServerConfig {
  const http = createHttp(toApp(app), options);
  return {
    websocket: http.websocket,
    async fetch(req, server) {
      if (
        http.wsPath &&
        new URL(req.url).pathname === http.wsPath &&
        req.headers.get("upgrade")?.toLowerCase() === "websocket"
      ) {
        const context = await http.resolveContext(req);
        if (!context.ok) return http.fail(context.error);
        const upgraded = server.upgrade(req, {
          data: { metadata: context.metadata, runs: new Map() },
        });
        if (upgraded) return undefined;
      }
      return http.handle(req);
    },
  };
}

export function httpAdapter(
  options: HttpAdapterOptions & { port?: number; hostname?: string } = {},
): AdapterDefinition {
  return {
    id: "http",
    kind: "http",
    attach(app: BuiltOhtoolsApp) {
      let server: { stop(force?: boolean): unknown } | undefined;
      return {
        start() {
          if (server) return;
          const config = httpServerConfig(app, options);
          server = Bun.serve({
            port: options.port ?? 3000,
            hostname: options.hostname,
            fetch: config.fetch as never,
            websocket: config.websocket as never,
          });
        },
        async stop() {
          await server?.stop(true);
          server = undefined;
        },
      };
    },
  };
}
