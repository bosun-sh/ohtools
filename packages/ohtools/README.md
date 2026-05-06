# Ohtools

Define tool registries with a fluent TypeScript API, explore them without side
effects, run them through an Effect runtime, and expose them through MCP or CLI.

```ts
import { Ohtools, jsonSchema } from "ohtools";

export default new Ohtools().tool("hello", {
  description: "Return a greeting.",
  input: jsonSchema<{ name: string }>({
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"]
  }),
  run: ({ name }) => ({ message: `Hello, ${name}` })
});
```
