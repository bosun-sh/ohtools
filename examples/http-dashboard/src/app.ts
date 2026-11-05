import { defineTool, jsonSchema, notFound, Ohtools, refine } from "@bosun-sh/ohtools";
import { Effect } from "effect";

interface Application {
  id: string;
  owner: string;
  company: string;
  role: string;
  status: "applied" | "interview" | "offer" | "rejected";
}

// In-memory store; swap for your database.
const applications = new Map<string, Application>();
let nextId = 1;

// `notFound` -> HTTP 404 / tRPC NOT_FOUND / CLI exit 4; `reason` tells clients which resource.
const applicationNotFound = refine(notFound, "application_not_found");

const owner = (metadata: Readonly<Record<string, unknown>>) =>
  String(metadata.userId ?? "anonymous");

const listApplications = defineTool({
  id: "applications.list",
  description: "List the caller's job applications.",
  http: { method: "GET", path: "/applications" },
  input: jsonSchema<{ status?: Application["status"] }>({
    type: "object",
    properties: { status: { type: "string" } },
  }),
  run: ({ status }, { metadata }) =>
    [...applications.values()].filter(
      (item) => item.owner === owner(metadata) && (!status || item.status === status),
    ),
});

const createApplication = defineTool({
  id: "applications.create",
  description: "Track a new job application.",
  http: { method: "POST", path: "/applications" },
  input: jsonSchema<{ company: string; role: string }>({
    type: "object",
    properties: { company: { type: "string" }, role: { type: "string" } },
    required: ["company", "role"],
  }),
  run: ({ company, role }, { metadata, emit }) => {
    emit?.({ step: "saving" });
    const item: Application = {
      id: String(nextId++),
      owner: owner(metadata),
      company,
      role,
      status: "applied",
    };
    applications.set(item.id, item);
    return item;
  },
});

const updateApplication = defineTool({
  id: "applications.update",
  description: "Change the status of an application.",
  http: { method: "PATCH", path: "/applications/:id" },
  input: jsonSchema<{ id: string; status: Application["status"] }>({
    type: "object",
    properties: { id: { type: "string" }, status: { type: "string" } },
    required: ["id", "status"],
  }),
  run: ({ id, status }, { metadata }) => {
    const item = applications.get(id);
    if (!item || item.owner !== owner(metadata)) {
      return Effect.fail(applicationNotFound(`Application ${id} not found.`));
    }
    item.status = status;
    return item;
  },
});

const deleteApplication = defineTool({
  id: "applications.delete",
  description: "Stop tracking an application.",
  http: { method: "DELETE", path: "/applications/:id" },
  input: jsonSchema<{ id: string }>({
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  }),
  run: ({ id }, { metadata }) => {
    const item = applications.get(id);
    if (!item || item.owner !== owner(metadata)) {
      return Effect.fail(applicationNotFound(`Application ${id} not found.`));
    }
    applications.delete(id);
    return { id };
  },
});

export default new Ohtools()
  .tool(listApplications)
  .tool(createApplication)
  .tool(updateApplication)
  .tool(deleteApplication);
