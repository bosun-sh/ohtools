import type { Metadata, OhtoolsError, OhtoolsErrorCode, ValidationIssue } from "./types";
import { ErrorCode, OhtoolsException } from "./types";

export type ErrorOptions = {
  path?: string[];
  cause?: unknown;
  metadata?: Metadata;
  reason?: string;
};

export function makeError(
  code: OhtoolsErrorCode,
  message: string,
  options: ErrorOptions = {},
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
      reason: error.reason,
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

export type ErrorClass = "client" | "server";

/** Whether the caller (client) or the service (server) is at fault. Adapters derive status codes from it. */
export const errorClass = {
  [ErrorCode.INVALID_ID]: "server",
  [ErrorCode.DUPLICATE_TOOL]: "server",
  [ErrorCode.DUPLICATE_GROUP]: "server",
  [ErrorCode.DUPLICATE_ADAPTER]: "server",
  [ErrorCode.INCOMPATIBLE_METADATA]: "server",
  [ErrorCode.MISSING_NEXT_STEP]: "server",
  [ErrorCode.TOOL_NOT_FOUND]: "client",
  [ErrorCode.GROUP_NOT_RUNNABLE]: "client",
  [ErrorCode.TOOL_NOT_RUNNABLE]: "client",
  [ErrorCode.VALIDATION_ERROR]: "client",
  [ErrorCode.HANDLER_ERROR]: "server",
  [ErrorCode.NEXT_STEP_ERROR]: "server",
  [ErrorCode.CANCELLED]: "client",
  [ErrorCode.TIMEOUT]: "server",
  [ErrorCode.ADAPTER_ERROR]: "server",
  [ErrorCode.BAD_REQUEST]: "client",
  [ErrorCode.UNAUTHORIZED]: "client",
  [ErrorCode.FORBIDDEN]: "client",
  [ErrorCode.NOT_FOUND]: "client",
  [ErrorCode.METHOD_NOT_ALLOWED]: "client",
  [ErrorCode.CONFLICT]: "client",
  [ErrorCode.PAYLOAD_TOO_LARGE]: "client",
  [ErrorCode.RATE_LIMITED]: "client",
  [ErrorCode.NOT_IMPLEMENTED]: "server",
  [ErrorCode.UNAVAILABLE]: "server",
} as const satisfies Record<OhtoolsErrorCode, ErrorClass>;

export const isClientError = (error: OhtoolsError): boolean => errorClass[error.code] === "client";
export const isServerError = (error: OhtoolsError): boolean => errorClass[error.code] === "server";

export const matchError = <A>(
  error: OhtoolsError,
  cases: { client: (error: OhtoolsError) => A; server: (error: OhtoolsError) => A },
): A => cases[errorClass[error.code]](error);

export type ErrorConstructor = (message: string, options?: ErrorOptions) => OhtoolsError;

export const errorOf =
  (code: OhtoolsErrorCode): ErrorConstructor =>
  (message, options) =>
    makeError(code, message, options);

export const badRequest = errorOf(ErrorCode.BAD_REQUEST);
export const unauthorized = errorOf(ErrorCode.UNAUTHORIZED);
export const forbidden = errorOf(ErrorCode.FORBIDDEN);
export const notFound = errorOf(ErrorCode.NOT_FOUND);
export const conflict = errorOf(ErrorCode.CONFLICT);
export const rateLimited = errorOf(ErrorCode.RATE_LIMITED);
export const notImplemented = errorOf(ErrorCode.NOT_IMPLEMENTED);
export const unavailable = errorOf(ErrorCode.UNAVAILABLE);

/** Keeps the code (and so the class and status) of `ctor` and adds an app-specific `reason`. */
export const refine =
  (ctor: ErrorConstructor, reason: string): ErrorConstructor =>
  (message, options) => ({ ...ctor(message, options), reason });

/**
 * Error safe to send to a client: `cause` is always dropped, and server-class errors
 * lose their message and metadata unless `debug` is set.
 */
export function sanitizeError(error: OhtoolsError, debug = false): OhtoolsError {
  const { cause: _cause, ...safe } = error;
  if (debug || isClientError(error)) return safe;
  return {
    code: error.code,
    message: "Internal server error.",
    ...(error.reason && { reason: error.reason }),
    ...(error.path && { path: error.path }),
  };
}
