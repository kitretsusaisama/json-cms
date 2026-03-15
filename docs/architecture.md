# CMS Architecture

Date: March 9, 2026
Status: Next.js-first runtime, framework-adaptive foundation

## Canonical Structure

```text
src/
  adapters/
    index.ts
    types.ts
  app/
  components/
  core/
    cms.ts
    components/
    content/
    http/
    plugins/
  plugin-sdk/
  providers/
data/
docs/
```

## Runtime Principles

- `data/` is the canonical content and configuration root.
- `src/data/` is supported only as a migration fallback during the transition period.
- `PageV2` is the only runtime page composition model.
- CMS APIs return DTOs built from core services, not internal registries or singleton instances.
- Plugins interact with the CMS only through the SDK plus the plugin host.

## Core Modules

### `src/core/content`

Owns the content model and file-backed repository.

- `paths.ts`: resolves canonical and fallback data roots
- `schemas.ts`: Zod contracts for pages, blocks, content types, workflow, SEO, media, localization, and permissions
- `service.ts`: normalization, runtime conversion, repository CRUD, and block usage queries

### `src/core/components`

Owns the component catalog.

- Core components register once into a shared catalog.
- Plugin and manifest components are isolated by plugin id.
- JSON-schema prop validation is centralized here.

### `src/core/plugins`

Owns plugin lifecycle and hook isolation.

- `host.ts`: install, activate, deactivate, uninstall, health, dependencies, manifest validation, compatibility checks
- `hook-registry.ts`: ordered plugin hook execution with per-plugin cleanup

### `src/adapters`

Owns framework auto-detection and runtime bootstrap.

- `nextjs`: production-ready
- `astro`, `gatsby`, `remix`, `vite`: scaffolded adapters with explicit non-production status

### `src/plugin-sdk`

Owns the public plugin authoring surface.

- `createPlugin` and `definePlugin`
- config store
- event bus
- plugin logger
- sandboxed registry
- version and manifest helpers

## Request Flow

1. Next.js App Router receives the request.
2. Server layout resolves language and initializes the client provider boundary.
3. CMS APIs authenticate with `requireCmsRole` and delegate to core services.
4. Content resolution loads from `data/` first, then legacy `src/data/` if needed.
5. Pages and blocks normalize into `PageV2` plus runtime component records.
6. Registered core and plugin components render through the shared component catalog.

## Plugin Contract

Plugins declare:

- `id`
- `version`
- `compatibility`
- `capabilities`
- optional lifecycle hooks

Supported lifecycle hooks:

- `onInstall`
- `onActivate`
- `onDeactivate`
- `onUninstall`
- `onUpgrade`
- `onHealthCheck`

Plugin protections:

- entry path must stay inside the plugin root
- lifecycle execution is timeout-wrapped
- registry cleanup is automatic on deactivation or activation failure
- plugin components and hooks are namespaced by plugin id

## Next.js Boundary Rules

- `src/app/layout.tsx` stays server-first and passes `lang` into the client provider wrapper.
- `src/providers/index.tsx` is the single top-level client provider boundary.
- browser-only logic stays inside client components such as service worker registration.
- inline layout scripts should remain CSP-safe and minimal.
