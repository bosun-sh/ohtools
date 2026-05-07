export type NodeId = string;

export interface WeightedEdge {
  readonly from: NodeId;
  readonly to: NodeId;
  readonly weight: number;
}

export interface WeightedGraph {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly directed: boolean;
  readonly nodes: readonly NodeId[];
  readonly edges: readonly WeightedEdge[];
}

export interface ShortestPath {
  readonly path: NodeId[];
  readonly distance: number;
}

interface Neighbor {
  readonly node: NodeId;
  readonly weight: number;
}

export function breadthFirstSearch(graph: WeightedGraph, start: NodeId): NodeId[] {
  assertNodeExists(graph, start);

  const adjacency = adjacencyList(graph);
  const visited = new Set<NodeId>([start]);
  const queue: NodeId[] = [start];
  const order: NodeId[] = [];

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) break;

    order.push(node);
    for (const neighbor of adjacency.get(node) ?? []) {
      if (!visited.has(neighbor.node)) {
        visited.add(neighbor.node);
        queue.push(neighbor.node);
      }
    }
  }

  return order;
}

export function depthFirstSearch(graph: WeightedGraph, start: NodeId): NodeId[] {
  assertNodeExists(graph, start);

  const adjacency = adjacencyList(graph);
  const visited = new Set<NodeId>();
  const order: NodeId[] = [];

  const visit = (node: NodeId) => {
    visited.add(node);
    order.push(node);

    for (const neighbor of adjacency.get(node) ?? []) {
      if (!visited.has(neighbor.node)) visit(neighbor.node);
    }
  };

  visit(start);
  return order;
}

export function dijkstraShortestPath(
  graph: WeightedGraph,
  start: NodeId,
  target: NodeId,
): ShortestPath {
  assertNodeExists(graph, start);
  assertNodeExists(graph, target);

  const adjacency = adjacencyList(graph);
  const unvisited = new Set(graph.nodes);
  const distances = new Map<NodeId, number>();
  const previous = new Map<NodeId, NodeId>();

  for (const node of graph.nodes) distances.set(node, Number.POSITIVE_INFINITY);
  distances.set(start, 0);

  while (unvisited.size > 0) {
    const current = closestUnvisitedNode(unvisited, distances);
    if (!current) break;
    if (current === target) break;

    unvisited.delete(current);
    const currentDistance = distances.get(current) ?? Number.POSITIVE_INFINITY;
    if (!Number.isFinite(currentDistance)) break;

    for (const neighbor of adjacency.get(current) ?? []) {
      if (!unvisited.has(neighbor.node)) continue;

      const candidateDistance = currentDistance + neighbor.weight;
      if (candidateDistance < (distances.get(neighbor.node) ?? Number.POSITIVE_INFINITY)) {
        distances.set(neighbor.node, candidateDistance);
        previous.set(neighbor.node, current);
      }
    }
  }

  const distance = distances.get(target) ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(distance)) {
    throw new Error(`No path from "${start}" to "${target}" exists in graph "${graph.id}".`);
  }

  return { path: reconstructPath(previous, start, target), distance };
}

function adjacencyList(graph: WeightedGraph): Map<NodeId, Neighbor[]> {
  const adjacency = new Map<NodeId, Neighbor[]>(graph.nodes.map((node) => [node, []]));

  for (const edge of graph.edges) {
    assertEdgeIsValid(graph, edge);
    adjacency.get(edge.from)?.push({ node: edge.to, weight: edge.weight });
    if (!graph.directed) adjacency.get(edge.to)?.push({ node: edge.from, weight: edge.weight });
  }

  return adjacency;
}

function assertNodeExists(graph: WeightedGraph, node: NodeId): void {
  if (!graph.nodes.includes(node)) {
    throw new Error(`Node "${node}" does not exist in graph "${graph.id}".`);
  }
}

function assertEdgeIsValid(graph: WeightedGraph, edge: WeightedEdge): void {
  if (edge.weight < 0) {
    throw new Error(
      `Dijkstra requires non-negative edge weights. Edge "${edge.from}" -> "${edge.to}" is invalid.`,
    );
  }
  assertNodeExists(graph, edge.from);
  assertNodeExists(graph, edge.to);
}

function closestUnvisitedNode(
  unvisited: Set<NodeId>,
  distances: ReadonlyMap<NodeId, number>,
): NodeId | undefined {
  let closest: NodeId | undefined;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const node of unvisited) {
    const distance = distances.get(node) ?? Number.POSITIVE_INFINITY;
    if (distance < closestDistance) {
      closest = node;
      closestDistance = distance;
    }
  }

  return closest;
}

function reconstructPath(
  previous: ReadonlyMap<NodeId, NodeId>,
  start: NodeId,
  target: NodeId,
): NodeId[] {
  const path: NodeId[] = [target];
  let current = target;

  while (current !== start) {
    const parent = previous.get(current);
    if (!parent) break;
    path.unshift(parent);
    current = parent;
  }

  return path;
}
