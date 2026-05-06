import { Ohtools } from "ohtools";

export default new Ohtools().group("issues", (group) =>
  group
    .describe("Issue tools.")
    .tool("list", { description: "List issues.", run: () => [] })
    .tool("inspect", { description: "Inspect an issue.", run: () => ({ id: 1 }) }),
);
