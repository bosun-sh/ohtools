# 03. Core Domain

## Purpose

Define the framework data model that all builders, runtimes, adapters, docs, and
tests consume. The core domain must stay transport-independent and mostly pure.

## Public Interfaces

Core identifiers:

```ts
export type ToolId = string;
export type GroupId = string;
export type NodeId = ToolId | GroupId;
export type AdapterId = string;
```

JSON metadata:

```ts
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { readonly [key: string]: JsonValue };

export type Metadata = Readonly<Record<string, JsonValue>>;
```

ID validation:

```ts
export const ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
```

Tool definition:

```ts
export interface ToolDefinition<Input = unknown, Output = unknown, Env = never> {
  id: ToolId;
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
```

Hierarchy metadata:

```ts
export interface ToolHierarchy {
  parent?: GroupId;
  level?: number;
  visible?: boolean;
}

export interface HierarchyGraph {
  nodes: ReadonlyMap<NodeId, HierarchyGraphNode>;
  edges: readonly HierarchyGraphEdge[];
}

export interface HierarchyGraphNode {
  id: NodeId;
  kind: "tool" | "group";
  available: boolean;
}

export interface HierarchyGraphEdge {
  from: NodeId;
  to: NodeId;
  kind: "contains" | "next";
  reason?: string;
}
```

Group definition:

```ts
export interface GroupDefinition {
  id: GroupId;
  title?: string;
  description?: string;
  parent?: GroupId;
  metadata?: Metadata;
  nodes?: NodeId[];
}
```

Build output:

```ts
export interface OhtoolsRegistry {
  tools: ReadonlyMap<ToolId, ResolvedTool>;
  groups: ReadonlyMap<GroupId, ResolvedGroup>;
  graph: HierarchyGraph;
  metadata: Metadata;
  adapters: ReadonlyMap<AdapterId, AdapterDefinition>;
}
```

Framework error:

```ts
export interface OhtoolsError {
  code: OhtoolsErrorCode;
  message: string;
  path?: string[];
  cause?: unknown;
  metadata?: Metadata;
}

export type OhtoolsErrorCode =
  | "OHTOOLS_INVALID_ID"
  | "OHTOOLS_DUPLICATE_TOOL"
  | "OHTOOLS_DUPLICATE_GROUP"
  | "OHTOOLS_DUPLICATE_ADAPTER"
  | "OHTOOLS_INCOMPATIBLE_METADATA"
  | "OHTOOLS_MISSING_NEXT_STEP"
  | "OHTOOLS_TOOL_NOT_FOUND"
  | "OHTOOLS_GROUP_NOT_RUNNABLE"
  | "OHTOOLS_TOOL_NOT_RUNNABLE"
  | "OHTOOLS_VALIDATION_ERROR"
  | "OHTOOLS_HANDLER_ERROR"
  | "OHTOOLS_NEXT_STEP_ERROR"
  | "OHTOOLS_CANCELLED"
  | "OHTOOLS_TIMEOUT"
  | "OHTOOLS_ADAPTER_ERROR";
```
```

## Implementation Requirements

- Represent registries as immutable values after `.build()`.
- Use plain TypeScript data structures in the core; adapters may translate them
  to transport-specific shapes.
- Require stable tool IDs.
- Use dot-delimited IDs for nested public names, such as `issues.inspect`.
- Validate that every tool has a description and a handler.
- Keep metadata JSON-compatible unless a field explicitly allows richer runtime
  values.
- Metadata merge policy is exact-key replace within the same builder and
  build-time error across different plugin sources.
- Support groups as organizational nodes, not executable tools.
- Support hierarchy as a graph with optional tree-like parent relationships.
- Preserve source information for errors where possible, including plugin name,
  group path, and tool ID.

## Edge Cases

- Duplicate tool IDs must fail at build time.
- Duplicate group IDs must fail at build time.
- A tool may be executable without being visible as a top-level graph node.
- A graph node may be unavailable because requirements are not met; it must
  still be describable during exploration.
- Metadata keys from different plugins must not silently overwrite each other
  and must emit `OHTOOLS_INCOMPATIBLE_METADATA`.
- IDs must reject empty strings, whitespace-only strings, and path traversal
  patterns.

## Tests

- Unit tests for ID validation.
- Unit tests for immutable registry creation.
- Unit tests for duplicate detection.
- Unit tests for group and tool resolution.
- Unit tests for metadata merge behavior.
- Snapshot or structural tests for registry output shape.

## Done Criteria

- Core types are exported from the public package.
- Registry construction is deterministic.
- Invalid domain states listed in this spec are rejected by tests.
- No core module imports MCP, CLI, process, or network-specific APIs.
