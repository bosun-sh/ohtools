import { describe, expect, test } from "bun:test";
import { Ohtools, jsonSchema } from "../src";
import { cliAdapter } from "../src/adapters/cli";
import { mcpAdapter, mcpResources, mcpToolDescriptors } from "../src/adapters/mcp";

describe("adapters", () => {
  test("cli adapter handle is idempotent", async () => {
    const app = new Ohtools()
      .tool("hello", { description: "Hello.", run: () => "hi" })
      .adapter(cliAdapter());
    const registry = app.build();
    const handle = registry.adapters
      .get("cli")
      ?.attach({ registry, runtime: (options) => app.runtime(options) });
    expect(handle).toBeDefined();
    await handle?.start();
    await handle?.stop?.();
    await handle?.stop?.();
  });

  test("mcp descriptors include tools, explore, graph, and resources", () => {
    const registry = new Ohtools()
      .tool("hello", {
        description: "Hello.",
        input: jsonSchema({ type: "object", properties: {} }),
        run: () => "hi",
      })
      .adapter(mcpAdapter())
      .build();
    expect(mcpToolDescriptors(registry).map((tool) => tool.name)).toContain("ohtools.explore");
    expect(mcpToolDescriptors(registry).map((tool) => tool.name)).toContain("hello");
    expect(mcpResources(registry).map((resource) => resource.uri)).toContain("ohtools://graph");
  });

  test("mcp rejects non-object executable input schema", () => {
    const registry = new Ohtools()
      .tool("hello", {
        description: "Hello.",
        input: jsonSchema({ type: "string" }),
        run: () => "hi",
      })
      .build();
    expect(() => mcpToolDescriptors(registry)).toThrow("OHTOOLS_ADAPTER_ERROR");
  });
});
