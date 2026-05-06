import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { Ohtools, jsonSchema, makeError, plugin, serializeGraph } from "../src";

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
});
