import { Effect } from "effect";
import { exploreRegistry, serializeGraph } from "../core";
import { makeError, throwError } from "../errors";
import type { AdapterDefinition, BuiltOhtoolsApp, JsonSchema, OhtoolsRegistry } from "../types";

export interface McpAdapterOptions {
  stdio?: boolean;
  name?: string;
  version?: string;
}

export function mcpAdapter(options: McpAdapterOptions = {}): AdapterDefinition {
  return {
    id: "mcp",
    kind: "mcp",
    attach(app: BuiltOhtoolsApp) {
      let server: unknown;
      let started = false;
      return {
        async start() {
          assertMcpCompatible(app.registry);
          if (started) return;
          started = true;
          if (!options.stdio) return;
          const [{ McpServer }, { StdioServerTransport }] = await Promise.all([
            import("@modelcontextprotocol/sdk/server/mcp.js"),
            import("@modelcontextprotocol/sdk/server/stdio.js"),
          ]);
          const mcp = new McpServer({
            name: options.name ?? "ohtools",
            version: options.version ?? "1.0.0",
          });
          registerTools(mcp, app);
          const transport = new StdioServerTransport();
          server = mcp;
          await mcp.connect(transport);
        },
        async stop() {
          if (server && typeof (server as { close?: () => Promise<void> }).close === "function") {
            await (server as { close: () => Promise<void> }).close();
          }
          server = undefined;
          started = false;
        },
      };
    },
  };
}

export function mcpToolDescriptors(registry: OhtoolsRegistry) {
  assertMcpCompatible(registry);
  return [
    ...[...registry.tools.values()]
      .filter((tool) => tool.mode !== "explore")
      .map((tool) => ({
        name: tool.id,
        description: tool.description,
        inputSchema: tool.input?.jsonSchema ?? { type: "object", properties: {} },
      })),
    {
      name: "ohtools.explore",
      description: "Explore an Ohtools node without running handlers.",
      inputSchema: { type: "object", properties: { nodeId: { type: "string" } } },
    },
    {
      name: "ohtools.graph",
      description: "Return the serialized Ohtools graph.",
      inputSchema: { type: "object", properties: {} },
    },
  ];
}

export function mcpResources(registry: OhtoolsRegistry) {
  return [
    { uri: "ohtools://graph", text: JSON.stringify(serializeGraph(registry.graph), null, 2) },
    ...[...registry.tools.values()].map((tool) => ({
      uri: `ohtools://tools/${tool.id}`,
      text: JSON.stringify(tool, null, 2),
    })),
    ...[...registry.groups.values()].map((group) => ({
      uri: `ohtools://groups/${group.id}`,
      text: JSON.stringify(group, null, 2),
    })),
  ];
}

function assertMcpCompatible(registry: OhtoolsRegistry) {
  for (const tool of registry.tools.values()) {
    if (tool.mode === "explore") continue;
    const schema = tool.input?.jsonSchema;
    if (schema && schema.type !== "object") {
      throwError(
        makeError(
          "OHTOOLS_ADAPTER_ERROR",
          `MCP tool "${tool.id}" input schema must be an object root.`,
          {
            path: [tool.id, "input"],
          },
        ),
      );
    }
    if (schema && hasCircularRef(schema)) {
      throwError(
        makeError(
          "OHTOOLS_ADAPTER_ERROR",
          `MCP tool "${tool.id}" input schema contains circular refs.`,
          {
            path: [tool.id, "input"],
          },
        ),
      );
    }
  }
}

function registerTools(server: any, app: BuiltOhtoolsApp) {
  for (const tool of app.registry.tools.values()) {
    if (tool.mode === "explore") continue;
    server.tool(tool.id, tool.description, tool.input?.jsonSchema ?? {}, async (input: unknown) => {
      const result = await Effect.runPromise(app.runtime().run({ toolId: tool.id, input }));
      return { content: [{ type: "text", text: JSON.stringify(result.output) }] };
    });
  }
  server.tool(
    "ohtools.explore",
    "Explore an Ohtools node.",
    {},
    async (input: { nodeId?: string }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(exploreRegistry(app.registry, { nodeId: input.nodeId })),
        },
      ],
    }),
  );
  server.tool("ohtools.graph", "Return the Ohtools graph.", {}, async () => ({
    content: [{ type: "text", text: JSON.stringify(serializeGraph(app.registry.graph)) }],
  }));
}

function hasCircularRef(schema: JsonSchema) {
  return JSON.stringify(schema).includes('"$recursiveRef"');
}
