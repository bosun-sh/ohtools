import { jsonSchema, Ohtools } from "../../src";

export default new Ohtools()
  .tool("needs-name", {
    description: "Require a name.",
    input: jsonSchema<{ name: string }>({
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    }),
    run: ({ name }) => ({ message: name }),
  })
  .tool("explode", {
    description: "Throw a handler error.",
    run: () => {
      throw new Error("boom");
    },
  });
