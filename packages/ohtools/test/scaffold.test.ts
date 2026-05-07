import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../src/adapters/cli";
import { createProject, initProject } from "../src/scaffold";

describe("scaffolding", () => {
  test("init creates skill files, app entry, scripts, and dependencies", () => {
    const dir = mkdtempSync(join(tmpdir(), "ohtools-init-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }, null, 2));

    const first = initProject({ cwd: dir });
    expect(first.created).toContain(".agents/skills/ohtools/SKILL.md");
    expect(existsSync(join(dir, ".agents/skills/ohtools/agents/openai.yaml"))).toBe(true);
    expect(existsSync(join(dir, "src/ohtools.ts"))).toBe(true);

    const packageJson = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    expect(packageJson.scripts["ohtools:list"]).toBe("bunx ohtools --app ./src/ohtools.ts list");
    expect(packageJson.dependencies["@bosun-sh/ohtools"]).toBeDefined();
    expect(packageJson.dependencies.effect).toBeDefined();
    expect(packageJson.dependencies["@modelcontextprotocol/sdk"]).toBeDefined();

    const appBefore = readFileSync(join(dir, "src/ohtools.ts"), "utf8");
    const second = initProject({ cwd: dir });
    expect(second.skipped.some((path) => path.includes("src/ohtools.ts"))).toBe(true);
    expect(readFileSync(join(dir, "src/ohtools.ts"), "utf8")).toBe(appBefore);
  });

  test("init preserves an existing Ohtools app entry", () => {
    const dir = mkdtempSync(join(tmpdir(), "ohtools-existing-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }, null, 2));
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src/app.ts"), 'import { Ohtools } from "@bosun-sh/ohtools";\n');

    const result = initProject({ cwd: dir });
    expect(existsSync(join(dir, "src/ohtools.ts"))).toBe(false);
    expect(result.skipped).toContain("src/ohtools.ts (existing Ohtools app found at src/app.ts)");
  });

  test("create writes a Bun TypeScript starter project and local skill", () => {
    const dir = mkdtempSync(join(tmpdir(), "ohtools-create-"));
    const result = createProject("my-tools", { cwd: dir });
    const project = join(dir, "my-tools");

    expect(result.created).toContain("my-tools/package.json");
    expect(existsSync(join(project, "tsconfig.json"))).toBe(true);
    expect(existsSync(join(project, "src/ohtools.ts"))).toBe(true);
    expect(existsSync(join(project, ".agents/skills/ohtools/SKILL.md"))).toBe(true);

    const source = readFileSync(join(project, "src/ohtools.ts"), "utf8");
    expect(source).toContain('new Ohtools({ name: "my-tools" })');
    expect(source).toContain('id: "hello"');
  });

  test("runCli supports init and create without --app", async () => {
    const originalCwd = process.cwd();
    const dir = mkdtempSync(join(tmpdir(), "ohtools-cli-"));
    try {
      process.chdir(dir);
      writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }, null, 2));

      const init = await captureConsole(() => runCli(["init"]));
      expect(init.code).toBe(0);
      expect(init.stdout).toContain("ohtools init complete");
      expect(existsSync(join(dir, ".agents/skills/ohtools/SKILL.md"))).toBe(true);

      const create = await captureConsole(() => runCli(["create", "cli-tools"]));
      expect(create.code).toBe(0);
      expect(create.stdout).toContain("ohtools create complete");
      expect(existsSync(join(dir, "cli-tools/src/ohtools.ts"))).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });
});

async function captureConsole(action: () => Promise<number>) {
  const originalLog = console.log;
  const originalError = console.error;
  const stdout: string[] = [];
  const stderr: string[] = [];
  console.log = (message?: unknown) => {
    stdout.push(String(message));
  };
  console.error = (message?: unknown) => {
    stderr.push(String(message));
  };
  try {
    const code = await action();
    return { code, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}
