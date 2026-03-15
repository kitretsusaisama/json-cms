# Package Boundaries

This workspace is split into explicit package boundaries:

- `@upflame/cms-core`: core domain contracts and content schemas.
- `@upflame/runtime`: runtime bootstrap and execution contracts.
- `@upflame/cli`: command and scaffolding orchestration.
- `@upflame/components`: framework-agnostic component contracts.
- `@upflame/adapters`: adapter contracts and framework integration boundaries.
- `@upflame/plugins`: plugin lifecycle boundaries.
- `@upflame/adapter-contract`: shared adapter interface contract consumed by adapter boundary packages.
- `@upflame/plugin-sdk`: plugin authoring SDK consumed by plugin boundary packages.

## Dependency graph

- `@upflame/cms-core` -> _(no internal deps)_
- `@upflame/runtime` -> `@upflame/cms-core`
- `@upflame/cli` -> `@upflame/runtime`, `@upflame/cms-core`
- `@upflame/components` -> `@upflame/runtime`, `@upflame/cms-core`
- `@upflame/adapters` -> `@upflame/adapter-contract`, `@upflame/runtime`, `@upflame/cms-core`
- `@upflame/plugins` -> `@upflame/plugin-sdk`, `@upflame/runtime`, `@upflame/cms-core`
