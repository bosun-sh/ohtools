# 05. Hierarchy, Explore, and Run

## Purpose

Define graph behavior, tool exploration, execution flow, next-step resolution,
cycle handling, unavailable nodes, and output shapes.

## Public Interfaces

Explore:

```ts
export interface ExploreRequest {
  toolId?: ToolId;
  nodeId?: NodeId;
  includeUnavailable?: boolean;
  depth?: number;
}

export interface ExploreResult {
  node: ExploredNode;
  path: NodeId[];
  next: ResolvedNextStep[];
  graph?: SerializedGraph;
  warnings: OhtoolsError[];
}
```

Run:

```ts
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
```

Next step:

```ts
export interface ResolvedNextStep {
  id: NodeId;
  kind: "tool" | "group";
  reason?: string;
  available: boolean;
  requiresInput?: boolean;
  exploreFirst?: boolean;
}

export type NextStepDefinition =
  | NodeId
  | {
      id: NodeId;
      reason?: string;
      optional?: boolean;
      exploreFirst?: boolean;
      when?: NextStepResolver;
    };

export type NextStepResolver = (
  event: ExploreEvent | RunEvent,
) => boolean | Promise<boolean> | Effect.Effect<boolean, OhtoolsError>;

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
```

## Implementation Requirements

- Exploration must never execute a tool handler.
- Running a tool must validate input before handler execution and output after
  handler execution when schemas exist.
- Explore responses must include description, input requirements, output shape
  when known, hierarchy metadata, and next steps.
- Run responses must include handler output and next steps.
- Graph traversal must support trees and directed graphs.
- Next steps may be static IDs or resolver functions evaluated after explore or
  run.
- Serialized graph output must be sorted by node ID and then edge tuple
  `(from, to, kind)` for deterministic snapshots and docs.
- Next-step resolution must preserve declaration order.
- Missing next-step targets fail at build time unless marked with
  `optional: true`.
- Cycles are allowed only when they are explicit graph edges; traversal must
  prevent infinite recursion.
- Default exploration depth is `1`. Root exploration with depth `1` returns only
  top-level groups and tools.

## Edge Cases

- Exploring the root graph returns top-level groups and tools.
- Exploring a group returns child nodes and group metadata.
- Running a group is invalid.
- A tool with `mode: "explore"` cannot be run.
- A tool with `mode: "run"` can still expose minimal exploration metadata needed
  for discovery.
- A next-step resolver failure must not hide a successful run result. It is
  returned in `warnings` with code `OHTOOLS_NEXT_STEP_ERROR`, and that next step
  is marked `available: false`.
- Unavailable nodes remain visible when `includeUnavailable` is true.
- Cycles must appear once per traversal path with cycle metadata.

## Tests

- Explore root, group, and tool nodes.
- Prove explore does not call handlers.
- Run a valid tool and receive ordered next steps.
- Reject running groups and explore-only tools.
- Detect missing next-step targets.
- Traverse a graph with cycles without recursion overflow.
- Test unavailable next steps with both visibility modes.

## Done Criteria

- Core explore and run planning functions are transport-independent.
- Output shapes match this spec and are covered by tests.
- The first vertical slice can explore and run a tool with next steps.
- Graph behavior is documented for users and adapter authors.
