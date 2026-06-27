import {
  breadthFirstSearch,
  depthFirstSearch,
  dijkstraShortestPath,
  type NodeId,
  type ShortestPath,
  type WeightedGraph,
} from "../domain/graph";

export interface GraphRepository {
  list(): Promise<readonly WeightedGraph[]> | readonly WeightedGraph[];
  findById(id: string): Promise<WeightedGraph | undefined> | WeightedGraph | undefined;
}

export interface GraphRequest {
  readonly graphId: string;
  readonly start: NodeId;
}

export interface ShortestPathRequest extends GraphRequest {
  readonly target: NodeId;
}

export interface GraphCatalogItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly directed: boolean;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly nodes: readonly NodeId[];
}

export interface GraphCatalog {
  readonly graphs: readonly GraphCatalogItem[];
}

export class GraphService {
  constructor(private readonly repository: GraphRepository) {}

  async inspectCatalog(): Promise<GraphCatalog> {
    const graphs = await this.repository.list();

    return {
      graphs: graphs.map((graph) => ({
        id: graph.id,
        name: graph.name,
        description: graph.description,
        directed: graph.directed,
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        nodes: graph.nodes,
      })),
    };
  }

  async breadthFirstTraversal(request: GraphRequest): Promise<{ order: NodeId[] }> {
    const graph = await this.requireGraph(request.graphId);
    return { order: breadthFirstSearch(graph, request.start) };
  }

  async depthFirstTraversal(request: GraphRequest): Promise<{ order: NodeId[] }> {
    const graph = await this.requireGraph(request.graphId);
    return { order: depthFirstSearch(graph, request.start) };
  }

  async shortestPath(request: ShortestPathRequest): Promise<ShortestPath> {
    const graph = await this.requireGraph(request.graphId);
    return dijkstraShortestPath(graph, request.start, request.target);
  }

  private async requireGraph(graphId: string): Promise<WeightedGraph> {
    const graph = await this.repository.findById(graphId);
    if (!graph) throw new Error(`Graph "${graphId}" was not found.`);
    return graph;
  }
}
