# 07. Effect Runtime

## Purpose

Define how Ohtools uses Effect for handler execution, typed errors, dependency
injection, cancellation, scopes, and resource cleanup.

## Public Interfaces

Handler return type:

```ts
export type ToolHandler<Input, Output, Env = never> = (
  input: Input,
  context: ToolExecutionContext<Env>,
) => Output | Promise<Output> | Effect.Effect<Output, OhtoolsError, Env>;
```

Runtime options:

```ts
export interface RuntimeOptions<Env = never> {
  layer?: Layer.Layer<Env>;
  signal?: AbortSignal;
  timeoutMs?: number;
  metadata?: Metadata;
}
```

Runtime API:

```ts
export interface OhtoolsRuntime<Env = never> {
  explore(request: ExploreRequest): Effect.Effect<ExploreResult, OhtoolsError, Env>;
  run<Input, Output>(
    request: RunRequest<Input>,
  ): Effect.Effect<RunResult<Output>, OhtoolsError, Env>;
}
```

## Implementation Requirements

- Normalize synchronous values, promises, and `Effect` handlers into one Effect
  execution path.
- Preserve typed Effect failures when they already satisfy `OhtoolsError`.
- Convert thrown exceptions and rejected promises into structured framework
  errors.
- Support dependency injection through Effect services/layers.
- Support cancellation through `AbortSignal` where adapters can provide it.
- Support timeouts as runtime options.
- Use Effect scopes for resource acquisition and cleanup.
- Avoid exposing Effect requirements to users writing simple sync or async
  handlers.
- Keep runtime construction separate from adapter construction.
- `timeoutMs` defaults to no timeout.
- Runtime methods return `Effect` values; helper functions used by adapters may
  execute those effects internally.

## Edge Cases

- Cancellation before handler start returns a cancellation error without running
  the handler.
- Cancellation during handler execution interrupts Effect handlers. Plain
  promise handlers cannot be forcibly interrupted; their final result is ignored
  and the runtime returns `OHTOOLS_CANCELLED`.
- Timeout errors must include the tool ID and timeout value.
- Cleanup failures must be reported without hiding the primary handler failure.
- Defects from Effect must be normalized for adapter output while preserving the
  cause for logs.
- Runtime metadata must not mutate registry metadata.

## Tests

- Run sync, async, and Effect handlers.
- Inject a service through a layer.
- Surface typed errors unchanged.
- Normalize thrown exceptions.
- Validate cancellation before and during execution.
- Validate timeout behavior.
- Prove scoped cleanup runs.

## Done Criteria

- Runtime API is implemented and exported.
- Core run behavior uses the runtime path.
- Effect is the only execution abstraction used internally.
- Simple handler users do not need to import Effect.
