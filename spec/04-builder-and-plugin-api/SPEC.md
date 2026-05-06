# 04. Builder and Plugin API

## Purpose

Define the public TypeScript API for building Ohtools apps and reusable plugins
with predictable composition, Elysia-inspired ergonomics, and v1 inference
rules.

## Public Interfaces

App builder:

```ts
export class Ohtools<Context = {}> {
  constructor(options?: OhtoolsOptions);
  use<const P extends OhtoolsPlugin>(plugin: P): Ohtools<MergeContext<Context, P>>;
  tool<const Id extends string, Input, Output>(
    id: Id,
    definition: ToolInput<Input, Output, Context>,
  ): Ohtools<Context>;
  group<const Id extends string>(
    id: Id,
    configure: (group: GroupBuilder<Context>) => GroupBuilder<Context>,
  ): Ohtools<Context>;
  adapter(adapter: AdapterDefinition): Ohtools<Context>;
  metadata(key: string, value: JsonValue): Ohtools<Context>;
  build(): OhtoolsRegistry;
  runtime(options?: RuntimeOptions): OhtoolsRuntime;
}
```

Plugin builder:

```ts
export function plugin<const Name extends string>(
  name: Name,
  options?: PluginOptions,
): PluginBuilder<Name, {}>;
```

Required fluent methods:

- `.use(pluginOrApp)`
- `.tool(id, definition)`
- `.group(id, callbackOrDefinition)`
- `.adapter(adapter)`
- `.metadata(key, value)`
- `.build()`
- `.runtime(options)`

There is no `.serve()` API in `v1.0.0`. Adapters are registered with
`.adapter(...)`, and adapter handles are started explicitly by adapter-specific
helpers or CLI entrypoints.

## Implementation Requirements

- Builders may be mutable internally while assembling state, but `.build()` must
  return an immutable registry.
- `.use(...)` must compose plugins in call order.
- Composition must be deterministic.
- Plugin names must be recorded for diagnostics.
- Tool IDs inside a group must resolve to dot-delimited full IDs. The v1 API
  does not support bypassing group prefixing inside group callbacks.
- `.group("issues", group => group.tool("list", ...))` resolves to
  `issues.list`.
- Duplicate tools, groups, adapters, and incompatible metadata fail at build
  time with structured errors.
- Public examples must compile without explicit generic arguments for common
  cases.
- Keep overloads small; prefer clear object options over many positional
  variants.

## Conflict Behavior

- Duplicate tool ID: build error `OHTOOLS_DUPLICATE_TOOL`.
- Duplicate group ID: build error `OHTOOLS_DUPLICATE_GROUP`.
- Duplicate adapter ID: build error `OHTOOLS_DUPLICATE_ADAPTER`.
- Duplicate plugin name: warning metadata in development, build error only if
  conflicting contributions are detected.
- Incompatible schema replacement: build error.
- Explicit override behavior is not part of `v1.0.0`.

## Edge Cases

- A plugin can compose another plugin.
- A plugin can define no tools and still contribute metadata or adapters.
- A builder callback that throws must surface the original cause in an
  `OhtoolsError`.
- A group callback returning a different builder instance must be rejected.
- Calling `.build()` multiple times must produce equivalent registries.
- Builders must not leak internal mutable arrays or maps.

## Tests

- Type tests for tool input/output inference.
- Type tests for `.use(...)` context merging where supported.
- Unit tests for plugin composition order.
- Unit tests for grouped tool ID resolution.
- Unit tests for conflict errors.
- Unit tests proving repeated `.build()` calls are stable.
- Public API compile tests using README examples.

## Done Criteria

- Public builder exports are implemented and documented.
- The conceptual examples in `SPEC.md` are expressible with the final API.
- Conflict behavior is deterministic and tested.
- The first vertical slice uses only public builder APIs.
