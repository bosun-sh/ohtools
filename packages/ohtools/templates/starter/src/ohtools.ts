import { Ohtools, defineTool, jsonSchema } from "@bosun-sh/ohtools";
import { cliAdapter } from "@bosun-sh/ohtools/adapters/cli";
import { mcpAdapter } from "@bosun-sh/ohtools/adapters/mcp";

const hello = defineTool({
  id: "hello",
  description: "Return a greeting.",
  input: jsonSchema<{ name: string }>({
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"],
    additionalProperties: false,
  }),
  run: ({ name }) => ({ message: `Hello, ${name}` }),
});

export default new Ohtools({ name: "__APP_NAME__" })
  .tool(hello)
  .adapter(cliAdapter())
  .adapter(mcpAdapter());
