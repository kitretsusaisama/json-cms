# Migration Guide

Date: March 9, 2026
Scope: migrating the repository to the canonical Next.js-first data-driven CMS runtime.

## Goals

- move all production reads and writes to `data/`
- standardize runtime composition on `PageV2`
- replace ad hoc CMS API access with core services
- make the plugin SDK and plugin host the only supported plugin integration path

## 1. Data Root Migration

Canonical root:

```text
data/
  pages/
  blocks/
  seoData/
  settings/
  plugins/
```

Compatibility behavior during migration:

- the runtime reads `data/` first
- if content is missing there, it falls back to `src/data/`
- new writes go to `data/`

Migration steps:

1. Copy `src/data/pages/*` to `data/pages/`
2. Copy `src/data/blocks/*` to `data/blocks/`
3. Copy `src/data/seoData/*` to `data/seoData/`
4. Copy `src/data/settings/*` to `data/settings/`
5. Validate the rendered site against the canonical `data/` tree
6. Remove legacy `src/data/` reads after the final verification window

## 2. Page Schema Migration

Old runtime pattern:

- `PageDefinitionSchema`
- mixed page-model reads in routes and renderers

New runtime pattern:

- `CmsPageSchema` for persisted page documents
- `PageV2` for runtime composition
- `cmsContentRepository` as the single page and block access layer

Migration rule:

- any runtime code that previously consumed `PageDefinitionSchema` should read `CmsPageSchema` documents and convert through `pageToRuntime()`

## 3. Route Migration

Replace direct singleton or registry access with core services.

Use:

- `cmsContentRepository` for pages and blocks
- `componentCatalog` for component metadata
- `pluginHost` for plugin install and lifecycle APIs
- `requireCmsRole()` for CMS API authorization

## 4. Plugin Migration

Supported plugin authoring path:

- `src/plugin-sdk`
- `createPlugin()` or `definePlugin()`
- manifest-driven capabilities

Do not rely on:

- root-level duplicate SDK surfaces
- direct global registry mutation
- importing internal boilerplate plugin managers in production code

Plugin migration steps:

1. Move plugin manifests to the SDK-compatible shape
2. Register components through the sandboxed registry
3. Move runtime settings to `PluginConfigStore`
4. Route health checks through `onHealthCheck`
5. Verify compatibility ranges for Node and CMS versions

## 5. Validation Checklist

- pages load from `data/pages`
- blocks load from `data/blocks`
- page creation and update routes use normalized slugs
- plugin activation succeeds without leaking components or hooks on failure
- root layout and providers hydrate cleanly in the Next.js App Router

## 6. Adapter Package Migration

Adapter packages now resolve through `@upflame/adapters`.

- New Next.js import path: `@upflame/adapters/nextjs`
- Legacy path `@upflame/adapter-nextjs` is deprecated and only kept for compatibility.
- Use the adapter registry (`AdapterRegistry`) when selecting adapters by framework, version, and capability requirements.
