import { Ohtools, plugin } from "ohtools";

const issues = plugin("issues").tool("issues.list", {
  description: "List issues.",
  run: () => [{ id: 1, title: "First" }],
});

export default new Ohtools().use(issues);
