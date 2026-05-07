import { Effect } from "effect";
import app from "./app";

const runtime = app.runtime();
const explored = await Effect.runPromise(runtime.explore({ nodeId: "hello" }));
const result = await Effect.runPromise(
  runtime.run<unknown, { message: string }>({ toolId: "hello", input: { name: "Ada" } }),
);

if (explored.node.id !== "hello" || result.output.message !== "Hello, Ada") {
  throw new Error("basic example smoke failed");
}
