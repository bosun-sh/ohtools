import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkSpecWorkspace } from "./spec-check";

const workspaces: string[] = [];

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    rmSync(workspace, { recursive: true, force: true });
  }
});

describe("spec:check fixtures", () => {
  test("passes a minimal ready spec workspace", () => {
    const root = createWorkspace();

    expect(checkSpecWorkspace(root).failures).toEqual([]);
  });

  test("reports a missing numbered SPEC.md without throwing", () => {
    const root = createWorkspace({ specBody: undefined });

    expect(checkSpecWorkspace(root).failures).toContain("spec/01-ready/SPEC.md: missing");
  });

  test("reports missing task files", () => {
    const root = createWorkspace({ taskBody: undefined });

    expect(checkSpecWorkspace(root).failures).toContain("spec/01-ready: no task files");
  });

  test("reports invalid task sections", () => {
    const root = createWorkspace({ taskBody: "# Bad Task\n" });

    expect(checkSpecWorkspace(root).failures).toEqual(
      expect.arrayContaining([
        "spec/01-ready/tasks/01-task.md: missing assigned model",
        "spec/01-ready/tasks/01-task.md: missing owning specs",
        "spec/01-ready/tasks/01-task.md: missing definition of done",
      ]),
    );
  });

  test("reports unapproved task and phase models", () => {
    const root = createWorkspace({
      taskBody: taskFixture({
        taskModel: "gpt-6.0",
        validateModel: "gpt-5.3-codex-experimental",
      }),
    });

    expect(checkSpecWorkspace(root).failures).toEqual(
      expect.arrayContaining([
        "spec/01-ready/tasks/01-task.md: unapproved model gpt-6.0",
        "spec/01-ready/tasks/01-task.md: unapproved model gpt-5.3-codex-experimental",
      ]),
    );
  });

  test("reports a missing required phase", () => {
    const root = createWorkspace({
      taskBody: taskFixture({ includeDevelopPhase: false }),
    });

    expect(checkSpecWorkspace(root).failures).toContain(
      "spec/01-ready/tasks/01-task.md: missing develop phase",
    );
  });
});

function createWorkspace(options: { specBody?: string; taskBody?: string } = {}) {
  const root = mkdtempSync(join(tmpdir(), "ohtools-spec-check-"));
  workspaces.push(root);

  for (const doc of [
    "docs/README.md",
    "docs/OKRS.md",
    "docs/KPIS.md",
    "docs/TASK-HARNESS.md",
    "docs/VALIDATION.md",
  ]) {
    write(root, doc, "# Fixture\n");
  }
  write(root, "spec/SPEC.md", "# Fixture\n\nResolved for Public v1\n");

  mkdirSync(join(root, "spec/01-ready/tasks"), { recursive: true });
  if (options.specBody !== undefined) {
    write(root, "spec/01-ready/SPEC.md", options.specBody);
  } else if (!("specBody" in options)) {
    write(root, "spec/01-ready/SPEC.md", specFixture());
  }

  if (options.taskBody !== undefined) {
    write(root, "spec/01-ready/tasks/01-task.md", options.taskBody);
  } else if (!("taskBody" in options)) {
    write(root, "spec/01-ready/tasks/01-task.md", taskFixture());
  }

  return root;
}

function write(root: string, path: string, text: string) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, text);
}

function specFixture() {
  return `# Ready

## Purpose

Fixture purpose.

## Public Interfaces

Fixture interfaces.

## Implementation Requirements

Fixture requirements.

## Edge Cases

Fixture edge cases.

## Tests

Fixture tests.

## Done Criteria

Fixture done criteria.
`;
}

function taskFixture(
  options: {
    includeDevelopPhase?: boolean;
    taskModel?: string;
    validateModel?: string;
  } = {},
) {
  const includeDevelopPhase = options.includeDevelopPhase ?? true;
  const taskModel = options.taskModel ?? "gpt-5.3-codex";
  const validateModel = options.validateModel ?? "gpt-5.4-mini";
  const developPhase = includeDevelopPhase
    ? `| Develop | Inherit task default | Scoped implementation. |
`
    : "";

  return `# Task

## Assigned Model

- Task default: \`${taskModel}\`

## Owning Specs

- \`spec/01-ready/SPEC.md\`

## Goal

Fixture goal.

## Scope

Fixture scope.

## Dependencies

Fixture dependencies.

## Phases

| Phase | Assigned Model | Deliverable |
| --- | --- | --- |
| Plan | Inherit task default | Plan notes. |
| Use Cases | Inherit task default | Acceptance scenarios. |
| Test / TDD | Inherit task default | Fixture tests. |
${developPhase}| Validate | ${validateModel} | Validation results. |

## Requirements

Fixture requirements.

## Edge Cases

Fixture edge cases.

## Tests and Validation

Fixture tests and validation.

## Definition of Done

Fixture done criteria.
`;
}
