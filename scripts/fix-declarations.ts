import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
for (const file of declarationFiles(dist)) {
  const original = readFileSync(file, "utf8");
  const fixed = original
    .replaceAll('from ".."', 'from "../index.js"')
    .replaceAll('import("..")', 'import("../index.js")')
    .replace(
      /(from\s+["'])(\.{1,2}\/[^"']*?)(["'])/g,
      (match, prefix: string, specifier: string, suffix: string) => {
        if (specifier.endsWith(".js") || specifier.endsWith(".json")) return match;
        return `${prefix}${specifier}.js${suffix}`;
      },
    )
    .replace(
      /(import\(["'])(\.{1,2}\/[^"']*?)(["']\))/g,
      (match, prefix: string, specifier: string, suffix: string) => {
        if (specifier.endsWith(".js") || specifier.endsWith(".json")) return match;
        return `${prefix}${specifier}.js${suffix}`;
      },
    );
  if (fixed !== original) writeFileSync(file, fixed);
}

function declarationFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...declarationFiles(path));
    else if (path.endsWith(".d.ts")) files.push(path);
  }
  return files;
}
