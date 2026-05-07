import { defineGroup } from "@bosun-sh/ohtools";
import type { GraphService } from "../application/graph-service";
import { graphBfsTool, graphDfsTool, graphDijkstraTool, graphInspectTool } from "./graph-tools";

export function registerGraphHierarchy(service: GraphService) {
  return defineGroup(
    {
      id: "graph",
      description: "Graph inspection, traversal, and routing tools.",
    },
    (graph) =>
      graph
        .tool(graphInspectTool(service))
        .group(
          defineGroup(
            {
              id: "graph.traversal",
              description: "Graph traversal algorithms.",
            },
            (traversal) => traversal.tool(graphBfsTool(service)).tool(graphDfsTool(service)),
          ),
        )
        .group(
          defineGroup(
            {
              id: "graph.shortest-path",
              description: "Weighted shortest-path algorithms.",
            },
            (shortestPath) => shortestPath.tool(graphDijkstraTool(service)),
          ),
        ),
  );
}
