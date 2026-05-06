# Tool And Plugin Authoring

Prefer reusable definitions:

```ts
import { defineTool, jsonSchema } from "@bosun-sh/ohtools";

export const hello = defineTool({
  id: "hello",
  description: "Return a greeting.",
  input: jsonSchema<{ name: string }>({
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"],
    additionalProperties: false
  }),
  run: ({ name }) => ({ message: `Hello, ${name}` })
});
```

Use groups to make large registries explorable:

```ts
import { defineGroup } from "@bosun-sh/ohtools";

export const support = defineGroup(
  { id: "support", description: "Support workflows." },
  (group) => group.tool(hello)
);
```

Use plugins when a set of tools should be installed into multiple apps:

```ts
import { plugin } from "@bosun-sh/ohtools";

export const supportPlugin = plugin("support").group(support);
```

Tool IDs are part of the public contract. Keep them stable, lowercase, and
hierarchical when the domain has natural ownership boundaries.
