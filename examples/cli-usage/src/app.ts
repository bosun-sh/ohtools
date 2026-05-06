import { Ohtools } from "ohtools";

export default new Ohtools().tool("hello", {
  description: "Return hello.",
  run: () => ({ message: "hello" }),
});
