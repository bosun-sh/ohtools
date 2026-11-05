import type { Effect, Layer } from "effect";

export type ToolId = string;
export type GroupId = string;
export type NodeId = ToolId | GroupId;
export type AdapterId = string;

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type Metadata = Readonly<Record<string, JsonValue>>;
export type JsonSchema = Readonly<Record<string, JsonValue>>;

export const ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;

export interface SchemaDefinition<T = unknown> {
  parse(input: unknown): T;
  jsonSchema?: JsonSchema;
  description?: string;
}

export type DefaultEnv = never;

export interface ValidationIssue {
  path: Array<string | number>;
  message: string;
  code?: string;
}

export interface OhtoolsError {
  code: OhtoolsErrorCode;
  message: string;
  path?: string[];
  cause?: unknown;
  metadata?: Metadata;
  /** App-specific refinement of `code`, for example "application_not_found". */
  reason?: string;
}

export interface ValidationError extends OhtoolsError {
  code: "OHTOOLS_VALIDATION_ERROR";
  issues: ValidationIssue[];
}

export const ErrorCode = {
  INVALID_ID: "OHTOOLS_INVALID_ID",
  DUPLICATE_TOOL: "OHTOOLS_DUPLICATE_TOOL",
  DUPLICATE_GROUP: "OHTOOLS_DUPLICATE_GROUP",
  DUPLICATE_ADAPTER: "OHTOOLS_DUPLICATE_ADAPTER",
  INCOMPATIBLE_METADATA: "OHTOOLS_INCOMPATIBLE_METADATA",
  MISSING_NEXT_STEP: "OHTOOLS_MISSING_NEXT_STEP",
  TOOL_NOT_FOUND: "OHTOOLS_TOOL_NOT_FOUND",
  GROUP_NOT_RUNNABLE: "OHTOOLS_GROUP_NOT_RUNNABLE",
  TOOL_NOT_RUNNABLE: "OHTOOLS_TOOL_NOT_RUNNABLE",
  VALIDATION_ERROR: "OHTOOLS_VALIDATION_ERROR",
  HANDLER_ERROR: "OHTOOLS_HANDLER_ERROR",
  NEXT_STEP_ERROR: "OHTOOLS_NEXT_STEP_ERROR",
  CANCELLED: "OHTOOLS_CANCELLED",
  TIMEOUT: "OHTOOLS_TIMEOUT",
  ADAPTER_ERROR: "OHTOOLS_ADAPTER_ERROR",
  BAD_REQUEST: "OHTOOLS_BAD_REQUEST",
  UNAUTHORIZED: "OHTOOLS_UNAUTHORIZED",
  FORBIDDEN: "OHTOOLS_FORBIDDEN",
  NOT_FOUND: "OHTOOLS_NOT_FOUND",
  METHOD_NOT_ALLOWED: "OHTOOLS_METHOD_NOT_ALLOWED",
  CONFLICT: "OHTOOLS_CONFLICT",
  PAYLOAD_TOO_LARGE: "OHTOOLS_PAYLOAD_TOO_LARGE",
  RATE_LIMITED: "OHTOOLS_RATE_LIMITED",
  NOT_IMPLEMENTED: "OHTOOLS_NOT_IMPLEMENTED",
  UNAVAILABLE: "OHTOOLS_UNAVAILABLE",
} as const;

export type OhtoolsErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export type Envelope<T> = { ok: true; data: T };
export type ErrorEnvelope = { ok: false; error: OhtoolsError };

export class OhtoolsException extends Error implements OhtoolsError {
  readonly code: OhtoolsErrorCode;
  readonly path?: string[];
  readonly cause?: unknown;
  readonly metadata?: Metadata;
  readonly reason?: string;

  constructor(error: OhtoolsError) {
    super(`${error.code}: ${error.message}`);
    this.name = "OhtoolsException";
    this.code = error.code;
    this.path = error.path;
    this.cause = error.cause;
    this.metadata = error.metadata;
    this.reason = error.reason;
  }
}

export interface ToolHierarchy {
  parent?: GroupId;
  level?: number;
  visible?: boolean;
}

export interface ToolExecutionContext<Env = DefaultEnv> {
  toolId: ToolId;
  signal?: AbortSignal;
  metadata: Metadata;
  env?: Env;
  /** Report a progress event; streamed by SSE and WebSocket transports, ignored elsewhere. */
  emit?: (event: JsonValue) => void;
}

export type ToolHandler<Input, Output, Env = DefaultEnv> = (
  input: Input,
  context: ToolExecutionContext<Env>,
) => Output | Promise<Output> | Effect.Effect<Output, OhtoolsError, Env>;

export interface ExploreEvent {
  kind: "explore";
  nodeId?: NodeId;
}

export interface RunEvent<Output = unknown> {
  kind: "run";
  toolId: ToolId;
  output: Output;
}

export type NextStepResolver = (
  event: ExploreEvent | RunEvent,
) => boolean | Promise<boolean> | Effect.Effect<boolean, OhtoolsError>;

export type NextStepDefinition =
  | NodeId
  | {
      id: NodeId;
      reason?: string;
      optional?: boolean;
      exploreFirst?: boolean;
      when?: NextStepResolver;
    };

export interface HttpRoute {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Path with optional `:param` segments, for example `/applications/:id`. */
  path: `/${string}`;
}

export interface ToolDefinition<Input = unknown, Output = unknown, Env = DefaultEnv> {
  id: ToolId;
  /** Opt in to a REST route in addition to `POST /tools/:toolId`. */
  http?: HttpRoute;
  title?: string;
  description: string;
  input?: SchemaDefinition<Input>;
  output?: SchemaDefinition<Output>;
  mode?: "explore" | "run" | "both";
  metadata?: Metadata;
  hierarchy?: ToolHierarchy;
  next?: NextStepDefinition[];
  run: ToolHandler<Input, Output, Env>;
}

export type ToolInput<Input = unknown, Output = unknown, Env = DefaultEnv> = Omit<
  ToolDefinition<Input, Output, Env>,
  "id"
>;

export type ToolSpec<
  Id extends ToolId = ToolId,
  Input = unknown,
  Output = unknown,
  Env = DefaultEnv,
> = ToolDefinition<Input, Output, Env> & { id: Id };

export interface DefinedTool<
  Id extends ToolId = ToolId,
  Input = unknown,
  Output = unknown,
  Env = DefaultEnv,
> extends ToolDefinition<Input, Output, Env> {
  id: Id;
  readonly __types?: {
    readonly input: Input;
    readonly output: Output;
    readonly env: Env;
  };
}

export interface DefinedGroup<Id extends GroupId = GroupId> extends GroupDefinition {
  id: Id;
  tools?: readonly DefinedTool<any, any, any, any>[];
  groups?: readonly DefinedGroup<any>[];
}

export type DefinedToolInput<Tool> = Tool extends {
  readonly __types?: { readonly input: infer Input };
}
  ? Input
  : never;

export type DefinedToolOutput<Tool> = Tool extends {
  readonly __types?: { readonly output: infer Output };
}
  ? Output
  : never;

export interface GroupDefinition {
  id: GroupId;
  title?: string;
  description?: string;
  parent?: GroupId;
  metadata?: Metadata;
  nodes?: NodeId[];
}

export interface HierarchyGraphNode {
  id: NodeId;
  kind: "tool" | "group";
  title?: string;
  description?: string;
  available: boolean;
}

export interface HierarchyGraphEdge {
  from: NodeId;
  to: NodeId;
  kind: "contains" | "next";
  reason?: string;
}

export interface HierarchyGraph {
  nodes: ReadonlyMap<NodeId, HierarchyGraphNode>;
  edges: readonly HierarchyGraphEdge[];
}

export interface ResolvedTool<Input = unknown, Output = unknown, Env = any>
  extends ToolDefinition<Input, Output, Env> {
  source?: string;
}

export interface ResolvedGroup extends GroupDefinition {
  source?: string;
}

export interface AdapterDefinition {
  id: AdapterId;
  kind: "mcp" | "cli" | string;
  attach(app: BuiltOhtoolsApp): AdapterHandle;
}

export interface AdapterHandle {
  start(options?: unknown): Promise<void> | void;
  stop?(): Promise<void> | void;
}

export interface OhtoolsRegistry {
  tools: ReadonlyMap<ToolId, ResolvedTool<any, any, any>>;
  groups: ReadonlyMap<GroupId, ResolvedGroup>;
  graph: HierarchyGraph;
  metadata: Metadata;
  adapters: ReadonlyMap<AdapterId, AdapterDefinition>;
}

export interface BuiltOhtoolsApp {
  registry: OhtoolsRegistry;
  runtime(options?: RuntimeOptions): OhtoolsRuntime;
}

export interface RuntimeContext {
  signal?: AbortSignal;
  metadata?: Metadata;
  emit?: (event: JsonValue) => void;
}

export interface RuntimeOptions<Env = DefaultEnv> {
  layer?: Layer.Layer<Env>;
  signal?: AbortSignal;
  timeoutMs?: number;
  metadata?: Metadata;
}

export interface ExploreRequest {
  toolId?: ToolId;
  nodeId?: NodeId;
  includeUnavailable?: boolean;
  depth?: number;
}

export interface ExploredNode {
  id: NodeId | "root";
  kind: "root" | "tool" | "group";
  title?: string;
  description?: string;
  available: boolean;
  input?: JsonSchema;
  output?: JsonSchema;
  validation?: "json-schema" | "runtime-only" | "none";
  metadata: Metadata;
  children: HierarchyGraphNode[];
}

export interface ResolvedNextStep {
  id: NodeId;
  kind: "tool" | "group";
  reason?: string;
  available: boolean;
  requiresInput?: boolean;
  exploreFirst?: boolean;
}

export interface SerializedGraph {
  nodes: Array<{
    id: NodeId;
    kind: "tool" | "group";
    title?: string;
    description?: string;
    available: boolean;
  }>;
  edges: Array<{
    from: NodeId;
    to: NodeId;
    kind: "contains" | "next";
    reason?: string;
  }>;
}

export interface ExploreResult {
  node: ExploredNode;
  path: NodeId[];
  next: ResolvedNextStep[];
  graph?: SerializedGraph;
  warnings: OhtoolsError[];
}

export interface RunRequest<Input = unknown> {
  toolId: ToolId;
  input: Input;
  context?: RuntimeContext;
}

export interface RunResult<Output = unknown> {
  toolId: ToolId;
  output: Output;
  next: ResolvedNextStep[];
  metadata: Metadata;
  warnings: OhtoolsError[];
}

export interface OhtoolsRuntime<Env = DefaultEnv> {
  explore(request: ExploreRequest): Effect.Effect<ExploreResult, OhtoolsError, Env>;
  run<Input, Output>(
    request: RunRequest<Input>,
  ): Effect.Effect<RunResult<Output>, OhtoolsError, Env>;
  runTool<Tool extends { id: ToolId }>(
    tool: Tool,
    input: DefinedToolInput<Tool>,
    context?: RuntimeContext,
  ): Effect.Effect<RunResult<DefinedToolOutput<Tool>>, OhtoolsError, Env>;
}

export interface OhtoolsOptions {
  name?: string;
  metadata?: Metadata;
}

export interface PluginOptions {
  metadata?: Metadata;
}

export interface OhtoolsPlugin {
  name: string;
  build(): OhtoolsRegistry;
}

export type MergeContext<Context, _Plugin> = Context;
