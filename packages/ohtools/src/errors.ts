import type { Metadata, OhtoolsError, OhtoolsErrorCode, ValidationIssue } from "./types";
import { OhtoolsException } from "./types";

export function makeError(
  code: OhtoolsErrorCode,
  message: string,
  options: { path?: string[]; cause?: unknown; metadata?: Metadata } = {},
): OhtoolsError {
  return { code, message, ...options };
}

export function throwError(error: OhtoolsError): never {
  throw new OhtoolsException(error);
}

export function normalizeError(error: unknown, fallback: OhtoolsErrorCode): OhtoolsError {
  if (error instanceof OhtoolsException) {
    return makeError(error.code, stripCodePrefix(error.code, error.message), {
      path: error.path,
      cause: error.cause,
      metadata: error.metadata,
    });
  }
  if (isOhtoolsError(error)) return error;
  const message = error instanceof Error ? error.message : String(error);
  return makeError(fallback, message || "Ohtools operation failed.", { cause: error });
}

export function isOhtoolsError(value: unknown): value is OhtoolsError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof (value as { code: unknown }).code === "string" &&
    "message" in value
  );
}

export function validationError(
  message: string,
  issues: ValidationIssue[],
  options: { path?: string[]; cause?: unknown } = {},
) {
  return {
    code: "OHTOOLS_VALIDATION_ERROR" as const,
    message,
    issues,
    path: options.path,
    cause: options.cause,
  };
}

export function formatError(error: OhtoolsError): string {
  const path = error.path?.length ? ` at ${error.path.join(".")}` : "";
  const fix = suggestedFix(error.code);
  return `${error.code}${path}: ${error.message}${fix ? ` Suggested fix: ${fix}` : ""}`;
}

function suggestedFix(code: OhtoolsErrorCode): string | undefined {
  switch (code) {
    case "OHTOOLS_INVALID_ID":
      return "Use lowercase IDs matching /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.";
    case "OHTOOLS_DUPLICATE_TOOL":
    case "OHTOOLS_DUPLICATE_GROUP":
    case "OHTOOLS_DUPLICATE_ADAPTER":
      return "Rename one contribution or remove the duplicate registration.";
    case "OHTOOLS_MISSING_NEXT_STEP":
      return "Register the target node or mark the next step optional.";
    case "OHTOOLS_VALIDATION_ERROR":
      return "Check the input or output schema and supplied JSON.";
    default:
      return undefined;
  }
}

function stripCodePrefix(code: OhtoolsErrorCode, message: string) {
  const prefix = `${code}: `;
  return message.startsWith(prefix) ? message.slice(prefix.length) : message;
}
