import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { Ohtools, jsonSchema } from "../src";
import { cliAdapter, runCli } from "../src/adapters/cli";
import {
  mcpAdapter,
  mcpResources,
  mcpToolDescriptors,
  registerResources,
} from "../src/adapters/mcp";

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

  test("mcp registers graph, tool, and group resources with the SDK server", () => {
    const registry = new Ohtools()
      .group("support", (group) =>
        group.tool("hello", {
          description: "Hello.",
          input: jsonSchema({ type: "object", properties: {} }),
          run: () => "hi",
        }),
      )
      .build();
    const registered: Array<{
      name: string;
      uri: string;
      read: () => { contents: Array<{ uri: string; text: string }> };
    }> = [];
    registerResources(
      {
        resource: (name, uri, _metadata, readCallback) => {
          registered.push({ name, uri, read: readCallback });
        },
      },
      registry,
    );

    expect(registered.map((resource) => resource.uri)).toEqual([
      "ohtools://graph",
      "ohtools://tools/support.hello",
      "ohtools://groups/support",
    ]);
    expect(JSON.parse(registered[0]!.read().contents[0]!.text).nodes).toHaveLength(2);
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

  test("mcp rejects executable input schema without object root", () => {
    const registry = new Ohtools()
      .tool("hello", {
        description: "Hello.",
        input: jsonSchema({ properties: {} }),
        run: () => "hi",
      })
      .build();
    expect(() => mcpToolDescriptors(registry)).toThrow("object root");
  });

  test("mcp rejects circular local refs in executable input schema", () => {
    const registry = new Ohtools()
      .tool("hello", {
        description: "Hello.",
        input: jsonSchema({
          type: "object",
          properties: {
            node: { $ref: "#/$defs/node" },
          },
          $defs: {
            node: {
              type: "object",
              properties: {
                child: { $ref: "#/$defs/node" },
              },
            },
          },
        }),
        run: () => "hi",
      })
      .build();
    expect(() => mcpToolDescriptors(registry)).toThrow("circular refs");
  });

  test("cli commands work against examples/basic", async () => {
    const appPath = resolve("examples/basic/src/app.ts");

    const list = await captureConsole(() => runCli(["--app", appPath, "list"]));
    expect(list.code).toBe(0);
    expect(JSON.parse(list.stdout).data[0]).toMatchObject({ id: "hello" });

    const explored = await captureConsole(() => runCli(["--app", appPath, "explore", "hello"]));
    expect(explored.code).toBe(0);
    expect(JSON.parse(explored.stdout).data.node.id).toBe("hello");

    const run = await captureConsole(() =>
      runCli(["--app", appPath, "run", "hello", "--input", '{"name":"Ada"}']),
    );
    expect(run.code).toBe(0);
    expect(JSON.parse(run.stdout).data.output.message).toBe("Hello, Ada");

    const graph = await captureConsole(() => runCli(["--app", appPath, "graph"]));
    expect(graph.code).toBe(0);
    expect(JSON.parse(graph.stdout).data.nodes.map((node: { id: string }) => node.id)).toContain(
      "hello",
    );

    const human = await captureConsole(() => runCli(["--app", appPath, "list", "--human"]));
    expect(human.code).toBe(0);
    expect(human.stdout).toContain("Return a greeting.");
  });

  test("cli returns documented exit codes for invalid input and failures", async () => {
    const appPath = resolve("packages/ohtools/test/fixtures/cli-failure-app.ts");

    const invalidJson = await captureConsole(() =>
      runCli(["--app", appPath, "run", "needs-name", "--input", "{"]),
    );
    expect(invalidJson.code).toBe(3);
    expect(JSON.parse(invalidJson.stderr).error.code).toBe("OHTOOLS_VALIDATION_ERROR");

    const missingTool = await captureConsole(() => runCli(["--app", appPath, "run", "missing"]));
    expect(missingTool.code).toBe(4);
    expect(JSON.parse(missingTool.stderr).error.code).toBe("OHTOOLS_TOOL_NOT_FOUND");

    const validation = await captureConsole(() =>
      runCli(["--app", appPath, "run", "needs-name", "--input", "{}"]),
    );
    expect(validation.code).toBe(3);
    expect(JSON.parse(validation.stderr).error.code).toBe("OHTOOLS_VALIDATION_ERROR");

    const handler = await captureConsole(() => runCli(["--app", appPath, "run", "explode"]));
    expect(handler.code).toBe(5);
    expect(JSON.parse(handler.stderr).error.code).toBe("OHTOOLS_HANDLER_ERROR");
  });
});

async function captureConsole(action: () => Promise<number>) {
  const originalLog = console.log;
  const originalError = console.error;
  const stdout: string[] = [];
  const stderr: string[] = [];
  console.log = (message?: unknown) => {
    stdout.push(String(message));
  };
  console.error = (message?: unknown) => {
    stderr.push(String(message));
  };
  try {
    const code = await action();
    return { code, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}
