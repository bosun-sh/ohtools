# Schema And Validation

Use `jsonSchema<T>()` for tool inputs and outputs that cross process or agent
boundaries. Keep executable input schemas object-rooted for MCP compatibility.

Recommended input shape:

```ts
input: jsonSchema<{ name: string }>({
  type: "object",
  properties: { name: { type: "string", minLength: 1 } },
  required: ["name"],
  additionalProperties: false
})
```

Validation guidance:

- Put required fields in `required`.
- Set `additionalProperties: false` when extra input would be ambiguous.
- Prefer simple local `$defs` over deeply recursive schemas.
- Avoid circular refs for executable MCP tools.
- Return structured objects from tools instead of display strings when another
  tool or agent may consume the result.
