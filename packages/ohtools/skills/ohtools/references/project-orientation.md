# Project Orientation

An Ohtools repository normally contains:

- `src/ohtools.ts`: the app entry exported as the default value.
- `.agents/skills/ohtools/`: this repo-local skill for AI agent discovery.
- `package.json`: scripts for listing, documenting, and graphing the app.
- Optional `src/tools/`, `src/plugins/`, or domain folders for larger apps.

Keep app composition separate from domain logic. The app entry should import
tools, groups, plugins, and adapters, then compose them with `new Ohtools()`.

Do not hide tool behavior behind dynamic discovery until the static builder API
becomes painful. Static definitions give agents better IDs, docs, and graph
output.

Before editing an existing project, inspect:

- package manager and scripts
- current app entry path
- tool IDs and hierarchy
- schema style
- adapter usage
- tests and docs
