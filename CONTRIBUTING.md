# Contributing

Use Bun for all development commands. Run `bun run validate` before
release-facing changes.

Ohtools is currently pre-1.0. If behavior changes, update the relevant tests,
docs, examples, and changelog entries in the same change. Treat public API,
CLI, adapter wire shape, and error-code changes as compatibility-sensitive even
before 1.0.
