import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { Effect } from "effect";
import {
  formatError,
  generateDocsJson,
  generateDocsMarkdown,
  jsonSchema,
  makeError,
  normalizeError,
  Ohtools,
  type OhtoolsError,
} from "../src";
import { runCli } from "../src/adapters/cli";
import docsApp from "./fixtures/docs-app";

describe("generated docs", () => {
  test("generates Markdown by default with schemas, hierarchy, and next steps", () => {
    expect(generateDocsMarkdown(docsApp.build())).toMatchInlineSnapshot(`
"# Ohtools Tools

## status

Return service status.

Hierarchy path: status

Input schema:
None

Output schema:
None

Next steps:
- None

## support.reply

Draft a customer response.

Hierarchy path: support > support.reply

Input schema:
None

Output schema:
None

Next steps:
- None

## support.triage

Title: Triage request

Classify a support request.

Hierarchy path: support > support.triage

Input schema:
\`\`\`json
{
  "type": "object",
  "properties": {
    "text": {
      "type": "string"
    }
  },
  "required": [
    "text"
  ]
}
\`\`\`

Output schema:
\`\`\`json
{
  "type": "object",
  "properties": {
    "priority": {
      "enum": [
        "low",
        "high"
      ]
    }
  },
  "required": [
    "priority"
  ]
}
\`\`\`

Next steps:
- support.reply (tool, reason: draft customer response)"
`);
  });

  test("generates JSON docs for agents", () => {
    expect(generateDocsJson(docsApp.build())).toMatchInlineSnapshot(`
{
  "tools": [
    {
      "description": "Return service status.",
      "hierarchyPath": [
        "status",
      ],
      "id": "status",
      "inputSchema": null,
      "nextSteps": [],
      "outputSchema": null,
      "title": undefined,
    },
    {
      "description": "Draft a customer response.",
      "hierarchyPath": [
        "support",
        "support.reply",
      ],
      "id": "support.reply",
      "inputSchema": null,
      "nextSteps": [],
      "outputSchema": null,
      "title": undefined,
    },
    {
      "description": "Classify a support request.",
      "hierarchyPath": [
        "support",
        "support.triage",
      ],
      "id": "support.triage",
      "inputSchema": {
        "properties": {
          "text": {
            "type": "string",
          },
        },
        "required": [
          "text",
        ],
        "type": "object",
      },
      "nextSteps": [
        {
          "exploreFirst": undefined,
          "id": "support.reply",
          "kind": "tool",
          "optional": undefined,
          "reason": "draft customer response",
        },
      ],
      "outputSchema": {
        "properties": {
          "priority": {
            "enum": [
              "low",
              "high",
            ],
          },
        },
        "required": [
          "priority",
        ],
        "type": "object",
      },
      "title": "Triage request",
    },
  ],
}
`);
  });

  test("docs CLI command writes Markdown by default and JSON with --format json", async () => {
    const appPath = resolve("packages/ohtools/test/fixtures/docs-app.ts");
    const markdown = await captureStdout(() => runCli(["--app", appPath, "docs"]));
    expect(markdown.code).toBe(0);
    expect(markdown.output).toContain("# Ohtools Tools");
    expect(markdown.output).toContain("## support.triage");

    const json = await captureStdout(() => runCli(["--app", appPath, "docs", "--format", "json"]));
    expect(json.code).toBe(0);
    expect(JSON.parse(json.output).tools[2]).toMatchObject({
      id: "support.triage",
      hierarchyPath: ["support", "support.triage"],
    });
  });
});

describe("error formatting", () => {
  test("formats duplicate tool errors with code, path, and suggested fix", () => {
    const error = captureError(() =>
      new Ohtools()
        .tool("hello", { description: "Hello.", run: () => null })
        .tool("hello", { description: "Again.", run: () => null })
        .build(),
    );
    expect(formatError(error)).toBe(
      'OHTOOLS_DUPLICATE_TOOL at hello: Duplicate tool "hello". Suggested fix: Rename one contribution or remove the duplicate registration.',
    );
  });

  test("formats invalid schema errors with affected input path", async () => {
    const app = new Ohtools().tool("hello", {
      description: "Hello.",
      input: jsonSchema<{ name: string }>({
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      }),
      run: ({ name }) => ({ message: name }),
    });
    const failed = await Effect.runPromise(
      Effect.either(app.runtime().run({ toolId: "hello", input: {} })),
    );
    expect(failed._tag).toBe("Left");
    if (failed._tag === "Left") {
      expect(formatError(failed.left)).toBe(
        "OHTOOLS_VALIDATION_ERROR at hello.input: Input does not match JSON Schema. Suggested fix: Check the input or output schema and supplied JSON.",
      );
    }
  });

  test("formats missing next step errors with affected next path", () => {
    const error = captureError(() =>
      new Ohtools()
        .tool("start", { description: "Start.", next: ["missing"], run: () => null })
        .build(),
    );
    expect(formatError(error)).toBe(
      'OHTOOLS_MISSING_NEXT_STEP at start.next.missing: Next step "missing" is not registered. Suggested fix: Register the target node or mark the next step optional.',
    );
  });

  test("formats handler failures with affected tool path", async () => {
    const app = new Ohtools().tool("explode", {
      description: "Explode.",
      run: () => {
        throw makeError("OHTOOLS_HANDLER_ERROR", "Handler exploded.", { path: ["explode"] });
      },
    });
    const failed = await Effect.runPromise(
      Effect.either(app.runtime().run({ toolId: "explode", input: {} })),
    );
    expect(failed._tag).toBe("Left");
    if (failed._tag === "Left") {
      expect(formatError(failed.left)).toBe("OHTOOLS_HANDLER_ERROR at explode: Handler exploded.");
    }
  });
});

function captureError(action: () => unknown): OhtoolsError {
  try {
    action();
  } catch (cause) {
    return normalizeError(cause, "OHTOOLS_ADAPTER_ERROR");
  }
  throw new Error("Expected action to throw.");
}

async function captureStdout(action: () => Promise<number>) {
  const original = console.log;
  const messages: string[] = [];
  console.log = (message?: unknown) => {
    messages.push(String(message));
  };
  try {
    const code = await action();
    return { code, output: messages.join("\n") };
  } finally {
    console.log = original;
  }
}
