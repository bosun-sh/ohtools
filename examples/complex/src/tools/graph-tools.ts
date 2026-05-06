import { defineTool, jsonSchema } from "@bosun-sh/ohtools";
import type {
  GraphCatalog,
  GraphRequest,
  GraphService,
  ShortestPathRequest,
} from "../application/graph-service";
import type { NodeId, ShortestPath } from "../domain/graph";

type TraversalOutput = { order: NodeId[] };

const graphRequestSchema = {
  type: "object",
  properties: {
    graphId: { type: "string", minLength: 1 },
    start: { type: "string", minLength: 1 },
  },
  required: ["graphId", "start"],
  additionalProperties: false,
} as const;

const traversalOutputSchema = {
  type: "object",
  properties: {
    order: { type: "array", items: { type: "string" } },
  },
  required: ["order"],
  additionalProperties: false,
} as const;

export function graphInspectTool(service: GraphService) {
  return defineTool({
    id: "graph.inspect",
    title: "Inspect Graph Catalog",
    description: "List sample graphs, metadata, and available nodes.",
    output: jsonSchema<GraphCatalog>({
      type: "object",
      properties: {
        graphs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              directed: { type: "boolean" },
              nodeCount: { type: "integer" },
              edgeCount: { type: "integer" },
              nodes: { type: "array", items: { type: "string" } },
            },
            required: ["id", "name", "description", "directed", "nodeCount", "edgeCount", "nodes"],
            additionalProperties: false,
          },
        },
      },
      required: ["graphs"],
      additionalProperties: false,
    }),
    next: [
      {
        id: "graph.traversal.bfs",
        reason: "Run BFS after choosing a graph and starting node.",
      },
      {
        id: "graph.shortest-path.dijkstra",
        reason: "Find the cheapest route between two nodes.",
      },
    ],
    run: () => service.inspectCatalog(),
  });
}

export function graphBfsTool(service: GraphService) {
  return defineTool({
    id: "graph.traversal.bfs",
    title: "Breadth-First Search",
    description: "Traverse a sample graph in breadth-first order from a starting node.",
    input: jsonSchema<GraphRequest>(graphRequestSchema),
    output: jsonSchema<TraversalOutput>(traversalOutputSchema),
    run: (input) => service.breadthFirstTraversal(input),
  });
}

export function graphDfsTool(service: GraphService) {
  return defineTool({
    id: "graph.traversal.dfs",
    title: "Depth-First Search",
    description: "Traverse a sample graph in depth-first order from a starting node.",
    input: jsonSchema<GraphRequest>(graphRequestSchema),
    output: jsonSchema<TraversalOutput>(traversalOutputSchema),
    run: (input) => service.depthFirstTraversal(input),
  });
}

export function graphDijkstraTool(service: GraphService) {
  return defineTool({
    id: "graph.shortest-path.dijkstra",
    title: "Dijkstra Shortest Path",
    description: "Find the lowest-cost path between two nodes in a weighted sample graph.",
    input: jsonSchema<ShortestPathRequest>({
      type: "object",
      properties: {
        graphId: { type: "string", minLength: 1 },
        start: { type: "string", minLength: 1 },
        target: { type: "string", minLength: 1 },
      },
      required: ["graphId", "start", "target"],
      additionalProperties: false,
    }),
    output: jsonSchema<ShortestPath>({
      type: "object",
      properties: {
        path: { type: "array", items: { type: "string" } },
        distance: { type: "number" },
      },
      required: ["path", "distance"],
      additionalProperties: false,
    }),
    run: (input) => service.shortestPath(input),
  });
}
