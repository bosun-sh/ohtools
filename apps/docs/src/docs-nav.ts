export interface DocsNavItem {
  label: string;
  href: string;
  description: string;
}

export interface DocsNavGroup {
  label: string;
  description: string;
  items: DocsNavItem[];
}

export const docsNav: DocsNavGroup[] = [
  {
    label: "Start Here",
    description: "First-run path and core concepts.",
    items: [
      {
        label: "Getting Started",
        href: "/getting-started",
        description: "Scaffold, inspect, run, and expose a Bun tool app.",
      },
      {
        label: "App Concept",
        href: "/concepts/app",
        description: "What an Ohtools app owns and where it fits.",
      },
      {
        label: "Tools Concept",
        href: "/concepts/tools",
        description: "Tool anatomy, schemas, handlers, and the run lifecycle.",
      },
      {
        label: "Hierarchy Concept",
        href: "/concepts/hierarchy",
        description: "Groups, graph edges, explore output, and next steps.",
      },
      {
        label: "Plugins Concept",
        href: "/concepts/plugins",
        description: "Reusable packages of tools, groups, adapters, and metadata.",
      },
    ],
  },
  {
    label: "Build Guides",
    description: "Task-first implementation guides.",
    items: [
      {
        label: "First Tool",
        href: "/guides/first-tool",
        description: "Create a typed tool with validation and run it locally.",
      },
      {
        label: "MCP Server",
        href: "/guides/mcp-server",
        description: "Build and launch an MCP stdio server.",
      },
      {
        label: "Plugin Composition",
        href: "/guides/plugin-composition",
        description: "Package and compose domain tools.",
      },
      {
        label: "Complex Apps",
        href: "/guides/complex-apps",
        description: "Project layout for larger Ohtools apps.",
      },
      {
        label: "Effect Services",
        href: "/guides/effect-services",
        description: "Use Effect only where services and layers justify it.",
      },
      {
        label: "Production Patterns",
        href: "/guides/production-patterns",
        description: "Validation, boundaries, errors, and release shape.",
      },
      {
        label: "Skill Flow",
        href: "/guides/skill-flow",
        description: "How scaffolded agent skills guide future edits.",
      },
    ],
  },
  {
    label: "Adapters",
    description: "Ways to expose the same registry.",
    items: [
      {
        label: "MCP Adapter",
        href: "/adapters/mcp",
        description: "MCP stdio behavior, exposed tools, and client config.",
      },
      {
        label: "CLI Adapter",
        href: "/adapters/cli",
        description: "List, explore, run, graph, JSON envelopes, and exit codes.",
      },
    ],
  },
  {
    label: "Reference",
    description: "Lookup pages and release context.",
    items: [
      {
        label: "API",
        href: "/api",
        description: "Public exports organized by builder, runtime, schemas, adapters, and errors.",
      },
      {
        label: "Basic Example",
        href: "/examples/basic",
        description: "Runnable example, source layout, and smoke command.",
      },
      {
        label: "Objectives",
        href: "/objectives",
        description: "Maintenance harness, OKRs, KPIs, and release checks.",
      },
      {
        label: "Changelog",
        href: "/changelog",
        description: "Release notes and compatibility.",
      },
    ],
  },
];

export const docsNavItems = docsNav.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label })),
);

export function normalizeDocsPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized === "" ? "/" : normalized;
}

export function findDocsNavItem(pathname: string) {
  const current = normalizeDocsPath(pathname);
  return docsNavItems.find((item) => item.href === current);
}

export function docsNavNeighbors(pathname: string) {
  const current = normalizeDocsPath(pathname);
  const index = docsNavItems.findIndex((item) => item.href === current);
  return {
    previous: index > 0 ? docsNavItems[index - 1] : undefined,
    next: index >= 0 && index < docsNavItems.length - 1 ? docsNavItems[index + 1] : undefined,
  };
}
