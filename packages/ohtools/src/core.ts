import { Effect } from "effect";
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
      available: true,
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
  const id = request.nodeId ?? request.toolId;
  const node = id ? registry.graph.nodes.get(id) : undefined;
  if (id && !node) {
    throwError(makeError("OHTOOLS_TOOL_NOT_FOUND", `Node "${id}" was not found.`, { path: [id] }));
  }
  const path = id ? resolvePath(registry, id) : [];
  const children = childNodes(registry, id, request.depth ?? 1);
  const tool = id ? registry.tools.get(id) : undefined;
  const group = id ? registry.groups.get(id) : undefined;
  return {
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
    next: id ? resolveNext(registry, id, { kind: "explore", nodeId: id }) : [],
    graph: serializeGraph(registry.graph),
    warnings: [],
  };
}

export async function runRegistry<Output>(
  registry: OhtoolsRegistry,
  request: RunRequest,
  options: RuntimeOptions = {},
): Promise<RunResult<Output>> {
  const tool = registry.tools.get(request.toolId);
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
  const timeoutMs = options.timeoutMs;
  const signal = request.context?.signal ?? options.signal;
  const runPromise = executeHandler(tool, input, {
    toolId: request.toolId,
    signal,
    metadata: Object.freeze({
      ...registry.metadata,
      ...options.metadata,
      ...request.context?.metadata,
    }),
  });
  const output = await withTimeoutAndCancel(runPromise, request.toolId, timeoutMs, signal);
  const parsedOutput = parseWithSchema(tool.output, output, [request.toolId, "output"]) as Output;
  return {
    toolId: request.toolId,
    output: parsedOutput,
    next: resolveNext(registry, request.toolId, {
      kind: "run",
      toolId: request.toolId,
      output: parsedOutput,
    }),
    metadata: Object.freeze({ ...registry.metadata, ...tool.metadata }),
    warnings: [],
  };
}

export function createRuntime(registry: OhtoolsRegistry, options: RuntimeOptions = {}) {
  return {
    explore: (request: ExploreRequest) =>
      Effect.try({
        try: () => exploreRegistry(registry, request),
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

function resolveNext(
  registry: OhtoolsRegistry,
  id: NodeId,
  event: ExploreEvent | RunEvent,
): ResolvedNextStep[] {
  const tool = registry.tools.get(id);
  if (!tool) return [];
  const resolved: ResolvedNextStep[] = [];
  for (const next of tool.next ?? []) {
    const def = normalizeNextDefinition(next);
    const node = registry.graph.nodes.get(def.id);
    let available = Boolean(node);
    try {
      const condition = def.when?.(event);
      if (typeof condition === "boolean") available = available && condition;
    } catch {
      available = false;
    }
    resolved.push({
      id: def.id,
      kind: node?.kind ?? "tool",
      reason: def.reason,
      available,
      requiresInput: registry.tools.has(def.id)
        ? Boolean(registry.tools.get(def.id)?.input)
        : false,
      exploreFirst: def.exploreFirst,
    });
  }
  return resolved;
}

function childNodes(
  registry: OhtoolsRegistry,
  id: NodeId | undefined,
  depth: number,
): HierarchyGraphNode[] {
  if (depth < 1) return [];
  const children = registry.graph.edges
    .filter(
      (edge) => edge.kind === "contains" && (id ? edge.from === id : !hasParent(registry, edge.to)),
    )
    .map((edge) => registry.graph.nodes.get(edge.to))
    .filter((node): node is HierarchyGraphNode => Boolean(node));
  return children.sort((a, b) => a.id.localeCompare(b.id));
}

function hasParent(registry: OhtoolsRegistry, id: NodeId): boolean {
  return registry.graph.edges.some((edge) => edge.kind === "contains" && edge.to === id);
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
) {
  try {
    const value = tool.run(input, context);
    if (Effect.isEffect(value)) {
      const either = (await Effect.runPromise(
        Effect.either(value as Effect.Effect<unknown, OhtoolsError>),
      )) as { _tag: "Left"; left: OhtoolsError } | { _tag: "Right"; right: unknown };
      if (either._tag === "Left") throw either.left;
      return either.right;
    }
    return await value;
  } catch (cause) {
    throw normalizeError(cause, "OHTOOLS_HANDLER_ERROR");
  }
}

function withTimeoutAndCancel<T>(
  promise: Promise<T>,
  toolId: string,
  timeoutMs?: number,
  signal?: AbortSignal,
): Promise<T> {
  const racers: Promise<T>[] = [promise];
  if (timeoutMs !== undefined) {
    racers.push(
      new Promise<T>((_, reject) => {
        setTimeout(
          () =>
            reject(
              makeError("OHTOOLS_TIMEOUT", `Tool "${toolId}" timed out after ${timeoutMs}ms.`, {
                path: [toolId],
                metadata: { timeoutMs },
              }),
            ),
          timeoutMs,
        );
      }),
    );
  }
  if (signal) {
    racers.push(
      new Promise<T>((_, reject) => {
        signal.addEventListener(
          "abort",
          () =>
            reject(
              makeError("OHTOOLS_CANCELLED", `Run for "${toolId}" was cancelled.`, {
                path: [toolId],
              }),
            ),
          { once: true },
        );
      }),
    );
  }
  return Promise.race(racers);
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
