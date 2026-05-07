# Ohtools Specification

## Status

This document is a draft specification for Ohtools. It describes the intended
shape of the framework and the development principles behind it. It is not a
final API contract.

Ohtools is an opinionated TypeScript framework for building hierarchical MCP
servers and CLI tools for AI agents. It is a devtool inspired by Elysia's focus
on ergonomic APIs, modular composition, plugin-oriented design, and strong
developer experience.

## Purpose

Ohtools exists to make MCP servers easier to design, compose, document, and
extend.

Most MCP servers expose a flat list of tools. That can work for simple agents,
but it becomes harder for models to choose the correct tool as the available
surface grows. Ohtools is built around the idea that hierarchical tooling is a
better default for many agent workflows, especially for smaller models.

Instead of only offering a flat tool registry, Ohtools should help developers
build a guided tool graph. A model should be able to inspect a tool, understand
what it does, run it when appropriate, and receive clear next steps that point to
the next useful tools.

## Design Principles

### Functional Programming

Ohtools should be built around functional programming patterns. Core behavior
should prefer pure functions, explicit data flow, immutable data structures where
practical, and composable units over hidden mutation.

Framework APIs should encourage developers to model tools, plugins, ports, and
adapters as reusable functional components.

### Tiger Style

Ohtools should follow the spirit of Tiger Style:

- Keep control flow explicit.
- Prefer simple, predictable code over clever abstractions.
- Make invalid states hard to represent.
- Treat correctness, observability, and failure handling as design constraints.
- Avoid unnecessary runtime complexity.

The goal is not to mechanically copy every rule, but to use Tiger Style as a
quality bar for framework internals and generated examples.

### Modularity

Everything should be modular and reusable. Ohtools should use hexagonal
architecture and vertical slicing to separate core domain behavior from
transport, runtime, and integration details.

The core should not depend directly on a specific transport, CLI runner, or host
application. Those concerns should be implemented through ports and adapters.

### Plug-and-Play Integration

Ohtools should expose clear extension points for both directions of integration:

- Existing software should be able to embed Ohtools and expose selected
  capabilities as MCP tools.
- Ohtools-based servers should be easy to plug into AI workflows, agent runtimes,
  and development tooling.

Plugins should be first-class. A developer should be able to add or remove a
plugin without rewriting the rest of the server.

### Hierarchical Discovery

Ohtools should make hierarchical tooling a default framework concept. A tool may
belong to a tree or graph of related actions. Each tool should be able to expose
documentation, describe its hierarchy level, and declare the next tools that are
useful after exploration or execution.

## Developer Experience

Ohtools should provide an ergonomic TypeScript API inspired by Elysia. The
inspiration is about developer experience and composition, not about becoming a
web framework.

The desired developer experience is:

- A small core API with sensible defaults.
- A fluent composition model for apps, plugins, tools, groups, ports, and
  adapters.
- Strong TypeScript inference where feasible.
- Runtime validation and type-level feedback aligned from a single source of
  truth where practical.
- Plugins that can be developed independently and composed with `.use(...)`.
- Clear documentation generated from tool metadata and hierarchy information.

The exact public `v1.0.0` API is defined by the numbered specs. The product
vision expects an API with this general shape:

```ts
import { Ohtools } from "@bosun-sh/ohtools";

const app = new Ohtools()
  .use(repositoryTools())
  .group("issues", (group) =>
    group
      .tool("list", {
        level: 1,
        description: "List issues that need attention.",
        run: listIssues,
        next: ["issues.inspect"],
      })
      .tool("inspect", {
        level: 2,
        description: "Inspect one issue and suggest next actions.",
        run: inspectIssue,
        next: ["issues.fix", "issues.comment"],
      }),
  )
  .adapter(mcpAdapter())
  .serve();
```

This example captures the intended feel of the framework. The numbered specs
lock final method names and signatures for public `v1.0.0`.

## Core Concepts

### App

The app is the compositional root. It collects tools, plugins, hierarchy
metadata, ports, adapters, and runtime configuration.

An app should be independently useful and composable into another app or host
system.

### Tool

A tool is an executable capability exposed to an AI agent through MCP, a CLI, or
another adapter.

A tool should define:

- A stable name or identifier.
- A short description.
- Input and output contracts.
- An implementation function.
- Optional hierarchy metadata.
- Optional documentation for exploration.
- Optional next-step relationships.

### Hierarchy Node

A hierarchy node represents a tool or group of tools in the guided exploration
model. It may be part of a tree or a graph.

A hierarchy node should describe:

- Its level or depth.
- Its parent or related nodes when applicable.
- Its available child or next nodes.
- Documentation that helps a model decide what to do next.

### Explore vs Run

Ohtools should distinguish between exploring a tool and running a tool.

Explore mode should return documentation, requirements, expected output, and
next-step information without executing the tool's side effects.

Run mode should execute the tool and return its result together with useful next
steps.

### Next Steps

After a tool is explored or run, Ohtools should be able to return the next
available tools. This allows an agent to navigate a workflow incrementally
instead of selecting blindly from a large flat list.

Next steps should be explicit enough for a model to understand why each option
is available.

### Plugin

A plugin is a reusable module that can extend an app. Plugins may add tools,
groups, adapters, ports, documentation, validation, middleware-like behavior, or
runtime integrations.

Plugins should be isolated enough to run independently or as part of a larger
app, while still contributing type information and metadata to the composed
application where feasible.

### Port

A port is a framework-defined boundary for an external capability. Examples may
include persistence, logging, tracing, file access, authentication, or host
application APIs.

Ports should describe what the core needs without coupling the core to a
specific implementation.

### Adapter

An adapter implements a port or exposes an app through a runtime surface such as
MCP or a CLI.

Adapters should be replaceable. For example, the same tool graph should be
usable through an MCP server adapter and a CLI adapter when the tool contracts
support both.

## Architecture

Ohtools should use a hexagonal architecture:

- The core domain owns tool registration, hierarchy modeling, plugin
  composition, metadata, validation contracts, and execution planning.
- Ports define boundaries between the core and external systems.
- Adapters connect those ports to concrete runtimes and integrations.

Ohtools should also support vertical slicing. A plugin or feature slice should
be able to package its own tools, contracts, docs, and adapters without requiring
global framework changes.

The architecture should make it possible to use the same core definitions in
multiple environments:

- MCP server.
- CLI tool.
- Embedded host application.
- Test harness.
- Local development workflow.

## Hierarchical Tooling Model

The hierarchy model should support both trees and graphs.

A tree is useful when a workflow has a clear top-down structure. A graph is
useful when tools are related by capability, state, or workflow stage rather
than strict parent-child ownership.

Each hierarchical tool should be able to declare:

- Its hierarchy level.
- Its documentation.
- Whether it is exploratory, executable, or both.
- The tools that may follow exploration.
- The tools that may follow execution.
- Any constraints that determine whether a next step is available.

When a model explores or runs a tool, the response should include enough context
to continue the workflow:

- What happened or what the tool represents.
- What can be done next.
- Which next tools are executable.
- Which next tools should be explored first.
- Any required input for the next step.

## Plugin Model

Plugins are the primary plug-and-play mechanism.

A plugin should be able to:

- Register tools.
- Register groups or hierarchy nodes.
- Add documentation.
- Add ports or adapter bindings.
- Add validation or preprocessing behavior.
- Add shared dependencies through explicit context.
- Compose other plugins.

Plugin composition should be predictable. Adding a plugin should not create
hidden global behavior that is difficult to inspect.

A conceptual plugin may look like this:

```ts
import { plugin } from "@bosun-sh/ohtools";

export const repositoryTools = () =>
  plugin("repository-tools")
    .tool("repo.status", {
      level: 1,
      description: "Summarize the repository state.",
      run: getRepositoryStatus,
      next: ["repo.changed-files", "repo.test-plan"],
    })
    .tool("repo.changed-files", {
      level: 2,
      description: "Inspect changed files and group them by concern.",
      run: inspectChangedFiles,
    });
```

The numbered specs refine this shape into the public `v1.0.0` API contract.

## Runtime and Dependencies

Ohtools should be written in TypeScript.

The main runtime should be Bun. Bun should be the only supported runtime unless
the project explicitly changes direction.

The intended core dependencies are:

- `@modelcontextprotocol/typescript-sdk` for MCP integration.
- `effect` for functional effects, typed errors, dependency management, and
  runtime composition.
- Bun-provided tooling for scripts, tests, and package execution.

Dependencies should remain minimal. New dependencies should be added only when
they provide clear value and fit the framework's functional, modular design.

## Non-Goals

Ohtools is not intended to be:

- A general-purpose HTTP web framework.
- A replacement for the MCP TypeScript SDK.
- A finished production API in this draft form.
- A framework that hides all MCP concepts from developers.
- A runtime with many required dependencies.

The goal is to make MCP tool design more structured and ergonomic while still
remaining close enough to MCP that developers understand what is being exposed
to agents.

## Resolved for Public v1

The numbered specs in this directory resolve the implementation questions for
public `v1.0.0`. `SPEC.md` remains the product vision; the numbered specs are
the source of truth for final API names, schema strategy, validation lifecycle,
type inference targets, plugin conflict behavior, graph traversal rules,
generated documentation format, CLI support, adapters, and Effect runtime
integration.
