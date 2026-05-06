import { Cause, Effect, Exit } from "effect";
import { makeError, normalizeError, throwError } from "./errors";
import { parseWithSchema } from "./schemas";
import type {
  AdapterDefinition,
  ExploreEvent,
  ExploreRequest,
  ExploreResult,
  GroupDefinition,
  HierarchyGraph,
  HierarchyGraphEdge,
  HierarchyGraphNode,
  Metadata,
  NextStepDefinition,
  NodeId,
  OhtoolsError,
  OhtoolsRegistry,
  ResolvedGroup,
  ResolvedNextStep,
  ResolvedTool,
  RunEvent,
  RunRequest,
  RunResult,
  RuntimeOptions,
  SerializedGraph,
  ToolDefinition,
  ToolId,
} from "./types";
import { ID_PATTERN } from "./types";

export interface RegistryContribution {
  source: string;
  tools: Array<ToolDefinition<any, any, any>>;
  groups: GroupDefinition[];
  adapters: AdapterDefinition[];
  metadata: Metadata;
}

export function assertValidId(id: string, path: string[]): void {
  if (!ID_PATTERN.test(id) || id.includes("..")) {
    throwError(makeError("OHTOOLS_INVALID_ID", `Invalid ID "${id}".`, { path }));
  }
}

export function buildRegistry(contributions: RegistryContribution[]): OhtoolsRegistry {
  const tools = new Map<ToolId, ResolvedTool>();
  const groups = new Map<NodeId, ResolvedGroup>();
  const adapters = new Map<string, AdapterDefinition>();
  const metadataSources = new Map<string, string>();
  const metadata: Record<string, Metadata[keyof Metadata]> = {};

  for (const contribution of contributions) {
    for (const [key, value] of Object.entries(contribution.metadata)) {
      const source = metadataSources.get(key);
      if (source && source !== contribution.source && metadata[key] !== value) {
        throwError(
          makeError("OHTOOLS_INCOMPATIBLE_METADATA", `Metadata key "${key}" conflicts.`, {
            path: [contribution.source, "metadata", key],
          }),
        );
      }
      metadataSources.set(key, contribution.source);
      metadata[key] = value;
    }

    for (const group of contribution.groups) {
      assertValidId(group.id, [contribution.source, "group", group.id]);
      if (groups.has(group.id)) {
        throwError(
          makeError("OHTOOLS_DUPLICATE_GROUP", `Duplicate group "${group.id}".`, {
            path: [group.id],
          }),
        );
      }
      groups.set(group.id, freezeDeep({ ...group, source: contribution.source }));
    }

    for (const tool of contribution.tools) {
      assertValidId(tool.id, [contribution.source, "tool", tool.id]);
      if (!tool.description) {
        throwError(
          makeError("OHTOOLS_INVALID_ID", `Tool "${tool.id}" must include a description.`, {
            path: [tool.id],
          }),
        );
      }
      if (typeof tool.run !== "function") {
        throwError(
          makeError("OHTOOLS_TOOL_NOT_RUNNABLE", `Tool "${tool.id}" must include a run handler.`, {
            path: [tool.id],
          }),
        );
      }
      if (tools.has(tool.id)) {
        throwError(
          makeError("OHTOOLS_DUPLICATE_TOOL", `Duplicate tool "${tool.id}".`, { path: [tool.id] }),
        );
      }
      tools.set(
        tool.id,
        freezeDeep({ ...tool, mode: tool.mode ?? "both", source: contribution.source }),
      );
    }

    for (const adapter of contribution.adapters) {
      assertValidId(adapter.id, [contribution.source, "adapter", adapter.id]);
      if (adapters.has(adapter.id)) {
        throwError(
          makeError("OHTOOLS_DUPLICATE_ADAPTER", `Duplicate adapter "${adapter.id}".`, {
            path: [adapter.id],
          }),
        );
      }
      adapters.set(adapter.id, Object.freeze(adapter));
    }
  }

  const graph = buildGraph(tools, groups);
  validateNextSteps(tools, groups);
  return freezeRegistry({
    tools: new Map([...tools.entries()].sort()),
    groups: new Map([...groups.entries()].sort()),
    graph,
    metadata: Object.freeze({ ...metadata }),
    adapters: new Map([...adapters.entries()].sort()),
  });
}

export function buildGraph(
  tools: ReadonlyMap<ToolId, ResolvedTool>,
  groups: ReadonlyMap<NodeId, ResolvedGroup>,
): HierarchyGraph {
  const nodes = new Map<NodeId, HierarchyGraphNode>();
  const edges: HierarchyGraphEdge[] = [];
  for (const group of groups.values()) {
    nodes.set(group.id, {
      id: group.id,
      kind: "group",
      title: group.title,
      description: group.description,
      available: true,
    });
    if (group.parent) edges.push({ from: group.parent, to: group.id, kind: "contains" });
    for (const nodeId of group.nodes ?? [])
      edges.push({ from: group.id, to: nodeId, kind: "contains" });
  }
  for (const tool of tools.values()) {
    nodes.set(tool.id, {
      id: tool.id,
      kind: "tool",
      title: tool.title,
      description: tool.description,
      available: tool.hierarchy?.visible !== false,
    });
    if (tool.hierarchy?.parent)
      edges.push({ from: tool.hierarchy.parent, to: tool.id, kind: "contains" });
    for (const next of tool.next ?? []) {
      const def = normalizeNextDefinition(next);
      edges.push({ from: tool.id, to: def.id, kind: "next", reason: def.reason });
    }
  }
  return Object.freeze({
    nodes: new Map([...nodes.entries()].sort()),
    edges: Object.freeze(sortEdges(edges)),
  });
}

export function serializeGraph(graph: HierarchyGraph): SerializedGraph {
  return {
    nodes: [...graph.nodes.values()]
      .map((node) => ({ ...node }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    edges: sortEdges(graph.edges.map((edge) => ({ ...edge }))),
  };
}

export function exploreRegistry(registry: OhtoolsRegistry, request: ExploreRequest): ExploreResult {
  return buildExploreResult(registry, request, resolveNextSync) as ExploreResult;
}

async function exploreRegistryAsync(
  registry: OhtoolsRegistry,
  request: ExploreRequest,
): Promise<ExploreResult> {
  return buildExploreResult(registry, request, resolveNext);
}

function buildExploreResult(
  registry: OhtoolsRegistry,
  request: ExploreRequest,
  resolve: (
    registry: OhtoolsRegistry,
    id: NodeId,
    event: ExploreEvent | RunEvent,
    includeUnavailable?: boolean,
  ) => NextStepPlan | Promise<NextStepPlan>,
): ExploreResult | Promise<ExploreResult> {
  const id = request.nodeId ?? request.toolId;
  const node = id ? registry.graph.nodes.get(id) : undefined;
  if (id && !node) {
    throwError(makeError("OHTOOLS_TOOL_NOT_FOUND", `Node "${id}" was not found.`, { path: [id] }));
  }
  const path = id ? resolvePath(registry, id) : [];
  const children = childNodes(
    registry,
    id,
    request.depth ?? 1,
    Boolean(request.includeUnavailable),
  );
  const tool = id ? registry.tools.get(id) : undefined;
  const group = id ? registry.groups.get(id) : undefined;
  const finish = (plan: NextStepPlan): ExploreResult => ({
    node: {
      id: id ?? "root",
      kind: node?.kind ?? "root",
      title: tool?.title ?? group?.title,
      description: tool?.description ?? group?.description,
      available: node?.available ?? true,
      input: tool?.input?.jsonSchema,
      output: tool?.output?.jsonSchema,
      validation: tool?.input ? (tool.input.jsonSchema ? "json-schema" : "runtime-only") : "none",
      metadata: Object.freeze({ ...(tool?.metadata ?? group?.metadata ?? {}) }),
      children,
    },
    path,
    next: plan.next,
    graph: serializeGraph(registry.graph),
    warnings: plan.warnings,
  });
  const plan = id
    ? resolve(registry, id, { kind: "explore", nodeId: id }, Boolean(request.includeUnavailable))
    : { next: [], warnings: [] };
  return isPromiseLike(plan) ? plan.then(finish) : finish(plan);
}

export async function runRegistry<Output>(
  registry: OhtoolsRegistry,
  request: RunRequest,
  options: RuntimeOptions = {},
): Promise<RunResult<Output>> {
  const tool = registry.tools.get(request.toolId);
  if (!tool && registry.groups.has(request.toolId)) {
    throwError(
      makeError("OHTOOLS_GROUP_NOT_RUNNABLE", `Group "${request.toolId}" cannot be run.`, {
        path: [request.toolId],
      }),
    );
  }
  if (!tool)
    throwError(
      makeError("OHTOOLS_TOOL_NOT_FOUND", `Tool "${request.toolId}" was not found.`, {
        path: [request.toolId],
      }),
    );
  if (tool.mode === "explore") {
    throwError(
      makeError("OHTOOLS_TOOL_NOT_RUNNABLE", `Tool "${request.toolId}" is explore-only.`, {
        path: [request.toolId],
      }),
    );
  }
  if (options.signal?.aborted || request.context?.signal?.aborted) {
    throwError(
      makeError("OHTOOLS_CANCELLED", `Run for "${request.toolId}" was cancelled before start.`, {
        path: [request.toolId],
      }),
    );
  }

  const input = parseWithSchema(tool.input, request.input, [request.toolId, "input"]);
  const signal = request.context?.signal ?? options.signal;
  const output = await executeHandler(
    tool,
    input,
    {
      toolId: request.toolId,
      signal,
      metadata: Object.freeze({
        ...registry.metadata,
        ...options.metadata,
        ...request.context?.metadata,
      }),
    },
    options,
  );
  const parsedOutput = parseWithSchema(tool.output, output, [request.toolId, "output"]) as Output;
  const plan = await resolveNext(registry, request.toolId, {
    kind: "run",
    toolId: request.toolId,
    output: parsedOutput,
  });
  return {
    toolId: request.toolId,
    output: parsedOutput,
    next: plan.next,
    metadata: Object.freeze({ ...registry.metadata, ...tool.metadata }),
    warnings: plan.warnings,
  };
}

export function createRuntime(registry: OhtoolsRegistry, options: RuntimeOptions = {}) {
  return {
    explore: (request: ExploreRequest) =>
      Effect.tryPromise({
        try: () => exploreRegistryAsync(registry, request),
        catch: (cause) => normalizeError(cause, "OHTOOLS_ADAPTER_ERROR"),
      }),
    run: <Input, Output>(request: RunRequest<Input>) =>
      Effect.tryPromise({
        try: () => runRegistry<Output>(registry, request, options),
        catch: (cause) => normalizeError(cause, "OHTOOLS_HANDLER_ERROR"),
      }),
  };
}

function validateNextSteps(
  tools: ReadonlyMap<ToolId, ResolvedTool>,
  groups: ReadonlyMap<NodeId, ResolvedGroup>,
) {
  for (const tool of tools.values()) {
    for (const next of tool.next ?? []) {
      const def = normalizeNextDefinition(next);
      if (!def.optional && !tools.has(def.id) && !groups.has(def.id)) {
        throwError(
          makeError("OHTOOLS_MISSING_NEXT_STEP", `Next step "${def.id}" is not registered.`, {
            path: [tool.id, "next", def.id],
          }),
        );
      }
    }
  }
}

function normalizeNextDefinition(next: NextStepDefinition) {
  return typeof next === "string" ? { id: next } : next;
}

interface NextStepPlan {
  next: ResolvedNextStep[];
  warnings: OhtoolsError[];
}

async function resolveNext(
  registry: OhtoolsRegistry,
  id: NodeId,
  event: ExploreEvent | RunEvent,
  includeUnavailable = false,
): Promise<NextStepPlan> {
  const tool = registry.tools.get(id);
  if (!tool) return { next: [], warnings: [] };
  const resolved: ResolvedNextStep[] = [];
  const warnings: OhtoolsError[] = [];
  for (const next of tool.next ?? []) {
    const def = normalizeNextDefinition(next);
    const node = registry.graph.nodes.get(def.id);
    let available = Boolean(node);
    let resolverFailed = false;
    try {
      const condition = def.when?.(event);
      if (condition !== undefined) available = available && (await resolveCondition(condition));
    } catch (cause) {
      available = false;
      resolverFailed = true;
      warnings.push(nextStepWarning(id, def.id, cause));
    }
    const step = {
      id: def.id,
      kind: node?.kind ?? "tool",
      reason: def.reason,
      available,
      requiresInput: registry.tools.has(def.id)
        ? Boolean(registry.tools.get(def.id)?.input)
        : false,
      exploreFirst: def.exploreFirst,
    };
    if (available || includeUnavailable || resolverFailed) resolved.push(step);
  }
  return { next: resolved, warnings };
}

function resolveNextSync(
  registry: OhtoolsRegistry,
  id: NodeId,
  event: ExploreEvent | RunEvent,
  includeUnavailable = false,
): NextStepPlan {
  const tool = registry.tools.get(id);
  if (!tool) return { next: [], warnings: [] };
  const resolved: ResolvedNextStep[] = [];
  const warnings: OhtoolsError[] = [];
  for (const next of tool.next ?? []) {
    const def = normalizeNextDefinition(next);
    const node = registry.graph.nodes.get(def.id);
    let available = Boolean(node);
    let resolverFailed = false;
    try {
      const condition = def.when?.(event);
      if (typeof condition === "boolean") {
        available = available && condition;
      } else if (condition !== undefined) {
        throw makeError(
          "OHTOOLS_NEXT_STEP_ERROR",
          `Next step "${def.id}" requires async resolution.`,
        );
      }
    } catch (cause) {
      available = false;
      resolverFailed = true;
      warnings.push(nextStepWarning(id, def.id, cause));
    }
    const step = {
      id: def.id,
      kind: node?.kind ?? "tool",
      reason: def.reason,
      available,
      requiresInput: registry.tools.has(def.id)
        ? Boolean(registry.tools.get(def.id)?.input)
        : false,
      exploreFirst: def.exploreFirst,
    };
    if (available || includeUnavailable || resolverFailed) resolved.push(step);
  }
  return { next: resolved, warnings };
}

async function resolveCondition(
  condition: boolean | Promise<boolean> | Effect.Effect<boolean, OhtoolsError>,
): Promise<boolean> {
  if (typeof condition === "boolean") return condition;
  if (Effect.isEffect(condition)) {
    const either = await Effect.runPromise(Effect.either(condition));
    if (either._tag === "Left") throw either.left;
    return either.right;
  }
  return condition;
}

function nextStepWarning(from: NodeId, to: NodeId, cause: unknown): OhtoolsError {
  const normalized = normalizeError(cause, "OHTOOLS_NEXT_STEP_ERROR");
  return makeError("OHTOOLS_NEXT_STEP_ERROR", `Next step "${to}" could not be resolved.`, {
    path: [from, "next", to],
    cause: normalized,
  });
}

function childNodes(
  registry: OhtoolsRegistry,
  id: NodeId | undefined,
  depth: number,
  includeUnavailable: boolean,
): HierarchyGraphNode[] {
  if (depth < 1) return [];
  const roots = containedNodeIds(registry, id);
  const children: HierarchyGraphNode[] = [];
  for (const childId of roots) {
    visitChild(
      registry,
      childId,
      depth,
      [id, childId].filter(Boolean) as NodeId[],
      children,
      includeUnavailable,
    );
  }
  return children;
}

function hasParent(registry: OhtoolsRegistry, id: NodeId): boolean {
  return registry.graph.edges.some((edge) => edge.kind === "contains" && edge.to === id);
}

function containedNodeIds(registry: OhtoolsRegistry, id: NodeId | undefined): NodeId[] {
  if (!id) {
    return [...registry.graph.nodes.keys()]
      .filter((nodeId) => !hasParent(registry, nodeId))
      .sort((a, b) => a.localeCompare(b));
  }
  const ids = registry.graph.edges
    .filter((edge) => edge.kind === "contains" && edge.from === id)
    .map((edge) => edge.to);
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

function visitChild(
  registry: OhtoolsRegistry,
  id: NodeId,
  remainingDepth: number,
  path: NodeId[],
  children: HierarchyGraphNode[],
  includeUnavailable: boolean,
): void {
  const node = registry.graph.nodes.get(id);
  if (!node || (!node.available && !includeUnavailable)) return;
  const cycleAt = path.slice(0, -1).indexOf(id);
  if (cycleAt >= 0) {
    children.push(
      Object.freeze({ ...node, cycle: true, path: path.slice(cycleAt) }) as HierarchyGraphNode,
    );
    return;
  }
  children.push(node);
  if (remainingDepth <= 1) return;
  for (const childId of containedNodeIds(registry, id)) {
    visitChild(
      registry,
      childId,
      remainingDepth - 1,
      [...path, childId],
      children,
      includeUnavailable,
    );
  }
}

function resolvePath(registry: OhtoolsRegistry, id: NodeId): NodeId[] {
  const path: NodeId[] = [id];
  const seen = new Set<NodeId>(path);
  let current = id;
  while (true) {
    const parent = registry.graph.edges.find(
      (edge) => edge.kind === "contains" && edge.to === current,
    )?.from;
    if (!parent || seen.has(parent)) return path.reverse();
    path.push(parent);
    seen.add(parent);
    current = parent;
  }
}

async function executeHandler(
  tool: ResolvedTool,
  input: unknown,
  context: Parameters<ResolvedTool["run"]>[1],
  options: RuntimeOptions,
) {
  let effect = Effect.suspend(() => {
    try {
      const value = tool.run(input, context);
      if (Effect.isEffect(value)) return value as Effect.Effect<unknown, OhtoolsError, never>;
      if (isPromiseLike(value)) {
        return Effect.tryPromise({
          try: () => value,
          catch: (cause) => normalizeError(cause, "OHTOOLS_HANDLER_ERROR"),
        });
      }
      return Effect.succeed(value);
    } catch (cause) {
      return Effect.fail(normalizeError(cause, "OHTOOLS_HANDLER_ERROR"));
    }
  });

  const timeoutMs = options.timeoutMs;
  if (timeoutMs !== undefined) {
    effect = Effect.timeoutFail(effect, {
      duration: `${timeoutMs} millis`,
      onTimeout: () =>
        makeError("OHTOOLS_TIMEOUT", `Tool "${tool.id}" timed out after ${timeoutMs}ms.`, {
          path: [tool.id],
          metadata: { timeoutMs },
        }),
    });
  }
  if (options.layer) effect = Effect.provide(effect, options.layer as never);

  const exit = await Effect.runPromiseExit(effect, { signal: context.signal });
  if (Exit.isSuccess(exit)) return exit.value;
  throw errorFromCause(tool.id, exit.cause);
}

function errorFromCause(toolId: ToolId, cause: Cause.Cause<OhtoolsError>): OhtoolsError {
  if (Cause.isInterruptedOnly(cause)) {
    return makeError("OHTOOLS_CANCELLED", `Run for "${toolId}" was cancelled.`, {
      path: [toolId],
    });
  }
  const failure = [...Cause.failures(cause)][0];
  if (failure) return normalizeError(failure, "OHTOOLS_HANDLER_ERROR");
  const defect = [...Cause.defects(cause)][0];
  if (defect) return normalizeError(defect, "OHTOOLS_HANDLER_ERROR");
  if (Cause.isInterrupted(cause)) {
    return makeError("OHTOOLS_CANCELLED", `Run for "${toolId}" was cancelled.`, {
      path: [toolId],
      cause,
    });
  }
  return makeError("OHTOOLS_HANDLER_ERROR", `Tool "${toolId}" failed.`, { path: [toolId], cause });
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof (value as { then?: unknown }).then === "function";
}

function sortEdges(edges: HierarchyGraphEdge[]) {
  return edges.sort((a, b) =>
    `${a.from}\0${a.to}\0${a.kind}`.localeCompare(`${b.from}\0${b.to}\0${b.kind}`),
  );
}

function freezeRegistry(registry: OhtoolsRegistry): OhtoolsRegistry {
  return Object.freeze(registry);
}

function freezeDeep<T>(value: T): T {
  if (typeof value !== "object" || value === null) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
