import { jsonSchema, Ohtools } from "@bosun-sh/ohtools";
import { mcpAdapter } from "@bosun-sh/ohtools/adapters/mcp";

export default new Ohtools()
  .tool("hello", {
    description: "Return a greeting.",
    input: jsonSchema<{ name: string }>({
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
      additionalProperties: false,
    }),
    run: ({ name }) => ({ message: `Hello, ${name}` }),
  })
  .adapter(mcpAdapter());
