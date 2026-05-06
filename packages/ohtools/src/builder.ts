import { type RegistryContribution, buildRegistry, createRuntime } from "./core";
import type {
  AdapterDefinition,
  GroupDefinition,
  JsonValue,
  MergeContext,
  Metadata,
  OhtoolsOptions,
  OhtoolsPlugin,
  OhtoolsRegistry,
  PluginOptions,
  RuntimeOptions,
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

export class Ohtools<Context = Record<string, never>> {
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

  tool<const Id extends string, Input, Output>(
    id: Id,
    definition: ToolInput<Input, Output, Context>,
  ): this {
    this.state.tools.push({ id, ...definition });
    return this;
  }

  group<const Id extends string>(
    id: Id,
    configure:
      | ((group: GroupBuilder<Context>) => GroupBuilder<Context>)
      | Omit<GroupDefinition, "id"> = {},
  ): this {
    if (typeof configure === "function") {
      const group = new GroupBuilder<Context>(id);
      const returned = configure(group);
      if (returned !== group) {
        throw new Error("OHTOOLS_ADAPTER_ERROR: group callbacks must return the provided builder.");
      }
      this.state.groups.push({ id, nodes: group.nodeIds(), ...group.definition });
      this.state.tools.push(...group.tools);
      this.state.groups.push(...group.groups);
    } else {
      this.state.groups.push({ id, ...configure });
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

  runtime(options?: RuntimeOptions) {
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
}

export class PluginBuilder<Name extends string, Context = Record<string, never>>
  extends Ohtools<Context>
  implements OhtoolsPlugin
{
  readonly name: Name;

  constructor(name: Name, options: PluginOptions = {}) {
    super({ name, metadata: options.metadata });
    this.name = name;
  }
}

export class GroupBuilder<Context = Record<string, never>> {
  readonly tools: Array<ToolInput<any, any, any> & { id: string }> = [];
  readonly groups: GroupDefinition[] = [];
  readonly definition: Omit<GroupDefinition, "id" | "nodes"> = {};

  constructor(private readonly prefix: string) {}

  tool<const Id extends string, Input, Output>(
    id: Id,
    definition: ToolInput<Input, Output, Context>,
  ): GroupBuilder<Context> {
    const fullId = `${this.prefix}.${id}`;
    this.tools.push({
      id: fullId,
      hierarchy: { ...definition.hierarchy, parent: this.prefix },
      ...definition,
    });
    return this;
  }

  group<const Id extends string>(
    id: Id,
    configure: (group: GroupBuilder<Context>) => GroupBuilder<Context>,
  ): GroupBuilder<Context> {
    const fullId = `${this.prefix}.${id}`;
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
}

export function plugin<const Name extends string>(
  name: Name,
  options?: PluginOptions,
): PluginBuilder<Name, Record<string, never>> {
  return new PluginBuilder(name, options);
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
