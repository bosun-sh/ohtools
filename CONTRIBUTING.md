# Contributing

Use Bun for all development commands. Keep public APIs aligned with `spec/` and
run `bun run validate` before release-facing changes.

Specs are the implementation contract. If behavior changes, update the relevant
numbered spec and tests in the same change.
