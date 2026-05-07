import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import {
  Ohtools,
  defineGroup,
  defineTool,
  jsonSchema,
  makeError,
  plugin,
  serializeGraph,
} from "../src";

describe("core registry", () => {
  test("validates ids and duplicates", () => {
    expect(() =>
      new Ohtools()
        .tool("bad id", {
          description: "Invalid.",
          run: () => null,
        })
        .build(),
    ).toThrow("OHTOOLS_INVALID_ID");
    expect(() =>
      new Ohtools()
        .tool("hello", { description: "One.", run: () => null })
        .tool("hello", { description: "Two.", run: () => null })
        .build(),
    ).toThrow("OHTOOLS_DUPLICATE_TOOL");
  });

  test("builds immutable deterministic graph", () => {
    const registry = new Ohtools()
      .group("issues", (group) =>
        group.tool("list", {
          description: "List issues.",
          run: () => [],
        }),
      )
      .build();
    expect(registry.tools.has("issues.list")).toBe(true);
    expect(Object.isFrozen(registry)).toBe(true);
    expect(serializeGraph(registry.graph).nodes.map((node) => node.id)).toEqual([
      "issues",
      "issues.list",
    ]);
  });

  test("detects missing next steps", () => {
    expect(() =>
      new Ohtools()
        .tool("first", { description: "First.", next: ["missing"], run: () => null })
        .build(),
    ).toThrow("OHTOOLS_MISSING_NEXT_STEP");
  });

  test("composes plugins and rejects metadata conflicts", () => {
    const tools = plugin("tools")
      .metadata("owner", "team-a")
      .tool("hello", { description: "Hello.", run: () => "ok" });
    const registry = new Ohtools().use(tools).build();
    expect(registry.tools.has("hello")).toBe(true);
    expect(() =>
      new Ohtools().use(tools).use(plugin("other").metadata("owner", "team-b")).build(),
    ).toThrow("OHTOOLS_INCOMPATIBLE_METADATA");
  });

  test("registers defined tools by exact id", async () => {
    const tool = defineTool({
      id: "catalog.inspect",
      description: "Inspect catalog.",
      input: jsonSchema<{ name: string }>({
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      }),
      output: jsonSchema<{ greeting: string }>({
        type: "object",
        properties: { greeting: { type: "string" } },
        required: ["greeting"],
      }),
      run: ({ name }) => ({ greeting: `Hello, ${name}` }),
    });
    const app = new Ohtools().tool(tool);

    expect(app.build().tools.has("catalog.inspect")).toBe(true);
    const result = await Effect.runPromise(app.runtime().runTool(tool, { name: "Ada" }));
    expect(result.output).toEqual({ greeting: "Hello, Ada" });
  });

  test("adds group hierarchy for defined tools without changing ids", () => {
    const tool = defineTool({
      id: "tools.audit",
      description: "Audit.",
      run: () => "ok",
    });
    const registry = new Ohtools().group("ops", (group) => group.tool(tool)).build();

    expect(registry.tools.has("tools.audit")).toBe(true);
    expect(registry.tools.has("ops.tools.audit")).toBe(false);
    expect(registry.tools.get("tools.audit")?.hierarchy?.parent).toBe("ops");
    expect(serializeGraph(registry.graph).edges).toContainEqual({
      from: "ops",
      to: "tools.audit",
      kind: "contains",
    });
  });

  test("keeps relative shorthand group tool ids prefixed", () => {
    const registry = new Ohtools()
      .group("ops", (group) =>
        group.tool("audit", {
          description: "Audit.",
          run: () => "ok",
        }),
      )
      .build();

    expect(registry.tools.has("ops.audit")).toBe(true);
    expect(registry.tools.has("audit")).toBe(false);
  });

  test("composes defined groups with nested next steps", async () => {
    const start = defineTool({
      id: "workflow.start",
      description: "Start.",
      next: [{ id: "workflow.review", reason: "Review the result." }],
      run: () => ({ ok: true }),
    });
    const review = defineTool({
      id: "workflow.review",
      description: "Review.",
      run: () => "reviewed",
    });
    const group = defineGroup({ id: "workflow", description: "Workflow." }, (workflow) =>
      workflow
        .tool(start)
        .group(
          defineGroup({ id: "workflow.review-stage", description: "Review stage." }, (stage) =>
            stage.tool(review),
          ),
        ),
    );
    const runtime = new Ohtools().group(group).runtime();

    const explored = await Effect.runPromise(runtime.explore({ nodeId: "workflow", depth: 2 }));
    expect(explored.node.children.map((node) => node.id)).toEqual([
      "workflow.review-stage",
      "workflow.review",
      "workflow.start",
    ]);
    const result = await Effect.runPromise(runtime.runTool(start, {}));
    expect(result.next).toMatchObject([
      { id: "workflow.review", reason: "Review the result.", available: true },
    ]);
  });
});

describe("explore and runtime", () => {
  test("explores without running handlers and runs with validation", async () => {
    let calls = 0;
    const app = new Ohtools()
      .tool("bye", { description: "Say bye.", run: () => "bye" })
      .tool("hello", {
        description: "Say hello.",
        input: jsonSchema<{ name: string }>({
          type: "object",
          properties: { name: { type: "string" } },
          required: ["name"],
        }),
        next: [{ id: "bye", reason: "finish" }],
        run: ({ name }) => {
          calls += 1;
          return { message: `Hello, ${name}` };
        },
      });
    const runtime = app.runtime();
    const explored = await Effect.runPromise(runtime.explore({ nodeId: "hello" }));
    expect(explored.next[0]?.id).toBe("bye");
    expect(calls).toBe(0);
    const result = await Effect.runPromise(
      runtime.run({ toolId: "hello", input: { name: "Ada" } }),
    );
    expect(result.output).toEqual({ message: "Hello, Ada" });
    expect(calls).toBe(1);
    const invalid = await Effect.runPromise(
      Effect.either(runtime.run({ toolId: "hello", input: {} })),
    );
    expect(invalid._tag).toBe("Left");
    if (invalid._tag === "Left") expect(invalid.left.code).toBe("OHTOOLS_VALIDATION_ERROR");
  });

  test("explores root, group, and tool nodes with depth-limited children", async () => {
    const app = new Ohtools()
      .tool("top", { description: "Top-level tool.", run: () => null })
      .group("issues", (group) =>
        group
          .describe("Issue workflows.")
          .tool("list", { description: "List issues.", run: () => [] })
          .group("triage", (nested) =>
            nested.tool("assign", { description: "Assign an issue.", run: () => null }),
          ),
      );
    const runtime = app.runtime();

    const root = await Effect.runPromise(runtime.explore({ depth: 1 }));
    expect(root.node.children.map((node) => node.id)).toEqual(["issues", "top"]);

    const group = await Effect.runPromise(runtime.explore({ nodeId: "issues", depth: 2 }));
    expect(group.node.kind).toBe("group");
    expect(group.node.description).toBe("Issue workflows.");
    expect(group.node.children.map((node) => node.id)).toEqual([
      "issues.list",
      "issues.triage",
      "issues.triage.assign",
    ]);

    const tool = await Effect.runPromise(runtime.explore({ nodeId: "issues.list" }));
    expect(tool.node.kind).toBe("tool");
    expect(tool.node.description).toBe("List issues.");
    expect(tool.path).toEqual(["issues", "issues.list"]);
  });

  test("resolves async and effect next steps in declaration order", async () => {
    const app = new Ohtools()
      .tool("promise-next", { description: "Promise target.", run: () => null })
      .tool("effect-next", { description: "Effect target.", run: () => null })
      .tool("hidden-next", { description: "Hidden target.", run: () => null })
      .tool("start", {
        description: "Start.",
        next: [
          {
            id: "promise-next",
            when: async (event) =>
              event.kind === "explore" || Boolean((event.output as { ok?: boolean }).ok),
          },
          { id: "effect-next", when: () => Effect.succeed(true), exploreFirst: true },
          { id: "hidden-next", when: () => false },
        ],
        run: () => ({ ok: true }),
      });

    const explored = await Effect.runPromise(app.runtime().explore({ nodeId: "start" }));
    expect(explored.next.map((step) => step.id)).toEqual(["promise-next", "effect-next"]);
    expect(explored.next[1]?.exploreFirst).toBe(true);

    const result = await Effect.runPromise(app.runtime().run({ toolId: "start", input: {} }));
    expect(result.output).toEqual({ ok: true });
    expect(result.next.map((step) => step.id)).toEqual(["promise-next", "effect-next"]);
  });

  test("returns next-step resolver failures as warnings", async () => {
    const app = new Ohtools()
      .tool("next", { description: "Next.", run: () => null })
      .tool("start", {
        description: "Start.",
        next: [
          {
            id: "next",
            when: () => Effect.fail(makeError("OHTOOLS_HANDLER_ERROR", "Resolver failed.")),
          },
        ],
        run: () => "ok",
      });

    const result = await Effect.runPromise(app.runtime().run({ toolId: "start", input: {} }));
    expect(result.output).toBe("ok");
    expect(result.next).toMatchObject([{ id: "next", available: false }]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.code).toBe("OHTOOLS_NEXT_STEP_ERROR");
  });

  test("handles optional unavailable next steps with visibility modes", async () => {
    const app = new Ohtools().tool("start", {
      description: "Start.",
      next: [{ id: "maybe-later", optional: true, reason: "not installed" }],
      run: () => null,
    });
    const runtime = app.runtime();

    const hidden = await Effect.runPromise(runtime.explore({ nodeId: "start" }));
    expect(hidden.next).toEqual([]);

    const visible = await Effect.runPromise(
      runtime.explore({ nodeId: "start", includeUnavailable: true }),
    );
    expect(visible.next).toMatchObject([
      { id: "maybe-later", kind: "tool", reason: "not installed", available: false },
    ]);
  });

  test("traverses contains cycles once per path", async () => {
    const runtime = new Ohtools()
      .group("a", { nodes: ["b"], description: "A." })
      .group("b", { nodes: ["a"], description: "B." })
      .runtime();

    const explored = await Effect.runPromise(runtime.explore({ nodeId: "a", depth: 8 }));
    expect(explored.node.children.map((node) => node.id)).toEqual(["b", "a"]);
    expect(explored.node.children[1]).toMatchObject({
      id: "a",
      cycle: true,
      path: ["a", "b", "a"],
    });
  });

  test("rejects running groups and explore-only tools", async () => {
    const runtime = new Ohtools()
      .group("group", { description: "Group." })
      .tool("inspect", { description: "Inspect.", mode: "explore", run: () => null })
      .runtime();

    const groupRun = await Effect.runPromise(
      Effect.either(runtime.run({ toolId: "group", input: {} })),
    );
    expect(groupRun._tag).toBe("Left");
    if (groupRun._tag === "Left") expect(groupRun.left.code).toBe("OHTOOLS_GROUP_NOT_RUNNABLE");

    const exploreOnlyRun = await Effect.runPromise(
      Effect.either(runtime.run({ toolId: "inspect", input: {} })),
    );
    expect(exploreOnlyRun._tag).toBe("Left");
    if (exploreOnlyRun._tag === "Left")
      expect(exploreOnlyRun.left.code).toBe("OHTOOLS_TOOL_NOT_RUNNABLE");
  });

  test("runs effect handlers and preserves typed errors", async () => {
    const app = new Ohtools().tool("fail", {
      description: "Fail.",
      run: () => Effect.fail(makeError("OHTOOLS_HANDLER_ERROR", "Nope.")),
    });
    const failed = await Effect.runPromise(
      Effect.either(app.runtime().run({ toolId: "fail", input: {} })),
    );
    expect(failed._tag).toBe("Left");
    if (failed._tag === "Left") expect(failed.left.code).toBe("OHTOOLS_HANDLER_ERROR");
  });

  test("injects effect services through runtime layers", async () => {
    class Greeter extends Context.Tag("Greeter")<
      Greeter,
      { readonly greet: (name: string) => string }
    >() {}
    const app = new Ohtools<Greeter>().tool("greet", {
      description: "Greet with a service.",
      input: jsonSchema<{ name: string }>({
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      }),
      run: ({ name }) =>
        Effect.gen(function* () {
          const greeter = yield* Greeter;
          return { message: greeter.greet(name) };
        }),
    });

    const result = await Effect.runPromise(
      app
        .runtime({
          layer: Layer.succeed(Greeter, { greet: (name) => `Hello, ${name}` }),
        })
        .run({ toolId: "greet", input: { name: "Ada" } }),
    );

    expect(result.output).toEqual({ message: "Hello, Ada" });
  });

  test("normalizes thrown and rejected handler failures", async () => {
    const runtime = new Ohtools()
      .tool("throws", {
        description: "Throw.",
        run: () => {
          throw new Error("boom");
        },
      })
      .tool("rejects", {
        description: "Reject.",
        run: async () => {
          throw new Error("nope");
        },
      })
      .runtime();

    const thrown = await Effect.runPromise(
      Effect.either(runtime.run({ toolId: "throws", input: {} })),
    );
    const rejected = await Effect.runPromise(
      Effect.either(runtime.run({ toolId: "rejects", input: {} })),
    );

    expect(thrown._tag).toBe("Left");
    if (thrown._tag === "Left") expect(thrown.left.code).toBe("OHTOOLS_HANDLER_ERROR");
    expect(rejected._tag).toBe("Left");
    if (rejected._tag === "Left") expect(rejected.left.code).toBe("OHTOOLS_HANDLER_ERROR");
  });

  test("times out slow handlers", async () => {
    const app = new Ohtools().tool("slow", {
      description: "Slow.",
      run: () => new Promise((resolve) => setTimeout(resolve, 50)),
    });
    const result = await Effect.runPromise(
      Effect.either(app.runtime({ timeoutMs: 1 }).run({ toolId: "slow", input: {} })),
    );
    expect(result._tag).toBe("Left");
    if (result._tag === "Left") expect(result.left.code).toBe("OHTOOLS_TIMEOUT");
  });

  test("cancels before start and during effect execution", async () => {
    let calls = 0;
    let interrupted = false;
    const app = new Ohtools().tool("slow", {
      description: "Slow.",
      run: () => {
        calls += 1;
        return Effect.sleep("1 second").pipe(
          Effect.as("done"),
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              interrupted = true;
            }),
          ),
        );
      },
    });

    const beforeStart = new AbortController();
    beforeStart.abort();
    const skipped = await Effect.runPromise(
      Effect.either(app.runtime({ signal: beforeStart.signal }).run({ toolId: "slow", input: {} })),
    );
    expect(skipped._tag).toBe("Left");
    expect(calls).toBe(0);
    if (skipped._tag === "Left") expect(skipped.left.code).toBe("OHTOOLS_CANCELLED");

    const duringRun = new AbortController();
    const pending = Effect.runPromise(
      Effect.either(app.runtime({ signal: duringRun.signal }).run({ toolId: "slow", input: {} })),
    );
    setTimeout(() => duringRun.abort(), 5);
    const cancelled = await pending;
    expect(cancelled._tag).toBe("Left");
    if (cancelled._tag === "Left") expect(cancelled.left.code).toBe("OHTOOLS_CANCELLED");
    expect(interrupted).toBe(true);
  });

  test("runs scoped effect cleanup", async () => {
    let closed = false;
    const app = new Ohtools().tool("scoped", {
      description: "Scoped.",
      run: () =>
        Effect.scoped(
          Effect.gen(function* () {
            yield* Effect.acquireRelease(Effect.succeed("resource"), () =>
              Effect.sync(() => {
                closed = true;
              }),
            );
            return "ok";
          }),
        ),
    });

    const result = await Effect.runPromise(app.runtime().run({ toolId: "scoped", input: {} }));

    expect(result.output).toBe("ok");
    expect(closed).toBe(true);
  });
});
