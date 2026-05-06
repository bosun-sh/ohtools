import { validationError } from "./errors";
import type { JsonSchema, SchemaDefinition, ValidationIssue } from "./types";

export type InferSchema<S> = S extends SchemaDefinition<infer T> ? T : never;

type JsonSchemaNode = JsonSchemaObject | boolean;
type JsonSchemaObject = Readonly<Record<string, unknown>>;

export function schema<T>(definition: SchemaDefinition<T>): SchemaDefinition<T> {
  return Object.freeze({ ...definition });
}

export function jsonSchema<T = unknown>(json: JsonSchema): SchemaDefinition<T> {
  return schema<T>({
    jsonSchema: json,
    parse(input: unknown): T {
      const issues = validateJsonSchema(json, input);
      if (issues.length > 0) {
        throw validationError("Input does not match JSON Schema.", issues);
      }
      return input as T;
    },
  });
}

export function parseWithSchema<T>(
  definition: SchemaDefinition<T> | undefined,
  value: unknown,
  path: string[],
): T {
  if (!definition) return value as T;
  try {
    return definition.parse(value);
  } catch (cause) {
    if (isValidationError(cause)) {
      throw validationError(cause.message, cause.issues, {
        path: cause.path ?? path,
        cause: cause.cause ?? cause,
      });
    }
    throw validationError("Schema validation failed.", [issueFromThrownValue(cause)], {
      path,
      cause,
    });
  }
}

function validateJsonSchema(schema: JsonSchema, value: unknown) {
  return validateJsonSchemaNode(schema, value, {
    path: [],
    root: schema,
    refStack: [],
  });
}

function validateJsonSchemaNode(
  node: JsonSchemaNode,
  value: unknown,
  context: { path: Array<string | number>; root: JsonSchema; refStack: string[] },
) {
  const issues: ValidationIssue[] = [];
  if (node === true) return issues;
  if (node === false) {
    issues.push({ path: context.path, message: "Value is not allowed.", code: "false-schema" });
    return issues;
  }

  const schema = node as JsonSchemaObject;
  const ref = schema.$ref;
  if (typeof ref === "string") {
    if (context.refStack.includes(ref)) {
      issues.push({
        path: context.path,
        message: `Circular JSON Schema reference "${ref}" is not supported.`,
        code: "$ref",
      });
      return issues;
    }
    const resolved = resolveLocalRef(context.root, ref);
    if (!resolved) {
      issues.push({
        path: context.path,
        message: `JSON Schema reference "${ref}" could not be resolved.`,
        code: "$ref",
      });
      return issues;
    }
    return validateJsonSchemaNode(resolved, value, {
      ...context,
      refStack: [...context.refStack, ref],
    });
  }

  if ("const" in schema && !jsonEquals(schema.const, value)) {
    issues.push({ path: context.path, message: "Expected value to match const.", code: "const" });
  }

  if (
    Array.isArray(schema.enum) &&
    !schema.enum.some((candidate) => jsonEquals(candidate, value))
  ) {
    issues.push({ path: context.path, message: "Expected value to match enum.", code: "enum" });
  }

  if (Array.isArray(schema.allOf)) {
    for (const child of schema.allOf) {
      if (isJsonSchemaNode(child)) issues.push(...validateJsonSchemaNode(child, value, context));
    }
  }

  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    const matches = schema.anyOf.some(
      (child) =>
        isJsonSchemaNode(child) && validateJsonSchemaNode(child, value, context).length === 0,
    );
    if (!matches) {
      issues.push({ path: context.path, message: "Expected value to match anyOf.", code: "anyOf" });
    }
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    const matches = schema.oneOf.filter(
      (child) =>
        isJsonSchemaNode(child) && validateJsonSchemaNode(child, value, context).length === 0,
    ).length;
    if (matches !== 1) {
      issues.push({ path: context.path, message: "Expected value to match oneOf.", code: "oneOf" });
    }
  }

  const type = schema.type;
  const expectedTypes =
    typeof type === "string" ? [type] : Array.isArray(type) ? type.filter(isString) : [];
  if (expectedTypes.length > 0 && !expectedTypes.some((expected) => matchesType(expected, value))) {
    issues.push({
      path: context.path,
      message: `Expected ${expectedTypes.join(" or ")}.`,
      code: "type",
    });
    return issues;
  }

  if (shouldValidateObject(expectedTypes, schema, value)) {
    validateObject(schema, value as Record<string, unknown>, context, issues);
  }

  if (shouldValidateArray(expectedTypes, schema, value) && Array.isArray(value)) {
    validateArray(schema, value, context, issues);
  }

  validateScalarKeywords(schema, value, context.path, issues);
  return issues;
}

function validateObject(
  schema: JsonSchemaObject,
  object: Record<string, unknown>,
  context: { path: Array<string | number>; root: JsonSchema; refStack: string[] },
  issues: ValidationIssue[],
) {
  const required = Array.isArray(schema.required) ? schema.required : [];
  for (const key of required) {
    if (typeof key === "string" && !(key in object)) {
      issues.push({
        path: [...context.path, key],
        message: "Required property is missing.",
        code: "required",
      });
    }
  }

  const validatedKeys = new Set<string>();
  if (isRecord(schema.properties)) {
    for (const [key, child] of Object.entries(schema.properties)) {
      if (key in object && isJsonSchemaNode(child)) {
        validatedKeys.add(key);
        issues.push(
          ...validateJsonSchemaNode(child, object[key], {
            ...context,
            path: [...context.path, key],
          }),
        );
      }
    }
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(object)) {
      if (!validatedKeys.has(key)) {
        issues.push({
          path: [...context.path, key],
          message: "Additional property is not allowed.",
          code: "additionalProperties",
        });
      }
    }
  } else if (isJsonSchemaNode(schema.additionalProperties)) {
    for (const [key, childValue] of Object.entries(object)) {
      if (!validatedKeys.has(key)) {
        issues.push(
          ...validateJsonSchemaNode(schema.additionalProperties, childValue, {
            ...context,
            path: [...context.path, key],
          }),
        );
      }
    }
  }
}

function validateArray(
  schema: JsonSchemaObject,
  value: unknown[],
  context: { path: Array<string | number>; root: JsonSchema; refStack: string[] },
  issues: ValidationIssue[],
) {
  if (isJsonSchemaNode(schema.items)) {
    value.forEach((item, index) => {
      issues.push(
        ...validateJsonSchemaNode(schema.items as JsonSchemaNode, item, {
          ...context,
          path: [...context.path, index],
        }),
      );
    });
  }
}

function matchesType(type: string, value: unknown): boolean {
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "null") return value === null;
  if (type === "object")
    return typeof value === "object" && value !== null && !Array.isArray(value);
  if (type === "string") return typeof value === "string";
  if (type === "number") return typeof value === "number";
  if (type === "boolean") return typeof value === "boolean";
  return true;
}

function validateScalarKeywords(
  schema: JsonSchemaObject,
  value: unknown,
  path: Array<string | number>,
  issues: ValidationIssue[],
) {
  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && value.length < schema.minLength) {
      issues.push({
        path,
        message: `Expected at least ${schema.minLength} characters.`,
        code: "minLength",
      });
    }
    if (typeof schema.maxLength === "number" && value.length > schema.maxLength) {
      issues.push({
        path,
        message: `Expected at most ${schema.maxLength} characters.`,
        code: "maxLength",
      });
    }
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern).test(value)) {
      issues.push({ path, message: "Expected string to match pattern.", code: "pattern" });
    }
  }
  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      issues.push({
        path,
        message: `Expected number to be >= ${schema.minimum}.`,
        code: "minimum",
      });
    }
    if (typeof schema.maximum === "number" && value > schema.maximum) {
      issues.push({
        path,
        message: `Expected number to be <= ${schema.maximum}.`,
        code: "maximum",
      });
    }
    if (typeof schema.exclusiveMinimum === "number" && value <= schema.exclusiveMinimum) {
      issues.push({
        path,
        message: `Expected number to be > ${schema.exclusiveMinimum}.`,
        code: "exclusiveMinimum",
      });
    }
    if (typeof schema.exclusiveMaximum === "number" && value >= schema.exclusiveMaximum) {
      issues.push({
        path,
        message: `Expected number to be < ${schema.exclusiveMaximum}.`,
        code: "exclusiveMaximum",
      });
    }
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      issues.push({
        path,
        message: `Expected at least ${schema.minItems} items.`,
        code: "minItems",
      });
    }
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems) {
      issues.push({
        path,
        message: `Expected at most ${schema.maxItems} items.`,
        code: "maxItems",
      });
    }
  }
}

function shouldValidateObject(expectedTypes: string[], schema: JsonSchemaObject, value: unknown) {
  return (
    matchesType("object", value) &&
    (expectedTypes.includes("object") ||
      isRecord(schema.properties) ||
      Array.isArray(schema.required) ||
      "additionalProperties" in schema)
  );
}

function shouldValidateArray(expectedTypes: string[], schema: JsonSchemaObject, value: unknown) {
  return matchesType("array", value) && (expectedTypes.includes("array") || "items" in schema);
}

function resolveLocalRef(root: JsonSchema, ref: string): JsonSchemaNode | undefined {
  if (ref === "#") return root;
  if (!ref.startsWith("#/")) return undefined;
  let current: unknown = root;
  for (const rawSegment of ref.slice(2).split("/")) {
    const segment = rawSegment.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!isRecord(current) || !(segment in current)) return undefined;
    current = current[segment];
  }
  return isJsonSchemaNode(current) ? current : undefined;
}

function isValidationError(value: unknown): value is {
  code: "OHTOOLS_VALIDATION_ERROR";
  message: string;
  issues: ValidationIssue[];
  path?: string[];
  cause?: unknown;
} {
  return (
    isRecord(value) &&
    value.code === "OHTOOLS_VALIDATION_ERROR" &&
    typeof value.message === "string" &&
    Array.isArray(value.issues)
  );
}

function issueFromThrownValue(cause: unknown): ValidationIssue {
  if (cause instanceof Error) return { path: [], message: cause.message };
  if (typeof cause === "string") return { path: [], message: cause };
  return { path: [], message: "Schema validation failed." };
}

function isJsonSchemaNode(value: unknown): value is JsonSchemaNode {
  return typeof value === "boolean" || isRecord(value);
}

function isRecord(value: unknown): value is JsonSchemaObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function jsonEquals(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}
