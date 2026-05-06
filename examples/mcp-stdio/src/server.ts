import { Ohtools } from "@bosun-sh/ohtools";
import { mcpAdapter } from "@bosun-sh/ohtools/adapters/mcp";

const app = new Ohtools()
  .tool("hello", { description: "Return hello.", run: () => ({ message: "hello" }) })
  .adapter(mcpAdapter({ stdio: true }));

const registry = app.build();
await registry.adapters
  .get("mcp")
  ?.attach({ registry, runtime: (options) => app.runtime(options) })
  .start();
