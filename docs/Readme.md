# JSON CMS Documentation

Date: March 9, 2026
Status: Canonical docs for the Next.js-first production runtime

## Start Here

- `docs/architecture.md`: current runtime architecture and folder ownership
- `docs/audit-report.md`: audit findings and hardening summary
- `docs/migration.md`: migration path from legacy data roots and schemas
- `docs/production-checklist.md`: release gates before deployment
- `docs/engineering-program-plan.md`: milestone matrix, stream ownership, and delivery gates
- `docs/execution-journal.md`: append-only execution log format and lifecycle tags
- `docs/adapters/contract.md`: adapter lifecycle hooks, constraints, and compatibility guarantees
- `docs/release/package-publish-checklist.md`: package publish gates and sign-off checklist
- `docs/data-versioning.md`: migration artifacts, lock semantics, and rollback protocol
- `docs/plugins/conformance.md`: plugin conformance and certification criteria
- `docs/install-guardrails.md`: install-time compatibility guardrails and postinstall behavior

## Runtime Summary

This repository now targets a single production CMS runtime with these rules:

- `data/` is the canonical content root
- `PageV2` is the canonical runtime page model
- CMS routes read and write through core services in `src/core`
- plugins integrate through `src/plugin-sdk` plus `src/core/plugins/host.ts`
- framework detection is adapter-based, with `nextjs` fully supported today

## Canonical Folders

```text
src/
  adapters/
  app/
  components/
  core/
  plugin-sdk/
  providers/
data/
docs/
```

## Current Public API

The package surface is exported from `src/index.ts`.

Primary entrypoints:

- `createCMS`
- `detectFramework`
- `registerPlugin`
- `createPlugin`
- `defineContentType`
- `defineField`
- `defineBlock`

## Notes on Legacy Material

Some older documents in `docs/` still describe earlier JSON page flows, `src/data`-first conventions, or `PageDefinitionSchema`-driven rendering. Treat those as archival until they are fully rewritten or removed. Use the files listed under `Start Here` as the current source of truth.
