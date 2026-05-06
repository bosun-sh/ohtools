import { validationError } from "./errors";
import type { JsonSchema, SchemaDefinition, ValidationIssue } from "./types";

export type InferSchema<S> = S extends SchemaDefinition<infer T> ? T : never;

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
    if (typeof cause === "object" && cause !== null && "code" in cause) throw cause;
    throw validationError("Schema validation failed.", [{ path: [], message: String(cause) }], {
      path,
      cause,
    });
  }
}

function validateJsonSchema(schema: JsonSchema, value: unknown, path: Array<string | number> = []) {
  const issues: ValidationIssue[] = [];
  const type = schema.type;
  if (typeof type === "string" && !matchesType(type, value)) {
    issues.push({ path, message: `Expected ${type}.`, code: "type" });
    return issues;
  }
  if (type === "object" && typeof value === "object" && value !== null && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (typeof key === "string" && !(key in object)) {
        issues.push({
          path: [...path, key],
          message: "Required property is missing.",
          code: "required",
        });
      }
    }
    const properties = schema.properties;
    if (typeof properties === "object" && properties !== null && !Array.isArray(properties)) {
      for (const [key, child] of Object.entries(properties)) {
        if (key in object && typeof child === "object" && child !== null && !Array.isArray(child)) {
          issues.push(...validateJsonSchema(child as JsonSchema, object[key], [...path, key]));
        }
      }
    }
  }
  if (
    type === "array" &&
    Array.isArray(value) &&
    typeof schema.items === "object" &&
    schema.items
  ) {
    value.forEach((item, index) => {
      issues.push(...validateJsonSchema(schema.items as JsonSchema, item, [...path, index]));
    });
  }
  return issues;
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
