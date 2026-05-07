# Docs And Examples

Docs and examples are part of the public API for Ohtools.

When behavior changes:

- update the package README for install and quick-start changes
- update docs pages for concepts, adapters, and getting started
- update or add examples that can be checked by the validation scripts
- keep snippets runnable with Bun

Generated docs should come from the registry when possible:

```sh
bunx ohtools --app ./src/ohtools.ts docs
```

Do not document commands that require unpublished package names or unsupported
runtimes. The package command path is scoped:

```sh
npx @bosun-sh/ohtools create my-tools
```
