import { describe, expect, test } from "bun:test";
import {
  ErrorCode,
  errorClass,
  isClientError,
  isServerError,
  matchError,
  normalizeError,
  notFound,
  refine,
} from "../src";
import { OhtoolsException } from "../src/types";

describe("errors", () => {
  test("every code has a class", () => {
    for (const code of Object.values(ErrorCode)) {
      expect(["client", "server"]).toContain(errorClass[code]);
    }
  });

  test("refine keeps code and class and adds reason", () => {
    const appNotFound = refine(notFound, "application_not_found");
    const error = appNotFound("Application 42 not found.");
    expect(error.code).toBe(ErrorCode.NOT_FOUND);
    expect(error.reason).toBe("application_not_found");
    expect(isClientError(error)).toBe(true);
    expect(isServerError(error)).toBe(false);
  });

  test("matchError folds by class", () => {
    const fold = (e: ReturnType<typeof notFound>) =>
      matchError(e, { client: () => "c", server: () => "s" });
    expect(fold(notFound("x"))).toBe("c");
    expect(fold({ code: ErrorCode.HANDLER_ERROR, message: "x" })).toBe("s");
  });

  test("normalizeError preserves reason", () => {
    const error = normalizeError(
      new OhtoolsException(refine(notFound, "gone")("nope")),
      ErrorCode.HANDLER_ERROR,
    );
    expect(error).toMatchObject({ code: ErrorCode.NOT_FOUND, reason: "gone", message: "nope" });
  });
});
