import { Ohtools } from "@bosun-sh/ohtools";
import { Effect } from "effect";

export default new Ohtools().tool("effect.hello", {
  description: "Return a greeting from an Effect handler.",
  run: () => Effect.succeed({ message: "Hello from Effect" }),
});
