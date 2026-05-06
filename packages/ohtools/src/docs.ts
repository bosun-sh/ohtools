import type {
  JsonSchema,
  NextStepDefinition,
  NodeId,
  OhtoolsRegistry,
  ResolvedNextStep,
  ToolId,
} from "./types";

export type GeneratedDocsFormat = "markdown" | "json";

export interface GeneratedToolDoc {
  id: ToolId;
  title?: string;
  description: string;
  hierarchyPath: NodeId[];
  inputSchema: JsonSchema | null;
  outputSchema: JsonSchema | null;
  nextSteps: GeneratedNextStepDoc[];
}

export interface GeneratedNextStepDoc {
  id: NodeId;
  kind: ResolvedNextStep["kind"] | "unknown";
  reason?: string;
  optional?: boolean;
  exploreFirst?: boolean;
}

export interface GeneratedDocsJson {
  tools: GeneratedToolDoc[];
}

export function generateDocsJson(registry: OhtoolsRegistry): GeneratedDocsJson {
  return {
    tools: [...registry.tools.values()]
      .map((tool) => ({
        id: tool.id,
        title: tool.title,
        description: tool.description,
        hierarchyPath: resolveHierarchyPath(registry, tool.id),
        inputSchema: tool.input?.jsonSchema ?? null,
        outputSchema: tool.output?.jsonSchema ?? null,
        nextSteps: (tool.next ?? []).map((next) => describeNextStep(registry, next)),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function generateDocsMarkdown(registry: OhtoolsRegistry): string {
  const docs = generateDocsJson(registry);
  const lines = ["# Ohtools Tools", ""];

  for (const tool of docs.tools) {
    lines.push(`## ${tool.id}`, "");
    if (tool.title) lines.push(`Title: ${tool.title}`, "");
    lines.push(tool.description, "");
    lines.push(`Hierarchy path: ${tool.hierarchyPath.join(" > ") || tool.id}`, "");
    lines.push("Input schema:");
    lines.push(formatSchemaBlock(tool.inputSchema), "");
    lines.push("Output schema:");
    lines.push(formatSchemaBlock(tool.outputSchema), "");
    lines.push("Next steps:");
    if (tool.nextSteps.length === 0) {
      lines.push("- None");
    } else {
      for (const next of tool.nextSteps) {
        const details = [
          next.kind !== "unknown" ? next.kind : undefined,
          next.reason ? `reason: ${next.reason}` : undefined,
          next.optional ? "optional" : undefined,
          next.exploreFirst ? "explore first" : undefined,
        ].filter(Boolean);
        lines.push(`- ${next.id}${details.length ? ` (${details.join(", ")})` : ""}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export function generateDocs(
  registry: OhtoolsRegistry,
  options: { format?: GeneratedDocsFormat } = {},
): string | GeneratedDocsJson {
  return options.format === "json" ? generateDocsJson(registry) : generateDocsMarkdown(registry);
}

function describeNextStep(
  registry: OhtoolsRegistry,
  next: NextStepDefinition,
): GeneratedNextStepDoc {
  const definition = typeof next === "string" ? { id: next } : next;
  return {
    id: definition.id,
    kind: registry.graph.nodes.get(definition.id)?.kind ?? "unknown",
    reason: definition.reason,
    optional: definition.optional,
    exploreFirst: definition.exploreFirst,
  };
}

function resolveHierarchyPath(registry: OhtoolsRegistry, id: NodeId): NodeId[] {
  const path: NodeId[] = [id];
  const seen = new Set<NodeId>(path);
  let current = id;

  while (true) {
    const parent = registry.graph.edges.find(
      (edge) => edge.kind === "contains" && edge.to === current,
    )?.from;
    if (!parent || seen.has(parent)) return path.reverse();
    path.push(parent);
    seen.add(parent);
    current = parent;
  }
}

function formatSchemaBlock(schema: JsonSchema | null): string {
  if (!schema) return "None";
  return `\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\``;
}
