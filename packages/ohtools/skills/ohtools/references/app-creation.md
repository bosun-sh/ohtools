# App Creation

Use `npx @bosun-sh/ohtools create my-tools` for a new Bun TypeScript app.
Use `npx @bosun-sh/ohtools init` inside an existing project.

A starter app should include:

- `src/ohtools.ts` exporting a default `Ohtools` app.
- at least one typed tool with a JSON Schema input.
- MCP and CLI-ready package scripts.
- `tsconfig.json` using `NodeNext` module resolution.
- README commands that actually run.
- `.agents/skills/ohtools/` for agent discovery.

Recommended scripts:

```json
{
  "ohtools:list": "bunx ohtools --app ./src/ohtools.ts list",
  "ohtools:docs": "bunx ohtools --app ./src/ohtools.ts docs",
  "ohtools:graph": "bunx ohtools --app ./src/ohtools.ts graph",
  "typecheck": "tsc --noEmit"
}
```

Keep scaffolds non-destructive. If a file already exists, report the conflict and
leave it alone unless an explicit force option exists.
