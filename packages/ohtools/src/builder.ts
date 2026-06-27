import { buildRegistry, createRuntime, type RegistryContribution } from "./core";
import type { InferSchema } from "./schemas";
import type {
  AdapterDefinition,
  DefaultEnv,
  DefinedGroup,
  DefinedTool,
  GroupDefinition,
  JsonValue,
  MergeContext,
  Metadata,
  OhtoolsOptions,
  OhtoolsPlugin,
  OhtoolsRegistry,
  PluginOptions,
  RuntimeOptions,
  SchemaDefinition,
  ToolDefinition,
  ToolExecutionContext,
  ToolInput,
} from "./types";

interface BuilderState {
  source: string;
  tools: Array<ToolInput<any, any, any> & { id: string }>;
  groups: GroupDefinition[];
  adapters: AdapterDefinition[];
  metadata: Record<string, JsonValue>;
  plugins: OhtoolsPlugin[];
}

type HandlerReturn<Output, Env> =
  | Output
  | Promise<Output>
  | import("effect").Effect.Effect<Output, import("./types").OhtoolsError, Env>;

type OutputFromRun<Run> = Run extends (...args: any[]) => infer Return
  ? Return extends import("effect").Effect.Effect<infer Output, any, any>
    ? Output
    : Awaited<Return>
  : unknown;

type ToolBase<Id extends string, Input, Output, Env> = Omit<
  ToolDefinition<Input, Output, Env>,
  "id" | "input" | "output" | "run"
> & {
  id: Id;
};

export class Ohtools<Context = DefaultEnv> {
  private readonly state: BuilderState;

  constructor(options: OhtoolsOptions = {}, state?: BuilderState) {
    this.state = state ?? {
      source: options.name ?? "app",
      tools: [],
      groups: [],
      adapters: [],
      metadata: { ...(options.metadata ?? {}) },
      plugins: [],
    };
  }

  use<const P extends OhtoolsPlugin>(plugin: P): Ohtools<MergeContext<Context, P>> {
    this.state.plugins.push(plugin);
    return this as unknown as Ohtools<MergeContext<Context, P>>;
  }

  tool<const Tool extends DefinedTool<any, any, any, Context>>(tool: Tool): this;

  tool<const Id extends string, Input, Output>(
    id: Id,
    definition: ToolInput<Input, Output, Context>,
  ): this;

  tool<const Id extends string, Input, Output>(
    idOrTool: Id | DefinedTool<any, any, any, Context>,
    definition?: ToolInput<Input, Output, Context>,
  ): this {
    if (typeof idOrTool === "object") {
      this.state.tools.push(idOrTool);
      return this;
    }
    if (!definition) throw new Error("OHTOOLS_ADAPTER_ERROR: tool definitions are required.");
    this.state.tools.push({ id: idOrTool, ...definition });
    return this;
  }

  group<const Group extends DefinedGroup<any>>(group: Group): this;

  group<const Id extends string>(
    id: Id,
    configure?:
      | ((group: GroupBuilder<Context>) => GroupBuilder<Context>)
      | Omit<GroupDefinition, "id">,
  ): this;

  group<const Id extends string>(
    idOrGroup: Id | DefinedGroup<any>,
    configure:
      | ((group: GroupBuilder<Context>) => GroupBuilder<Context>)
      | Omit<GroupDefinition, "id"> = {},
  ): this {
    if (typeof idOrGroup === "object") {
      this.addDefinedGroup(idOrGroup);
      return this;
    }
    if (typeof configure === "function") {
      const group = new GroupBuilder<Context>(idOrGroup);
      const returned = configure(group);
      if (returned !== group) {
        throw new Error("OHTOOLS_ADAPTER_ERROR: group callbacks must return the provided builder.");
      }
      this.state.groups.push({ id: idOrGroup, nodes: group.nodeIds(), ...group.definition });
      this.state.tools.push(...group.tools);
      this.state.groups.push(...group.groups);
    } else {
      this.state.groups.push({ id: idOrGroup, ...configure });
    }
    return this;
  }

  adapter(adapter: AdapterDefinition): this {
    this.state.adapters.push(adapter);
    return this;
  }

  metadata(key: string, value: JsonValue): this {
    this.state.metadata[key] = value;
    return this;
  }

  build(): OhtoolsRegistry {
    return buildRegistry(this.contributions());
  }

  runtime(options?: RuntimeOptions<Context>) {
    return createRuntime(this.build(), options);
  }

  private contributions(): RegistryContribution[] {
    return [
      ...this.state.plugins.map((plugin) => registryContribution(plugin.name, plugin.build())),
      {
        source: this.state.source,
        tools: [...this.state.tools],
        groups: [...this.state.groups],
        adapters: [...this.state.adapters],
        metadata: { ...this.state.metadata },
      },
    ];
  }

  private addDefinedGroup(group: DefinedGroup<any>): void {
    this.state.groups.push(normalizeDefinedGroup(group));
    this.state.tools.push(...(group.tools ?? []));
    for (const child of group.groups ?? []) this.addDefinedGroup(child);
  }
}

export class PluginBuilder<Name extends string, Context = DefaultEnv>
  extends Ohtools<Context>
  implements OhtoolsPlugin
{
  readonly name: Name;

  constructor(name: Name, options: PluginOptions = {}) {
    super({ name, metadata: options.metadata });
    this.name = name;
  }
}

export class GroupBuilder<Context = DefaultEnv> {
  readonly tools: Array<ToolInput<any, any, any> & { id: string }> = [];
  readonly groups: GroupDefinition[] = [];
  readonly definition: Omit<GroupDefinition, "id" | "nodes"> = {};

  constructor(private readonly prefix: string) {}

  tool<const Tool extends DefinedTool<any, any, any, Context>>(tool: Tool): GroupBuilder<Context>;

  tool<const Id extends string, Input, Output>(
    id: Id,
    definition: ToolInput<Input, Output, Context>,
  ): GroupBuilder<Context>;

  tool<const Id extends string, Input, Output>(
    idOrTool: Id | DefinedTool<any, any, any, Context>,
    definition?: ToolInput<Input, Output, Context>,
  ): GroupBuilder<Context> {
    if (typeof idOrTool === "object") {
      this.tools.push({
        ...idOrTool,
        hierarchy: {
          ...idOrTool.hierarchy,
          parent: idOrTool.hierarchy?.parent ?? this.prefix,
        },
      });
      return this;
    }
    if (!definition) throw new Error("OHTOOLS_ADAPTER_ERROR: tool definitions are required.");
    const fullId = `${this.prefix}.${idOrTool}`;
    this.tools.push({
      id: fullId,
      ...definition,
      hierarchy: { ...definition.hierarchy, parent: this.prefix },
    });
    return this;
  }

  group<const Group extends DefinedGroup<any>>(group: Group): GroupBuilder<Context>;

  group<const Id extends string>(
    id: Id,
    configure: (group: GroupBuilder<Context>) => GroupBuilder<Context>,
  ): GroupBuilder<Context>;

  group<const Id extends string>(
    idOrGroup: Id | DefinedGroup<any>,
    configure?: (group: GroupBuilder<Context>) => GroupBuilder<Context>,
  ): GroupBuilder<Context> {
    if (typeof idOrGroup === "object") {
      const group = {
        ...normalizeDefinedGroup(idOrGroup),
        parent: idOrGroup.parent ?? this.prefix,
      };
      this.groups.push(group);
      this.tools.push(...(idOrGroup.tools ?? []));
      for (const child of idOrGroup.groups ?? []) this.addDefinedGroup(child);
      return this;
    }
    if (!configure) throw new Error("OHTOOLS_ADAPTER_ERROR: group callbacks are required.");
    const fullId = `${this.prefix}.${idOrGroup}`;
    const group = new GroupBuilder<Context>(fullId);
    const returned = configure(group);
    if (returned !== group) {
      throw new Error(
        "OHTOOLS_ADAPTER_ERROR: nested group callbacks must return the provided builder.",
      );
    }
    this.groups.push({
      id: fullId,
      parent: this.prefix,
      nodes: group.nodeIds(),
      ...group.definition,
    });
    this.tools.push(...group.tools);
    this.groups.push(...group.groups);
    return this;
  }

  metadata(key: string, value: JsonValue): GroupBuilder<Context> {
    this.definition.metadata = { ...(this.definition.metadata ?? {}), [key]: value } as Metadata;
    return this;
  }

  describe(description: string): GroupBuilder<Context> {
    this.definition.description = description;
    return this;
  }

  nodeIds() {
    return [
      ...this.tools.filter((tool) => tool.hierarchy?.parent === this.prefix).map((tool) => tool.id),
      ...this.groups.filter((group) => group.parent === this.prefix).map((group) => group.id),
    ];
  }

  private addDefinedGroup(group: DefinedGroup<any>): void {
    this.groups.push(normalizeDefinedGroup(group));
    this.tools.push(...(group.tools ?? []));
    for (const child of group.groups ?? []) this.addDefinedGroup(child);
  }
}

export function plugin<const Name extends string>(
  name: Name,
  options?: PluginOptions,
): PluginBuilder<Name, DefaultEnv> {
  return new PluginBuilder(name, options);
}

export function defineTool<
  const Id extends string,
  const InputSchema extends SchemaDefinition<any>,
  const OutputSchema extends SchemaDefinition<any>,
  Env = DefaultEnv,
>(
  spec: ToolBase<Id, InferSchema<InputSchema>, InferSchema<OutputSchema>, Env> & {
    input: InputSchema;
    output: OutputSchema;
    run: (
      input: InferSchema<InputSchema>,
      context: ToolExecutionContext<Env>,
    ) => HandlerReturn<InferSchema<OutputSchema>, Env>;
  },
): DefinedTool<Id, InferSchema<InputSchema>, InferSchema<OutputSchema>, Env>;
export function defineTool<
  const Id extends string,
  const OutputSchema extends SchemaDefinition<any>,
  Env = DefaultEnv,
>(
  spec: ToolBase<Id, unknown, InferSchema<OutputSchema>, Env> & {
    output: OutputSchema;
    run: (
      input: unknown,
      context: ToolExecutionContext<Env>,
    ) => HandlerReturn<InferSchema<OutputSchema>, Env>;
  },
): DefinedTool<Id, unknown, InferSchema<OutputSchema>, Env>;
export function defineTool<
  const Id extends string,
  const InputSchema extends SchemaDefinition<any>,
  const Run extends (input: InferSchema<InputSchema>, context: ToolExecutionContext<any>) => any,
>(
  spec: ToolBase<Id, InferSchema<InputSchema>, OutputFromRun<Run>, any> & {
    input: InputSchema;
    run: Run;
  },
): DefinedTool<Id, InferSchema<InputSchema>, OutputFromRun<Run>, DefaultEnv>;
export function defineTool<
  const Id extends string,
  const Run extends (input: unknown, context: ToolExecutionContext<any>) => any,
>(
  spec: ToolBase<Id, unknown, OutputFromRun<Run>, any> & {
    run: Run;
  },
): DefinedTool<Id, unknown, OutputFromRun<Run>, DefaultEnv>;
export function defineTool(spec: any): any {
  return Object.freeze({ ...spec });
}

export function defineGroup<const Id extends string>(
  definition: Omit<GroupDefinition, "id" | "nodes"> & { id: Id; nodes?: GroupDefinition["nodes"] },
): DefinedGroup<Id>;
export function defineGroup<const Id extends string>(
  definition: Omit<GroupDefinition, "id" | "nodes"> & { id: Id; nodes?: GroupDefinition["nodes"] },
  configure: (group: GroupBuilder) => GroupBuilder,
): DefinedGroup<Id>;
export function defineGroup<const Id extends string>(
  definition: Omit<GroupDefinition, "id" | "nodes"> & { id: Id; nodes?: GroupDefinition["nodes"] },
  configure?: (group: GroupBuilder) => GroupBuilder,
): DefinedGroup<Id> {
  if (!configure) return Object.freeze({ ...definition });
  const group = new GroupBuilder(definition.id);
  const returned = configure(group);
  if (returned !== group) {
    throw new Error("OHTOOLS_ADAPTER_ERROR: group callbacks must return the provided builder.");
  }
  return Object.freeze({
    ...definition,
    nodes: definition.nodes ?? group.nodeIds(),
    tools: Object.freeze([...group.tools]),
    groups: Object.freeze([...group.groups.map((child) => Object.freeze({ ...child }))]),
  });
}

function registryContribution(source: string, registry: OhtoolsRegistry): RegistryContribution {
  return {
    source,
    tools: [...registry.tools.values()],
    groups: [...registry.groups.values()],
    adapters: [...registry.adapters.values()],
    metadata: registry.metadata,
  };
}

function normalizeDefinedGroup(group: DefinedGroup<any>): GroupDefinition {
  const { tools: _tools, groups: _groups, ...definition } = group;
  return definition;
}
