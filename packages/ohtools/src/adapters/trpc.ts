import { initTRPC, TRPCError } from "@trpc/server";
import { Effect } from "effect";
import { sanitizeError } from "../errors";
import type {
  DefinedTool,
  DefinedToolInput,
  DefinedToolOutput,
  Metadata,
  OhtoolsError,
  OhtoolsErrorCode,
  OhtoolsRuntime,
  RunResult,
} from "../types";
import { ErrorCode } from "../types";

type TrpcCode = ConstructorParameters<typeof TRPCError>[0]["code"];

/** One exhaustive table: adding an `ErrorCode` without a tRPC code fails to compile. */
const trpcCodeByCode = {
  [ErrorCode.INVALID_ID]: "INTERNAL_SERVER_ERROR",
  [ErrorCode.DUPLICATE_TOOL]: "INTERNAL_SERVER_ERROR",
  [ErrorCode.DUPLICATE_GROUP]: "INTERNAL_SERVER_ERROR",
  [ErrorCode.DUPLICATE_ADAPTER]: "INTERNAL_SERVER_ERROR",
  [ErrorCode.INCOMPATIBLE_METADATA]: "INTERNAL_SERVER_ERROR",
  [ErrorCode.MISSING_NEXT_STEP]: "INTERNAL_SERVER_ERROR",
  [ErrorCode.TOOL_NOT_FOUND]: "NOT_FOUND",
  [ErrorCode.GROUP_NOT_RUNNABLE]: "METHOD_NOT_SUPPORTED",
  [ErrorCode.TOOL_NOT_RUNNABLE]: "METHOD_NOT_SUPPORTED",
  [ErrorCode.VALIDATION_ERROR]: "UNPROCESSABLE_CONTENT",
  [ErrorCode.HANDLER_ERROR]: "INTERNAL_SERVER_ERROR",
  [ErrorCode.NEXT_STEP_ERROR]: "INTERNAL_SERVER_ERROR",
  [ErrorCode.CANCELLED]: "CLIENT_CLOSED_REQUEST",
  [ErrorCode.TIMEOUT]: "GATEWAY_TIMEOUT",
  [ErrorCode.ADAPTER_ERROR]: "INTERNAL_SERVER_ERROR",
  [ErrorCode.BAD_REQUEST]: "BAD_REQUEST",
  [ErrorCode.UNAUTHORIZED]: "UNAUTHORIZED",
  [ErrorCode.FORBIDDEN]: "FORBIDDEN",
  [ErrorCode.NOT_FOUND]: "NOT_FOUND",
  [ErrorCode.METHOD_NOT_ALLOWED]: "METHOD_NOT_SUPPORTED",
  [ErrorCode.CONFLICT]: "CONFLICT",
  [ErrorCode.PAYLOAD_TOO_LARGE]: "PAYLOAD_TOO_LARGE",
  [ErrorCode.RATE_LIMITED]: "TOO_MANY_REQUESTS",
  [ErrorCode.NOT_IMPLEMENTED]: "NOT_IMPLEMENTED",
  [ErrorCode.UNAVAILABLE]: "SERVICE_UNAVAILABLE",
} as const satisfies Record<OhtoolsErrorCode, TrpcCode>;

export const trpcCodeFor = (error: OhtoolsError): TrpcCode => trpcCodeByCode[error.code];

const isOhtoolsCause = (cause: unknown): cause is OhtoolsError =>
  typeof cause === "object" &&
  cause !== null &&
  typeof (cause as { code?: unknown }).code === "string" &&
  (cause as { code: string }).code.startsWith("OHTOOLS_");

// `any` context: the router is mounted in the caller's own tRPC context type.
const t = initTRPC.context<any>().create({
  // Exposes the (sanitized) ohtools error as `error.data.ohtools` on the client.
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      ohtools: isOhtoolsCause(error.cause)
        ? {
            code: error.cause.code,
            reason: error.cause.reason,
            path: error.cause.path,
            issues: (error.cause as { issues?: unknown }).issues,
          }
        : undefined,
    },
  }),
});

function query<I, O>(run: (input: I, ctx: unknown, signal?: AbortSignal) => Promise<O>) {
  return t.procedure
    .input((value: unknown) => value as I)
    .query(({ input, ctx, signal }) => run(input as I, ctx, signal));
}
function mutation<I, O>(run: (input: I, ctx: unknown, signal?: AbortSignal) => Promise<O>) {
  return t.procedure
    .input((value: unknown) => value as I)
    .mutation(({ input, ctx, signal }) => run(input as I, ctx, signal));
}
type QueryProcedure<I, O> = ReturnType<typeof query<I, O>>;
type MutationProcedure<I, O> = ReturnType<typeof mutation<I, O>>;

// Structural, so tools with any `Env` fit (a full `DefinedTool<any, ...>` is invariant in `Env`).
type AnyTool = Pick<DefinedTool, "id" | "mode" | "http"> & {
  readonly __types?: { readonly input: any; readonly output: any; readonly env: any };
};
type Split<S extends string> = S extends `${infer Head}.${infer Rest}`
  ? [Head, ...Split<Rest>]
  : [S];
type Nest<Path extends string[], Leaf> = Path extends [
  infer Head extends string,
  ...infer Rest extends string[],
]
  ? { [K in Head]: Nest<Rest, Leaf> }
  : Leaf;
type Leaf<Tool extends AnyTool> = Tool extends { http: { method: "GET" } }
  ? QueryProcedure<DefinedToolInput<Tool>, RunResult<DefinedToolOutput<Tool>>>
  : MutationProcedure<DefinedToolInput<Tool>, RunResult<DefinedToolOutput<Tool>>>;
type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (
  x: infer I,
) => void
  ? I
  : never;
type Flatten<T> = { [K in keyof T]: T[K] extends { _def: unknown } ? T[K] : Flatten<T[K]> };
type RecordOf<Tools extends readonly AnyTool[]> = Flatten<
  UnionToIntersection<{ [I in keyof Tools]: Nest<Split<Tools[I]["id"]>, Leaf<Tools[I]>> }[number]>
>;

export type OhtoolsRouter<Tools extends readonly AnyTool[]> = ReturnType<
  typeof t.router<RecordOf<Tools> extends infer R ? (R extends object ? R : never) : never>
>;

export interface TrpcRouterOptions<Ctx = unknown> {
  /** Maps the caller's tRPC context into `ToolExecutionContext.metadata`. */
  metadata?: (ctx: Ctx) => Metadata;
  /** Expose server-error messages. Default false. */
  debug?: boolean;
}

/**
 * Builds a tRPC router from `defineTool` results: `GET` tools become queries, the rest
 * mutations, dotted ids become nested routers. Validation happens once, in `runtime.run`.
 * Mount it with tRPC's own `fetchRequestHandler`.
 */
export function trpcRouter<const Tools extends readonly AnyTool[], Ctx = any>(
  runtime: OhtoolsRuntime,
  tools: Tools,
  options: TrpcRouterOptions<Ctx> = {},
): OhtoolsRouter<Tools> {
  const root: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const tool of tools) {
    if (tool.mode === "explore") continue;
    const run = async (input: unknown, ctx: unknown, signal?: AbortSignal) => {
      const result = await Effect.runPromise(
        Effect.either(
          runtime.run({
            toolId: tool.id,
            input,
            context: { signal, metadata: options.metadata?.(ctx as Ctx) },
          }),
        ),
      );
      if (result._tag === "Right") return result.right;
      const error = sanitizeError(result.left, options.debug);
      throw new TRPCError({ code: trpcCodeFor(result.left), message: error.message, cause: error });
    };
    const procedure = tool.http?.method === "GET" ? query(run) : mutation(run);
    const path = tool.id.split(".");
    const leaf = path.pop() as string;
    if (isUnsafePathKey(leaf)) throw conflictError(tool.id);
    let node = root;
    for (const segment of path) {
      if (isUnsafePathKey(segment)) throw conflictError(tool.id);
      const next = node[segment] ?? (Object.create(null) as Record<string, unknown>);
      node[segment] = next;
      if (!isPlainRecord(next)) throw conflictError(tool.id);
      node = next;
    }
    if (leaf in node) throw conflictError(tool.id);
    node[leaf] = procedure;
  }
  return t.router(root as never) as never;
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !("_def" in value);

const isUnsafePathKey = (key: string): boolean =>
  key === "__proto__" || key === "constructor" || key === "prototype";

const conflictError = (id: string) =>
  new Error(`OHTOOLS_ADAPTER_ERROR: tool "${id}" collides with another tool's nested path.`);
