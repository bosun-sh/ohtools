import { Ohtools, jsonSchema, plugin } from "@bosun-sh/ohtools";
import { mcpAdapter } from "@bosun-sh/ohtools/adapters/mcp";

const greetings = plugin("greetings").tool("hello", {
  description: "Return a greeting.",
  input: jsonSchema<{ name: string }>({
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"],
  }),
  run: ({ name }) => ({ message: `Hello, ${name}` }),
});

export default new Ohtools().use(greetings).adapter(mcpAdapter());
