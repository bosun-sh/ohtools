import { accessSync, constants, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";

await $`bun run --cwd packages/ohtools build`;
const cache = mkdtempSync(join(tmpdir(), "ohtools-npm-cache-"));
const packJson = await $`npm --cache ${cache} pack --json --dry-run`.cwd("packages/ohtools").text();
// npm <12 prints an array; npm 12+ prints an object keyed by package name.
const packResult = JSON.parse(packJson);
const packEntry = (Array.isArray(packResult) ? packResult[0] : Object.values(packResult)[0]) as
  | { files?: Array<{ path: string }> }
  | undefined;
const packedFiles = new Set(packEntry?.files?.map((file) => file.path) ?? []);
if (packedFiles.size === 0) {
  console.error("pack:check could not read file list from npm pack output");
  process.exit(1);
}
const pkg = (await import("../packages/ohtools/package.json")).default as {
  bin?: Record<string, string>;
  exports: Record<string, { types?: string; import?: string }>;
};
for (const entry of [
  ".",
  "./schemas",
  "./adapters/mcp",
  "./adapters/cli",
  "./adapters/http",
  "./adapters/trpc",
]) {
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
for (const asset of [
  "skills/ohtools/SKILL.md",
  "skills/ohtools/agents/openai.yaml",
  "templates/init/src/ohtools.ts",
  "templates/starter/package.json",
  "templates/starter/src/ohtools.ts",
]) {
  if (!existsSync(join("packages/ohtools", asset))) {
    console.error(`pack:check missing package asset ${asset}`);
    process.exit(1);
  }
  if (!packedFiles.has(asset)) {
    console.error(`pack:check package asset is not included in npm pack: ${asset}`);
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
