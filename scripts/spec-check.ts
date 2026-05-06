import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
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
  "implementation requirements",
  "edge cases",
  "tests",
  "done criteria",
];
const placeholders = ["TODO", "TBD", "chosen later", "or equivalent", "where feasible"];

const failures: string[] = [];
for (const doc of requiredDocs) exists(doc);

const specDirs = readdirSync(join(root, "spec"))
  .filter((name) => /^\d{2}-/.test(name))
  .sort();
for (const dir of specDirs) {
  const specPath = `spec/${dir}/SPEC.md`;
  exists(specPath);
  const text = read(specPath).toLowerCase();
  for (const word of requiredSpecWords) {
    if (!text.includes(word)) failures.push(`${specPath}: missing ${word}`);
  }
  for (const placeholder of placeholders) {
    if (dir !== "14-validation-scripts" && read(specPath).includes(placeholder))
      failures.push(`${specPath}: unresolved placeholder ${placeholder}`);
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
    const taskText = read(taskPath);
    const lower = taskText.toLowerCase();
    for (const word of requiredTaskWords) {
      if (!lower.includes(word)) failures.push(`${taskPath}: missing ${word}`);
    }
    if (!approvedModels.some((model) => taskText.includes(model))) {
      failures.push(`${taskPath}: missing approved model`);
    }
    for (const phase of ["plan", "use cases", "test", "develop", "validate"]) {
      if (!lower.includes(phase)) failures.push(`${taskPath}: missing ${phase} phase`);
    }
  }
}

if (!read("spec/SPEC.md").includes("Resolved for Public v1")) {
  failures.push("spec/SPEC.md: missing Resolved for Public v1");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`spec:check passed (${specDirs.length} specs)`);

function exists(path: string) {
  if (!existsPath(join(root, path))) failures.push(`${path}: missing`);
}

function existsPath(path: string) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}
