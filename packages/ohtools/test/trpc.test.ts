import { describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";
import { defineTool, jsonSchema, notFound, Ohtools, refine } from "../src";
import { trpcCodeFor, trpcRouter } from "../src/adapters/trpc";
import { OhtoolsException } from "../src/types";

const createApp = defineTool({
  id: "apps.create",
  description: "Create.",
  input: jsonSchema<{ company: string }>({
    type: "object",
    properties: { company: { type: "string" } },
    required: ["company"],
  }),
  output: jsonSchema<{ id: string; company: string }>({ type: "object" }),
  run: ({ company }, ctx) => ({ id: String(ctx.metadata.user ?? "0"), company }),
});
const getApp = defineTool({
  id: "apps.get",
  description: "Get.",
  http: { method: "GET", path: "/applications/:id" },
  input: jsonSchema<{ id: string }>({
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  }),
  run: ({ id }) => {
    if (id !== "1") throw new OhtoolsException(refine(notFound, "gone")("nope"));
    return { id };
  },
});
const ping = defineTool({ id: "ping", description: "Ping.", run: () => "pong" });

const tools = [createApp, getApp, ping] as const;
const app = new Ohtools().tool(createApp.id, createApp).tool(getApp.id, getApp).tool(ping.id, ping);

describe("trpc adapter", () => {
  const router = trpcRouter(app.runtime(), tools, {
    metadata: (ctx: { user: string }) => ({ user: ctx.user }),
  });
  const caller = router.createCaller({ user: "u1" });

  test("mutation, nested id, ctx metadata", async () => {
    const result = await caller.apps.create({ company: "Acme" });
    expect(result.output).toEqual({ id: "u1", company: "Acme" });
    expect((await caller.ping(undefined)).output).toBe("pong");
  });

  test("GET tool is a query; ohtools errors map to TRPCError", async () => {
    expect((await caller.apps.get({ id: "1" })).output).toEqual({ id: "1" });
    const error = await caller.apps.get({ id: "2" }).catch((e) => e);
    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe("NOT_FOUND");
  });

  test("validation happens in the runtime", async () => {
    const error = await caller.apps.create({} as never).catch((e) => e);
    expect(error.code).toBe("UNPROCESSABLE_CONTENT");
  });

  test("code table covers codes", () => {
    expect(trpcCodeFor({ code: "OHTOOLS_RATE_LIMITED", message: "" })).toBe("TOO_MANY_REQUESTS");
  });
});
