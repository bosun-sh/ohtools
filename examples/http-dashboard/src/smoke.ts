import { httpHandler } from "@bosun-sh/ohtools/adapters/http";
import app from "./app";

const handler = httpHandler(app, {
  context: (request) => ({ userId: request.headers.get("x-user-id") ?? "anonymous" }),
});
const call = (path: string, init: RequestInit = {}) =>
  handler(
    new Request(`http://localhost${path}`, {
      ...init,
      headers: { "content-type": "application/json", "x-user-id": "u1" },
    }),
  );

const created = await call("/applications", {
  method: "POST",
  body: JSON.stringify({ company: "Acme", role: "Engineer" }),
});
const id = (await created.json()).data.output.id;
const patched = await call(`/applications/${id}`, {
  method: "PATCH",
  body: JSON.stringify({ status: "interview" }),
});
const missing = await call("/applications/999", { method: "DELETE" });

if (created.status !== 200 || patched.status !== 200 || missing.status !== 404) {
  throw new Error("http-dashboard example smoke failed");
}
