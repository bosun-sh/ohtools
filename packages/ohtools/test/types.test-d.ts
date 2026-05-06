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

new Ohtools().tool("hello", {
  description: "Hello.",
  input,
  run: (value) => {
    expectTypeOf(value).toEqualTypeOf<{ name: string }>();
    return { message: value.name };
  },
});
