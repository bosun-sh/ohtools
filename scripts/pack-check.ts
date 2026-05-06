import { constants, accessSync, existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

await $`bun run --cwd packages/ohtools build`;
const cache = mkdtempSync(join("/private/tmp", "ohtools-npm-cache-"));
await $`npm --cache ${cache} pack --dry-run`.cwd("packages/ohtools").quiet();
const pkg = (await import("../packages/ohtools/package.json")).default as {
  bin?: Record<string, string>;
  exports: Record<string, { types?: string; import?: string }>;
};
for (const entry of [".", "./schemas", "./adapters/mcp", "./adapters/cli"]) {
  const exported = pkg.exports[entry];
  if (!exported) {
    console.error(`pack:check missing export ${entry}`);
    process.exit(1);
  }
  for (const [kind, path] of Object.entries(exported)) {
    if (!path || !existsSync(join("packages/ohtools", path))) {
      console.error(`pack:check missing ${kind} artifact for export ${entry}: ${path}`);
      process.exit(1);
    }
  }
  if (!exported.types?.endsWith(".d.ts")) {
    console.error(`pack:check export ${entry} is missing declaration output`);
    process.exit(1);
  }
}
const bin = pkg.bin?.ohtools;
if (!bin || !existsSync(join("packages/ohtools", bin))) {
  console.error("pack:check missing bin.ohtools artifact");
  process.exit(1);
}
try {
  accessSync(join("packages/ohtools", bin), constants.X_OK);
} catch {
  console.error("pack:check bin.ohtools is not executable");
  process.exit(1);
}
console.log("pack:check passed");
