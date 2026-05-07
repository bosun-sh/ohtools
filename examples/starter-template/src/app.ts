import { Ohtools, jsonSchema } from "@bosun-sh/ohtools";
import { cliAdapter } from "@bosun-sh/ohtools/adapters/cli";

export default new Ohtools({ name: "starter" })
  .tool("hello", {
    description: "Return a greeting.",
    input: jsonSchema<{ name: string }>({
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    }),
    output: jsonSchema<{ message: string }>({
      type: "object",
      properties: { message: { type: "string" } },
      required: ["message"],
    }),
    next: [],
    run: ({ name }) => ({ message: `Hello, ${name}` }),
  })
  .adapter(cliAdapter());
