import { Ohtools, jsonSchema, plugin } from "ohtools";
import { mcpAdapter } from "ohtools/adapters/mcp";

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
