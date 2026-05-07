import { Effect } from "effect";
import { exploreRegistry, serializeGraph } from "../core";
import { makeError, normalizeError, throwError } from "../errors";
import type { AdapterDefinition, BuiltOhtoolsApp, JsonSchema, OhtoolsRegistry } from "../types";

type JsonSchemaNode = JsonSchemaObject | boolean;
type JsonSchemaObject = Readonly<Record<string, unknown>>;

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
            version: options.version ?? "0.1.0",
          });
          registerTools(mcp, app);
          registerResources(mcp, app.registry);
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

export function registerResources(server: McpResourceServer, registry: OhtoolsRegistry) {
  for (const resource of mcpResources(registry)) {
    server.resource(
      resource.uri,
      resource.uri,
      {
        mimeType: "application/json",
      },
      () => ({
        contents: [{ uri: resource.uri, mimeType: "application/json", text: resource.text }],
      }),
    );
  }
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
      try {
        const result = await Effect.runPromise(
          Effect.either(app.runtime().run({ toolId: tool.id, input })),
        );
        if (result._tag === "Left") return mcpErrorResult(result.left, "OHTOOLS_HANDLER_ERROR");
        return { content: [{ type: "text", text: JSON.stringify(result.right.output) }] };
      } catch (cause) {
        return mcpErrorResult(cause, "OHTOOLS_HANDLER_ERROR");
      }
    });
  }
  server.tool(
    "ohtools.explore",
    "Explore an Ohtools node.",
    {},
    async (input: { nodeId?: string }) => {
      try {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(exploreRegistry(app.registry, { nodeId: input.nodeId })),
            },
          ],
        };
      } catch (cause) {
        return mcpErrorResult(cause, "OHTOOLS_ADAPTER_ERROR");
      }
    },
  );
  server.tool("ohtools.graph", "Return the Ohtools graph.", {}, async () => {
    try {
      return {
        content: [{ type: "text", text: JSON.stringify(serializeGraph(app.registry.graph)) }],
      };
    } catch (cause) {
      return mcpErrorResult(cause, "OHTOOLS_ADAPTER_ERROR");
    }
  });
}

function mcpErrorResult(cause: unknown, fallback: Parameters<typeof normalizeError>[1]) {
  const error = normalizeError(cause, fallback);
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify({ ok: false, error }) }],
  };
}

interface McpResourceServer {
  resource(
    name: string,
    uri: string,
    metadata: { mimeType: string },
    readCallback: () => {
      contents: Array<{ uri: string; mimeType: string; text: string }>;
    },
  ): unknown;
}

function hasCircularRef(schema: JsonSchema) {
  return hasObjectCycle(schema, new WeakSet()) || hasCircularLocalRef(schema);
}

function hasObjectCycle(value: unknown, active: WeakSet<object>): boolean {
  if (!isRecord(value) && !Array.isArray(value)) return false;
  if (active.has(value)) return true;
  active.add(value);
  const children = Array.isArray(value) ? value : Object.values(value);
  for (const child of children) {
    if (hasObjectCycle(child, active)) return true;
  }
  active.delete(value);
  return false;
}

function hasCircularLocalRef(schema: JsonSchema): boolean {
  return visitSchemaNode(schema, schema, []);
}

function visitSchemaNode(node: JsonSchemaNode, root: JsonSchema, refStack: string[]): boolean {
  if (typeof node === "boolean") return false;

  const ref = node.$ref;
  if (typeof ref === "string") {
    if (refStack.includes(ref)) return true;
    const resolved = resolveLocalRef(root, ref);
    if (!resolved) return false;
    return visitSchemaNode(resolved, root, [...refStack, ref]);
  }

  for (const child of schemaChildren(node)) {
    if (visitSchemaNode(child, root, refStack)) return true;
  }
  return false;
}

function schemaChildren(schema: JsonSchemaObject): JsonSchemaNode[] {
  const children: JsonSchemaNode[] = [];
  collectObjectChildren(schema.properties, children);
  collectObjectChildren(schema.$defs, children);
  collectObjectChildren(schema.definitions, children);
  collectNode(schema.items, children);
  collectNode(schema.additionalProperties, children);
  collectNode(schema.not, children);
  collectArrayChildren(schema.allOf, children);
  collectArrayChildren(schema.anyOf, children);
  collectArrayChildren(schema.oneOf, children);
  return children;
}

function collectObjectChildren(value: unknown, children: JsonSchemaNode[]) {
  if (!isRecord(value)) return;
  for (const child of Object.values(value)) collectNode(child, children);
}

function collectArrayChildren(value: unknown, children: JsonSchemaNode[]) {
  if (!Array.isArray(value)) return;
  for (const child of value) collectNode(child, children);
}

function collectNode(value: unknown, children: JsonSchemaNode[]) {
  if (typeof value === "boolean" || isRecord(value)) children.push(value as JsonSchemaNode);
}

function resolveLocalRef(root: JsonSchema, ref: string): JsonSchemaNode | undefined {
  if (ref === "#") return root;
  if (!ref.startsWith("#/")) return undefined;
  let current: unknown = root;
  for (const rawSegment of ref.slice(2).split("/")) {
    const segment = rawSegment.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!isRecord(current) || !(segment in current)) return undefined;
    current = current[segment];
  }
  return typeof current === "boolean" || isRecord(current) ? current : undefined;
}

function isRecord(value: unknown): value is JsonSchemaObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
