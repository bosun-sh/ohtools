import type { GraphRepository } from "../application/graph-service";
import type { WeightedGraph } from "../domain/graph";

const sampleGraphs: readonly WeightedGraph[] = [
  {
    id: "city-grid",
    name: "City Delivery Grid",
    description: "A weighted undirected graph for routing deliveries across city zones.",
    directed: false,
    nodes: ["warehouse", "north", "east", "south", "west", "harbor"],
    edges: [
      { from: "warehouse", to: "north", weight: 4 },
      { from: "warehouse", to: "east", weight: 2 },
      { from: "north", to: "west", weight: 3 },
      { from: "east", to: "south", weight: 5 },
      { from: "south", to: "west", weight: 1 },
      { from: "south", to: "harbor", weight: 2 },
      { from: "west", to: "harbor", weight: 6 },
    ],
  },
  {
    id: "release-flow",
    name: "Release Workflow",
    description: "A directed graph that models a software release pipeline.",
    directed: true,
    nodes: ["plan", "build", "test", "audit", "package", "deploy", "observe"],
    edges: [
      { from: "plan", to: "build", weight: 1 },
      { from: "build", to: "test", weight: 2 },
      { from: "build", to: "audit", weight: 4 },
      { from: "test", to: "package", weight: 2 },
      { from: "audit", to: "package", weight: 1 },
      { from: "package", to: "deploy", weight: 3 },
      { from: "deploy", to: "observe", weight: 1 },
    ],
  },
];

export class InMemoryGraphRepository implements GraphRepository {
  private readonly graphs = new Map(sampleGraphs.map((graph) => [graph.id, graph]));

  list(): readonly WeightedGraph[] {
    return [...this.graphs.values()];
  }

  findById(id: string): WeightedGraph | undefined {
    return this.graphs.get(id);
  }
}
