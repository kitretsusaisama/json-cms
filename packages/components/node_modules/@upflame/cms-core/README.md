# @upflame/cms-core

Framework-agnostic core contracts for content, component, plugin, and schema orchestration.

## Ownership

- **Primary owner:** Core Platform team.
- **Change review required from:** Runtime and Adapter maintainers for cross-package contract updates.

## Public API boundary

This package only exposes stable, framework-neutral primitives through `src/index.ts`:

- `CMS_CORE_VERSION`
- `createCmsCore(options)`
- `CmsCore`, `CmsCoreOptions`, and `CmsCoreFeature` types

### Out of scope

- Framework bootstrapping concerns (belong in `@upflame/runtime`).
- CLI workflows and installation logic (belong in `@upflame/cli`).
- Adapter-specific integrations (belong in adapter packages).
