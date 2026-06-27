import { jsonSchema, Ohtools } from "../../src";

export default new Ohtools()
  .group("support", (group) =>
    group
      .tool("triage", {
        title: "Triage request",
        description: "Classify a support request.",
        input: jsonSchema<{ text: string }>({
          type: "object",
          properties: { text: { type: "string" } },
          required: ["text"],
        }),
        output: jsonSchema<{ priority: "low" | "high" }>({
          type: "object",
          properties: { priority: { enum: ["low", "high"] } },
          required: ["priority"],
        }),
        next: [{ id: "support.reply", reason: "draft customer response" }],
        run: () => ({ priority: "low" }),
      })
      .tool("reply", {
        description: "Draft a customer response.",
        run: () => ({ message: "Thanks for the report." }),
      }),
  )
  .tool("status", {
    description: "Return service status.",
    run: () => ({ ok: true }),
  });
