# Package Ecosystem Audit

Date: March 9, 2026
Status: incremental extraction in progress

## Current Repository Shape

The current repository already contains most of the logical layers needed for a package ecosystem:

- `src/core`: runtime services, content, plugin host, HTTP helpers, and framework bootstrap
- `src/plugin-sdk`: plugin authoring surface plus a few runtime-coupled helpers
- `src/adapters`: capability detection and adapter resolution
- `src/cli`: intelligent install and project wiring flows
- `src/components/cms`: the existing Next.js-facing provider and editor UI boundary

That means the refactor is an extraction problem, not a greenfield architecture problem.

## Source Of Truth Today

The root package remains the compatibility layer and still owns the production runtime.

- Runtime host: `src/core`
- Public umbrella exports: `src/index.ts`
- Next.js integration host: `src/app`, `src/providers`, `src/components`
- Installer logic: `src/cli`

New monorepo lanes now exist for:

- `apps/`
- `packages/`
- `plugins/`
- `templates/`
- `tooling/`

Workspace packages are introduced around boundaries that are already clean enough to publish independently:

- `packages/plugin-sdk`
- `packages/adapter-nextjs`
- `packages/schema-engine`
- `packages/cli-utils`

Generator and example apps:

- `apps/create-json-cms`
- `apps/example-next-app`

Scaffolded extraction targets:

- `packages/cms-core`
- `packages/cli`
- `packages/runtime`

## Dependency Map

### Stable boundaries

- `src/plugin-sdk/types.ts` is framework-agnostic and package-ready.
- `src/plugin-sdk/define-plugin.ts` is now free of runtime construction logic.
- `src/components/cms/*` is already a self-contained Next.js adapter surface.
- `src/adapters/project-detection.ts` is a reusable capability detector.

### Current coupling risks

- `src/core/plugins/host.ts` still depends on runtime implementations from `src/plugin-sdk` such as config store, event bus, health monitor, and version helpers.
- `src/core/content/service.ts` still imports app-local types and utilities.
- `src/cli/dx.ts` reaches into app/runtime code paths beyond installation concerns, so it cannot be extracted safely as-is.
- There is legacy duplication between top-level `plugin-sdk/` and `src/plugin-sdk/`.

## Circular Dependency Notes

The largest package-level cycle was between the SDK and the core runtime:

- core plugin host needed sandbox helpers from the SDK
- SDK sandbox implementation needed core registries

That cycle is now reduced by moving sandbox ownership under `src/core/plugins/sandbox.ts` and keeping the SDK file as a compatibility re-export.

Framework compatibility checks were also decoupled from adapter detection by introducing `src/core/runtime/framework-context.ts`, so the plugin host no longer imports adapter detection at runtime.

## Extraction Strategy

### Phase 1: publish clean boundaries

- extract `plugin-sdk` as the canonical authoring package
- extract `adapter-nextjs` as the canonical framework UI boundary
- keep the root package working as the compatibility umbrella

### Phase 2: move framework-agnostic runtime

- extract content schemas and registries into `packages/cms-core`
- move plugin host runtime services behind relative imports
- remove `@/` alias usage from package-bound core files

### Phase 3: move installer and marketplace flows

- split `src/cli/dx.ts` into install-only and runtime-only command groups
- extract `init`, `add`, and detection flows into `packages/cli`
- keep data validation commands local until they stop importing app-only modules

## What Was Implemented In This Pass

- workspace-ready package scaffolding under `packages/`
- a buildable `plugin-sdk` package using copied package-safe sources
- a buildable `adapter-nextjs` package around the existing CMS provider UI
- a buildable `schema-engine` package for content contracts
- a reusable `cli-utils` package for project generation
- a working `create-json-cms` generator app plus a Next.js starter template
- starter plugin workspace packages for `pages`, `seo`, and `media`
- package build scripts and workspace metadata at the root
- explicit docs for what is extracted versus still hosted in `src/`

## Honest Gaps

The repository is not fully package-extracted yet.

- `cms-core` is scaffolded but still rooted in `src/core`
- `cli` is scaffolded but the install/runtime command split is not complete
- `create-json-cms` still reads its starter template from the monorepo root, so template bundling is the next publishability step
- root compatibility exports still point at `src/*`
- top-level `plugin-sdk/` remains as legacy duplication to clean up later

## Next Safe Steps

1. Move `src/core/content/schemas.ts` and component catalog contracts into `packages/cms-core`.
2. Extract install-only CLI commands into `packages/cli` and leave validation/plan commands in the root until their dependencies are reduced.
3. Repoint the root package to consume the new workspace packages instead of duplicating their source.
4. Delete the legacy top-level `plugin-sdk/` tree once the root compatibility layer is switched over.
