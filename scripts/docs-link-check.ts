import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const pagesRoot = join(root, "apps/docs/src/pages");

if (!exists(pagesRoot)) {
  console.error("apps/docs/src/pages: missing");
  process.exit(1);
}

const pages = walk(pagesRoot).filter((path) => path.endsWith(".mdx") || path.endsWith(".astro"));
const routes = new Map<string, string>();
const anchors = new Map<string, Set<string>>();
const failures: string[] = [];

for (const page of pages) {
  const route = routeForPage(page);
  const text = readFileSync(page, "utf8");
  routes.set(route, page);
  anchors.set(route, collectAnchors(text));
}

for (const page of pages) {
  const route = routeForPage(page);
  const text = readFileSync(page, "utf8");
  for (const link of collectLinks(text)) {
    if (!isInternalDocsLink(link)) continue;
    const target = resolveTarget(route, link);
    if (!routes.has(target.route)) {
      failures.push(`${display(page)}: broken docs link ${link}`);
      continue;
    }
    if (target.anchor && !anchors.get(target.route)?.has(target.anchor)) {
      failures.push(`${display(page)}: broken anchor ${link}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`docs:links passed (${pages.length} pages, ${routes.size} routes)`);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function routeForPage(path: string) {
  const withoutExt = relative(pagesRoot, path).replace(/\.(mdx|astro)$/, "");
  const route = withoutExt
    .split(sep)
    .filter((part) => part !== "index")
    .join("/");
  return normalizeRoute(`/${route}`);
}

function collectLinks(text: string) {
  const links: string[] = [];
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    links.push(match[1]);
  }
  for (const match of text.matchAll(/\bhref=["']([^"']+)["']/g)) {
    links.push(match[1]);
  }
  return links;
}

function collectAnchors(text: string) {
  const found = new Set<string>();
  for (const match of text.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    found.add(slugHeading(match[1]));
  }
  return found;
}

function slugHeading(raw: string) {
  return raw
    .replace(/`([^`]+)`/g, "$1")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function isInternalDocsLink(link: string) {
  return (
    link.startsWith("/") || link.startsWith("./") || link.startsWith("../") || link.startsWith("#")
  );
}

function resolveTarget(fromRoute: string, link: string) {
  const [rawPath, anchor] = link.split("#", 2);
  if (!rawPath) return { route: fromRoute, anchor };
  if (rawPath.startsWith("/")) return { route: normalizeRoute(rawPath), anchor };
  const fromParts = fromRoute === "/" ? [] : fromRoute.slice(1).split("/");
  fromParts.pop();
  for (const part of rawPath.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") fromParts.pop();
    else fromParts.push(part);
  }
  return { route: normalizeRoute(`/${fromParts.join("/")}`), anchor };
}

function normalizeRoute(route: string) {
  const withoutFileExt = route.replace(/\.(mdx|astro|html)$/, "");
  const withoutIndex = withoutFileExt.replace(/\/index$/, "");
  const normalized = withoutIndex.replace(/\/+$/, "");
  return normalized === "" ? "/" : normalized;
}

function display(path: string) {
  return relative(root, path);
}

function exists(path: string) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}
