# @upflame/runtime

Deterministic startup contracts that translate project configuration into a boot sequence.

## Ownership

- **Primary owner:** Runtime Infrastructure team.
- **Change review required from:** Core Platform maintainers for any change affecting shared lifecycle stages.

## Public API boundary

This package only exposes runtime bootstrap contracts through `src/index.ts`:

- `bootstrapRuntime(options)`
- `RuntimeBootstrapOptions`, `RuntimeBootstrapResult`, and `RuntimeStage` types

### Out of scope

- Core content/component/plugin contracts (belong in `@upflame/cms-core`).
- Project scaffolding and install UX (belong in `@upflame/cli`).
- Framework adapters and rendering integrations.
