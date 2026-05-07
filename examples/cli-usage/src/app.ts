import { Ohtools } from "@bosun-sh/ohtools";

export default new Ohtools().tool("hello", {
  description: "Return hello.",
  run: () => ({ message: "hello" }),
});
