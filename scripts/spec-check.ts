import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const requiredDocs = [
  "docs/README.md",
  "docs/OKRS.md",
  "docs/KPIS.md",
  "docs/TASK-HARNESS.md",
  "docs/VALIDATION.md",
];
const approvedModels = ["gpt-5.4-mini", "gpt-5.3-codex", "gpt-5.4", "gpt-5.5"];
const requiredTaskWords = [
  "assigned model",
  "owning specs",
  "goal",
  "scope",
  "dependencies",
  "phases",
  "requirements",
  "edge cases",
  "tests",
  "validation",
  "definition of done",
];
const requiredSpecWords = [
  "purpose",
  "public interfaces",
  "implementation requirements",
  "edge cases",
  "tests",
  "done criteria",
];
const placeholders = ["TODO", "TBD", "chosen later", "or equivalent", "where feasible"];

export function checkSpecWorkspace(root = process.cwd()) {
  const failures: string[] = [];
  const context = { root, failures };

  for (const doc of requiredDocs) exists(context, doc);

  const specRoot = join(root, "spec");
  const specDirs = existsPath(specRoot)
    ? readdirSync(specRoot)
        .filter((name) => /^\d{2}-/.test(name))
        .sort()
    : [];
  if (specDirs.length === 0) failures.push("spec: no numbered spec directories");

  for (const dir of specDirs) {
    const specPath = `spec/${dir}/SPEC.md`;
    if (exists(context, specPath)) {
      const specText = read(root, specPath);
      const text = specText.toLowerCase();
      for (const word of requiredSpecWords) {
        if (!text.includes(word)) failures.push(`${specPath}: missing ${word}`);
      }
      for (const placeholder of placeholders) {
        if (dir !== "14-validation-scripts" && specText.includes(placeholder)) {
          failures.push(`${specPath}: unresolved placeholder ${placeholder}`);
        }
      }
    }

    const tasksDir = join(root, "spec", dir, "tasks");
    if (!existsPath(tasksDir) || !statSync(tasksDir).isDirectory()) {
      failures.push(`spec/${dir}: missing tasks directory`);
      continue;
    }
    const tasks = readdirSync(tasksDir).filter((name) => name.endsWith(".md"));
    if (tasks.length === 0) failures.push(`spec/${dir}: no task files`);
    for (const task of tasks) {
      const taskPath = `spec/${dir}/tasks/${task}`;
      const taskText = read(root, taskPath);
      const lower = taskText.toLowerCase();
      for (const word of requiredTaskWords) {
        if (!lower.includes(word)) failures.push(`${taskPath}: missing ${word}`);
      }
      const taskModels = taskText.match(/\bgpt-[\w.-]+\b/g) ?? [];
      if (taskModels.length === 0) {
        failures.push(`${taskPath}: missing approved model`);
      }
      for (const model of taskModels) {
        if (!approvedModels.includes(model)) {
          failures.push(`${taskPath}: unapproved model ${model}`);
        }
      }
      for (const phase of ["plan", "use cases", "test", "develop", "validate"]) {
        if (!lower.includes(phase)) failures.push(`${taskPath}: missing ${phase} phase`);
      }
    }
  }

  if (
    exists(context, "spec/SPEC.md") &&
    !read(root, "spec/SPEC.md").includes("Resolved for Public v1")
  ) {
    failures.push("spec/SPEC.md: missing Resolved for Public v1");
  }

  return { failures, specCount: specDirs.length };
}

if (import.meta.main) {
  const result = checkSpecWorkspace();
  if (result.failures.length > 0) {
    console.error(result.failures.join("\n"));
    process.exit(1);
  }
  console.log(`spec:check passed (${result.specCount} specs)`);
}

function exists(context: { root: string; failures: string[] }, path: string) {
  if (!existsPath(join(context.root, path))) {
    context.failures.push(`${path}: missing`);
    return false;
  }
  return true;
}

function existsPath(path: string) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function read(root: string, path: string) {
  return readFileSync(join(root, path), "utf8");
}
