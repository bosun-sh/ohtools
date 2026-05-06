import { expectTypeOf } from "expect-type";
import { type InferSchema, Ohtools, jsonSchema, schema } from "../src";

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
