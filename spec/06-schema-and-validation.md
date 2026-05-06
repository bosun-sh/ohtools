# 06. Schema and Validation

## Purpose

Define input/output schema strategy, validation lifecycle, type inference goals,
error format, and MCP-compatible JSON Schema generation.

## Public Interfaces

Schema definition:

```ts
export interface SchemaDefinition<T = unknown> {
  parse(input: unknown): T;
  jsonSchema?: JsonSchema;
  description?: string;
}
```

Helpers:

```ts
export function schema<T>(definition: SchemaDefinition<T>): SchemaDefinition<T>;
export function jsonSchema<T = unknown>(schema: JsonSchema): SchemaDefinition<T>;
export type InferSchema<S> = S extends SchemaDefinition<infer T> ? T : never;
```

Validation error:

```ts
export interface ValidationIssue {
  path: Array<string | number>;
  message: string;
  code?: string;
}

export interface ValidationError extends OhtoolsError {
  code: "OHTOOLS_VALIDATION_ERROR";
  issues: ValidationIssue[];
}
```

## Implementation Requirements

- Keep schema support adapter-neutral in core.
- Accept any object that satisfies `SchemaDefinition<T>` for `v1.0.0`.
- Provide JSON Schema helper support for MCP compatibility.
- Validate run input before executing the handler.
- Validate run output after handler execution when an output schema exists.
- Exploration must expose JSON Schema when available.
- If JSON Schema is unavailable, exploration must still describe that validation
  is runtime-only.
- Type inference must derive handler input from `input` schema for all values
  created with `schema(...)` or `jsonSchema<T>(...)`.
- Type inference must derive documented output type from `output` schema for all
  values created with `schema(...)` or `jsonSchema<T>(...)`.
- Do not require a specific external schema library in `v1.0.0`.

## Edge Cases

- Missing input schema means input is `unknown`; the handler can narrow it
  locally.
- Missing output schema means output is not post-validated.
- A schema `parse` function that throws must be normalized into
  `OHTOOLS_VALIDATION_ERROR`.
- JSON Schema generation must reject non-object schema roots for MCP executable
  tool input.
- Circular JSON Schema references are rejected by the MCP adapter with
  `OHTOOLS_ADAPTER_ERROR`.
- Validation must not mutate input objects.

## Tests

- Unit tests for custom `SchemaDefinition` parsing.
- Unit tests for JSON Schema helper behavior.
- Input validation failure test.
- Output validation failure test.
- Type tests for `InferSchema`.
- MCP adapter test proving generated tool schemas are compatible with the SDK.

## Done Criteria

- Schema helpers are exported from `ohtools` or `ohtools/schemas`.
- Validation lifecycle is implemented and documented.
- Validation errors have stable codes and issue paths.
- No mandatory schema-library dependency is introduced.
