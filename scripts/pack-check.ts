import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

await $`bun run --cwd packages/ohtools build`;
const cache = mkdtempSync(join("/private/tmp", "ohtools-npm-cache-"));
await $`npm --cache ${cache} pack --dry-run`.cwd("packages/ohtools").quiet();
const pkg = (await import("../packages/ohtools/package.json")).default as {
  exports: Record<string, unknown>;
};
for (const entry of [".", "./schemas", "./adapters/mcp", "./adapters/cli"]) {
  if (!pkg.exports[entry]) {
    console.error(`pack:check missing export ${entry}`);
    process.exit(1);
  }
}
console.log("pack:check passed");
