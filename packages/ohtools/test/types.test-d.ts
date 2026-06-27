import type { Effect } from "effect";
import { expectTypeOf } from "expect-type";
import {
  type DefinedTool,
  defineTool,
  type InferSchema,
  jsonSchema,
  Ohtools,
  type RunResult,
  schema,
} from "../src";

const input = jsonSchema<{ name: string }>({
  type: "object",
  properties: { name: { type: "string" } },
});
expectTypeOf<InferSchema<typeof input>>().toEqualTypeOf<{ name: string }>();

const custom = schema({
  parse(value: unknown) {
    return { count: Number(value) };
  },
});
expectTypeOf<InferSchema<typeof custom>>().toEqualTypeOf<{ count: number }>();

const output = jsonSchema<{ message: string }>({
  type: "object",
  properties: { message: { type: "string" } },
});
expectTypeOf<InferSchema<typeof output>>().toEqualTypeOf<{ message: string }>();

new Ohtools().tool("hello", {
  description: "Hello.",
  input,
  output,
  run: (value) => {
    expectTypeOf(value).toEqualTypeOf<{ name: string }>();
    const result = { message: value.name };
    expectTypeOf(result).toEqualTypeOf<InferSchema<typeof output>>();
    return result;
  },
});

new Ohtools().tool("custom", {
  description: "Custom.",
  input: custom,
  run: (value) => {
    expectTypeOf(value).toEqualTypeOf<{ count: number }>();
    return value.count;
  },
});

new Ohtools().tool("output-only", {
  description: "Output only.",
  output,
  run: (value) => {
    expectTypeOf(value).toEqualTypeOf<unknown>();
    return { message: "ok" };
  },
});

const definedWithSchemas = defineTool({
  id: "defined.hello",
  description: "Defined tool.",
  input,
  output,
  run: (value) => {
    expectTypeOf(value).toEqualTypeOf<{ name: string }>();
    return { message: value.name };
  },
});
expectTypeOf(definedWithSchemas).toEqualTypeOf<
  DefinedTool<"defined.hello", { name: string }, { message: string }>
>();

const definedOutputFromSchema = defineTool({
  id: "defined.output",
  description: "Output schema wins.",
  output,
  run: () => ({ message: "ok" }),
});
expectTypeOf(definedOutputFromSchema).toEqualTypeOf<
  DefinedTool<"defined.output", unknown, { message: string }>
>();

const definedOutputFromRun = defineTool({
  id: "defined.run-output",
  description: "Run return is inferred.",
  input,
  run: (value) => ({ length: value.name.length }),
});
expectTypeOf(definedOutputFromRun).toEqualTypeOf<
  DefinedTool<"defined.run-output", { name: string }, { length: number }>
>();

new Ohtools().group("defined", (group) => group.tool(definedWithSchemas));

const runtimeResult = new Ohtools().tool(definedWithSchemas).runtime().runTool(definedWithSchemas, {
  name: "Ada",
});
expectTypeOf(runtimeResult).toEqualTypeOf<
  Effect.Effect<RunResult<{ message: string }>, import("../src").OhtoolsError, never>
>();
