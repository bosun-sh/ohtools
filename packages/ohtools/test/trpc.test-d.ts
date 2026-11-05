import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { expectTypeOf } from "expect-type";
import { defineTool, jsonSchema } from "../src";
import { trpcRouter } from "../src/adapters/trpc";

const create = defineTool({
  id: "apps.create",
  description: "Create.",
  input: jsonSchema<{ company: string }>({ type: "object" }),
  output: jsonSchema<{ id: string }>({ type: "object" }),
  run: () => ({ id: "1" }),
});
const list = defineTool({
  id: "apps.list",
  description: "List.",
  http: { method: "GET", path: "/applications" },
  input: jsonSchema<{ status?: string }>({ type: "object" }),
  output: jsonSchema<{ id: string }[]>({ type: "array" }),
  run: () => [],
});
const ping = defineTool({
  id: "ping",
  description: "Ping.",
  output: jsonSchema<string>({ type: "string" }),
  run: () => "pong",
});

const router = trpcRouter({} as never, [create, list, ping] as const);
type AppRouter = typeof router;
type Inputs = inferRouterInputs<AppRouter>;
type Outputs = inferRouterOutputs<AppRouter>;

expectTypeOf<Inputs["apps"]["create"]>().toEqualTypeOf<{ company: string }>();
expectTypeOf<Inputs["apps"]["list"]>().toEqualTypeOf<{ status?: string }>();
expectTypeOf<Outputs["apps"]["create"]["output"]>().toEqualTypeOf<{ id: string }>();
expectTypeOf<Outputs["apps"]["list"]["output"]>().toEqualTypeOf<{ id: string }[]>();
expectTypeOf<Outputs["ping"]["output"]>().toEqualTypeOf<string>();
