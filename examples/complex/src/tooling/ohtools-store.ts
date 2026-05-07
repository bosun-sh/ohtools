import { Ohtools } from "@bosun-sh/ohtools";
import { mcpAdapter } from "@bosun-sh/ohtools/adapters/mcp";
import { type GraphRepository, GraphService } from "../application/graph-service";
import { InMemoryGraphRepository } from "../infrastructure/in-memory-graph-repository";
import { registerGraphHierarchy } from "../tools/graph-hierarchy";

let graphRepository: GraphRepository | undefined;
let graphService: GraphService | undefined;
let ohtoolsApp: Ohtools | undefined;

export function useGraphRepository(): GraphRepository {
  graphRepository ??= new InMemoryGraphRepository();
  return graphRepository;
}

export function useGraphService(): GraphService {
  graphService ??= new GraphService(useGraphRepository());
  return graphService;
}

export function useOhtoolsApp(): Ohtools {
  ohtoolsApp ??= new Ohtools({ name: "complex-graph-tools" })
    .metadata("example", "complex")
    .group(registerGraphHierarchy(useGraphService()))
    .adapter(mcpAdapter());

  return ohtoolsApp;
}

export function useOhtoolsRuntime() {
  return useOhtoolsApp().runtime();
}
