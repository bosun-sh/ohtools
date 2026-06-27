import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

const examples = readdirSync("examples", { withFileTypes: true }).filter((entry) =>
  entry.isDirectory(),
);
for (const example of examples) {
  const dir = join("examples", example.name);
  await $`bun run --cwd ${dir} typecheck`;
  const files = readdirSync(join(dir, "src")).filter((file) => file.endsWith(".ts"));
  for (const file of files) {
    const text = readFileSync(join(dir, "src", file), "utf8");
    if (text.includes("packages/ohtools/src")) {
      console.error(`${dir}: imports private package source`);
      process.exit(1);
    }
  }
}
await $`bun run --cwd examples/basic smoke`;
console.log(`examples:check passed (${examples.length} examples)`);
