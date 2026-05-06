import { Effect } from "effect";
import { Ohtools } from "ohtools";

export default new Ohtools().tool("effect.hello", {
  description: "Return a greeting from an Effect handler.",
  run: () => Effect.succeed({ message: "Hello from Effect" }),
});
