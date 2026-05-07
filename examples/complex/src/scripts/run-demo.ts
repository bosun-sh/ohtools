import { Effect } from "effect";
import { useGraphService, useOhtoolsRuntime } from "../tooling/ohtools-store";
import {
  graphBfsTool,
  graphDfsTool,
  graphDijkstraTool,
  graphInspectTool,
} from "../tools/graph-tools";

const runtime = useOhtoolsRuntime();
const service = useGraphService();

const inspectTool = graphInspectTool(service);
const bfsTool = graphBfsTool(service);
const dfsTool = graphDfsTool(service);
const dijkstraTool = graphDijkstraTool(service);

const inspect = await Effect.runPromise(runtime.runTool(inspectTool, {}));
const bfs = await Effect.runPromise(
  runtime.runTool(bfsTool, { graphId: "city-grid", start: "warehouse" }),
);
const dfs = await Effect.runPromise(
  runtime.runTool(dfsTool, { graphId: "city-grid", start: "warehouse" }),
);
const dijkstra = await Effect.runPromise(
  runtime.runTool(dijkstraTool, {
    graphId: "city-grid",
    start: "warehouse",
    target: "harbor",
  }),
);

if (inspect.next.length !== 2) throw new Error("inspect should recommend two next steps");
if (bfs.output.order.join(",") !== "warehouse,north,east,west,south,harbor") {
  throw new Error(`unexpected BFS order: ${bfs.output.order.join(",")}`);
}
if (dfs.output.order.join(",") !== "warehouse,north,west,south,east,harbor") {
  throw new Error(`unexpected DFS order: ${dfs.output.order.join(",")}`);
}
if (dijkstra.output.path.join(",") !== "warehouse,east,south,harbor") {
  throw new Error(`unexpected Dijkstra path: ${dijkstra.output.path.join(",")}`);
}
if (dijkstra.output.distance !== 9) {
  throw new Error(`unexpected Dijkstra distance: ${dijkstra.output.distance}`);
}

console.log(
  JSON.stringify(
    {
      inspect: inspect.output,
      bfs: bfs.output,
      dfs: dfs.output,
      dijkstra: dijkstra.output,
      next: inspect.next,
    },
    null,
    2,
  ),
);
