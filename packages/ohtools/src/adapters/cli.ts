import { resolve } from "node:path";
import { Effect } from "effect";
import { exploreRegistry, serializeGraph } from "../core";
import { type GeneratedDocsFormat, generateDocsJson, generateDocsMarkdown } from "../docs";
import { formatError, makeError, normalizeError } from "../errors";
import { createProject, formatScaffoldResult, initProject } from "../scaffold";
import type { AdapterDefinition, BuiltOhtoolsApp, OhtoolsError, OhtoolsRegistry } from "../types";

export interface CliAdapterOptions {
  human?: boolean;
}

export interface CliEnvelope<T> {
  ok: true;
  data: T;
}

export interface CliErrorEnvelope {
  ok: false;
  error: OhtoolsError;
}

export function cliAdapter(_options: CliAdapterOptions = {}): AdapterDefinition {
  return {
    id: "cli",
    kind: "cli",
    attach(_app: BuiltOhtoolsApp) {
      let _started = false;
      return {
        start() {
          _started = true;
        },
        stop() {
          _started = false;
        },
      };
    },
  };
}

export async function runCli(argv: string[]): Promise<number> {
  let parsed: ReturnType<typeof parseArgs> | undefined;
  try {
    parsed = parseArgs(argv);
    if (parsed.command === "init") {
      console.log(formatScaffoldResult("init", initProject()));
      return 0;
    }
    if (parsed.command === "create") {
      const appName = parsed.positionals[0];
      if (!appName) {
        throw makeError("OHTOOLS_ADAPTER_ERROR", "Usage: ohtools create <appname>");
      }
      console.log(formatScaffoldResult("create", createProject(appName)));
      return 0;
    }
    if (!parsed.app || !parsed.command) {
      writeError(
        makeError(
          "OHTOOLS_ADAPTER_ERROR",
          "Usage: ohtools init | ohtools create <appname> | ohtools --app ./app.ts <list|explore|run|graph|docs> [--format json]",
        ),
        2,
      );
      return 2;
    }
    const appModule = await import(normalizeImportPath(parsed.app));
    const app = appModule.default ?? appModule.app;
    const registry: OhtoolsRegistry = typeof app.build === "function" ? app.build() : app.registry;
    const runtime = typeof app.runtime === "function" ? app.runtime() : undefined;
    let data: unknown;
    if (parsed.command === "list") {
      data = [...registry.tools.values()].map((tool) => ({
        id: tool.id,
        title: tool.title,
        description: tool.description,
        mode: tool.mode ?? "both",
      }));
    } else if (parsed.command === "explore") {
      data = exploreRegistry(registry, { nodeId: parsed.positionals[0] });
    } else if (parsed.command === "graph") {
      data = serializeGraph(registry.graph);
    } else if (parsed.command === "docs") {
      if (parsed.format === "json") {
        console.log(JSON.stringify(generateDocsJson(registry), null, 2));
      } else {
        console.log(generateDocsMarkdown(registry));
      }
      return 0;
    } else if (parsed.command === "run") {
      const toolId = parsed.positionals[0];
      if (!toolId || !runtime)
        throw makeError("OHTOOLS_TOOL_NOT_FOUND", "Missing tool ID.", { path: ["run"] });
      const result = await Effect.runPromise(
        Effect.either(runtime.run({ toolId, input: parsed.input ?? {} })),
      );
      if (result._tag === "Left") throw result.left;
      data = result.right;
    } else {
      throw makeError("OHTOOLS_ADAPTER_ERROR", `Unknown CLI command "${parsed.command}".`);
    }
    writeSuccess(data, parsed.human);
    return 0;
  } catch (cause) {
    const error = normalizeError(cause, "OHTOOLS_ADAPTER_ERROR");
    const code = exitCode(error);
    writeError(error, code, parsed?.human);
    return code;
  }
}

function parseArgs(argv: string[]) {
  const result: {
    app?: string;
    command?: string;
    format: GeneratedDocsFormat;
    input?: unknown;
    human: boolean;
    positionals: string[];
  } = {
    format: "markdown",
    human: false,
    positionals: [],
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--app") result.app = argv[++index];
    else if (arg === "--format") {
      const format = argv[++index];
      if (format !== "markdown" && format !== "json") {
        throw makeError("OHTOOLS_ADAPTER_ERROR", `Unknown docs format "${format}".`, {
          path: ["cli", "docs", "format"],
        });
      }
      result.format = format;
    } else if (arg === "--input") {
      const raw = argv[++index];
      try {
        result.input = JSON.parse(raw);
      } catch (cause) {
        throw makeError("OHTOOLS_VALIDATION_ERROR", "Invalid JSON for --input.", {
          path: ["cli", "run", "input"],
          cause,
        });
      }
    } else if (arg === "--human") result.human = true;
    else if (!result.command) result.command = arg;
    else result.positionals.push(arg);
  }
  return result;
}

function normalizeImportPath(path: string) {
  if (path.startsWith(".") || path.startsWith("/")) {
    const absolute = path.startsWith("/") ? path : resolve(process.cwd(), path);
    return `file://${absolute}`;
  }
  return path;
}

function writeSuccess(data: unknown, human = false) {
  if (human) {
    console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));
    return;
  }
  console.log(JSON.stringify({ ok: true, data } satisfies CliEnvelope<unknown>));
}

function writeError(error: OhtoolsError, _code: number, human = false) {
  if (human) {
    console.error(formatError(error));
    return;
  }
  console.error(JSON.stringify({ ok: false, error } satisfies CliErrorEnvelope));
}

function exitCode(error: OhtoolsError) {
  if (error.code === "OHTOOLS_VALIDATION_ERROR") return 3;
  if (error.code === "OHTOOLS_TOOL_NOT_FOUND" || error.code === "OHTOOLS_GROUP_NOT_RUNNABLE")
    return 4;
  if (error.code === "OHTOOLS_HANDLER_ERROR") return 5;
  return 1;
}
