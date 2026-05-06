import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface ScaffoldResult {
  created: string[];
  updated: string[];
  skipped: string[];
}

export interface InitOptions {
  cwd?: string;
}

export interface CreateOptions {
  cwd?: string;
}

const requiredDependencies = {
  "@bosun-sh/ohtools": "^0.1.0",
  "@modelcontextprotocol/sdk": "^1.29.0",
  effect: "^3.13.10",
} as const;

const defaultScripts = {
  "ohtools:list": "bunx ohtools --app ./src/ohtools.ts list",
  "ohtools:docs": "bunx ohtools --app ./src/ohtools.ts docs",
  "ohtools:graph": "bunx ohtools --app ./src/ohtools.ts graph",
} as const;

export function initProject(options: InitOptions = {}): ScaffoldResult {
  const cwd = resolve(options.cwd ?? process.cwd());
  const result = emptyResult();
  copyDirectorySafe(
    packagePath("skills", "ohtools"),
    join(cwd, ".agents", "skills", "ohtools"),
    result,
    cwd,
  );
  ensureInitApp(cwd, result);
  updatePackageJson(cwd, result);
  return result;
}

export function createProject(appName: string, options: CreateOptions = {}): ScaffoldResult {
  const name = validateAppName(appName);
  const cwd = resolve(options.cwd ?? process.cwd());
  const projectDir = resolve(cwd, name);
  if (existsSync(projectDir)) {
    throw new Error(`Project directory already exists: ${projectDir}`);
  }

  const result = emptyResult();
  mkdirSync(projectDir, { recursive: true });
  result.created.push(relativePath(cwd, projectDir));

  copyTemplateDirectory(
    packagePath("templates", "starter"),
    projectDir,
    { appName: name },
    result,
    cwd,
  );
  copyDirectorySafe(
    packagePath("skills", "ohtools"),
    join(projectDir, ".agents", "skills", "ohtools"),
    result,
    cwd,
  );
  return result;
}

export function formatScaffoldResult(action: "init" | "create", result: ScaffoldResult): string {
  const lines = [`ohtools ${action} complete.`];
  if (result.created.length > 0) lines.push(`created: ${result.created.join(", ")}`);
  if (result.updated.length > 0) lines.push(`updated: ${result.updated.join(", ")}`);
  if (result.skipped.length > 0) lines.push(`skipped: ${result.skipped.join(", ")}`);
  return lines.join("\n");
}

function ensureInitApp(cwd: string, result: ScaffoldResult) {
  const target = join(cwd, "src", "ohtools.ts");
  if (existsSync(target)) {
    result.skipped.push("src/ohtools.ts");
    return;
  }
  const appTs = join(cwd, "src", "app.ts");
  if (existsSync(appTs) && readFileSync(appTs, "utf8").includes("Ohtools")) {
    result.skipped.push("src/ohtools.ts (existing Ohtools app found at src/app.ts)");
    return;
  }
  const template = readFileSync(packagePath("templates", "init", "src", "ohtools.ts"), "utf8");
  writeSafe(target, template, result, cwd);
}

function updatePackageJson(cwd: string, result: ScaffoldResult) {
  const packagePath = join(cwd, "package.json");
  if (!existsSync(packagePath)) {
    result.skipped.push("package.json (not found)");
    return;
  }

  const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  let changed = false;
  packageJson.scripts ??= {};
  for (const [name, command] of Object.entries(defaultScripts)) {
    if (!packageJson.scripts[name]) {
      packageJson.scripts[name] = command;
      changed = true;
    }
  }

  packageJson.dependencies ??= {};
  for (const [name, version] of Object.entries(requiredDependencies)) {
    if (!packageJson.dependencies[name] && !packageJson.devDependencies?.[name]) {
      packageJson.dependencies[name] = version;
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
    result.updated.push("package.json");
  } else {
    result.skipped.push("package.json");
  }
}

function copyDirectorySafe(source: string, target: string, result: ScaffoldResult, base: string) {
  for (const entry of readdirSync(source)) {
    const from = join(source, entry);
    const to = join(target, entry);
    if (statSync(from).isDirectory()) {
      copyDirectorySafe(from, to, result, base);
    } else if (existsSync(to)) {
      result.skipped.push(relativePath(base, to));
    } else {
      mkdirSync(dirname(to), { recursive: true });
      cpSync(from, to);
      result.created.push(relativePath(base, to));
    }
  }
}

function copyTemplateDirectory(
  source: string,
  target: string,
  variables: { appName: string },
  result: ScaffoldResult,
  base: string,
) {
  for (const entry of readdirSync(source)) {
    const from = join(source, entry);
    const to = join(target, entry);
    if (statSync(from).isDirectory()) {
      copyTemplateDirectory(from, to, variables, result, base);
    } else {
      const content = readFileSync(from, "utf8")
        .replaceAll("__APP_NAME__", variables.appName)
        .replaceAll("__PACKAGE_NAME__", variables.appName);
      writeSafe(to, content, result, base);
    }
  }
}

function writeSafe(path: string, content: string, result: ScaffoldResult, base: string) {
  if (existsSync(path)) {
    result.skipped.push(relativePath(base, path));
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  result.created.push(relativePath(base, path));
}

function validateAppName(appName: string) {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(appName)) {
    throw new Error(
      `Invalid app name "${appName}". Use lowercase letters, numbers, dots, underscores, or hyphens.`,
    );
  }
  if (appName.includes("..")) {
    throw new Error(`Invalid app name "${appName}".`);
  }
  return appName;
}

function packagePath(...parts: string[]) {
  let current = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 5; depth += 1) {
    if (existsSync(join(current, "package.json")) && existsSync(join(current, "skills"))) {
      return join(current, ...parts);
    }
    current = resolve(current, "..");
  }
  return join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), ...parts);
}

function relativePath(from: string, to: string) {
  const relative = to.startsWith(from) ? to.slice(from.length + 1) : to;
  return relative || ".";
}

function emptyResult(): ScaffoldResult {
  return { created: [], updated: [], skipped: [] };
}
