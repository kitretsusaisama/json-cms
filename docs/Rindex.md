# Runtime Index

Date: March 9, 2026

## Primary References

- `docs/Readme.md`: documentation landing page
- `docs/architecture.md`: canonical architecture
- `docs/audit-report.md`: repository audit and hardening summary
- `docs/migration.md`: migration plan for data roots, routes, and plugin APIs
- `docs/production-checklist.md`: deployment readiness checklist

## Canonical Runtime Decisions

- Use `data/` as the content root.
- Use `PageV2` as the runtime page composition model.
- Use `cmsContentRepository`, `componentCatalog`, and `pluginHost` from `src/core`.
- Use `src/plugin-sdk` for plugin authoring.
- Treat `src/boilerplate` as legacy support material, not the production runtime source of truth.
