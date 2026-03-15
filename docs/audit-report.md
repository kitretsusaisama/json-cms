# CMS Audit Report

Date: March 9, 2026
Scope: Full repository audit with focus on the Next.js App Router CMS runtime, data model, plugin system, and production hardening.

## Executive Summary

The repository had drifted into multiple competing CMS surfaces. The main risks were duplicated runtime and SDK code, stale documentation, inconsistent data roots, broken CMS API integrations, and plugin loading paths that were too loosely defined for production use. The runtime error path around `Cannot read properties of undefined (reading 'call')` was already partially addressed by removing the `logger -> error-tracking` circular dependency, but the repository still had multiple architectural seams that could reintroduce similar instability.

This hardening pass standardizes the runtime around a single core, moves CMS APIs onto service DTOs, makes `data/` the canonical content root, introduces framework detection plus adapter scaffolding, and adds a stricter plugin host with isolated lifecycle execution.

## Findings

### Critical

- Duplicate CMS surfaces existed across `src/core`, `src/cms`, `src/lib`, `src/boilerplate`, and a duplicate root-level SDK path. This made it easy for routes and renderers to import incompatible registries or models.
- CMS API routes were bypassing a stable service layer and relying on patterns such as `getInstance()` and mismatched array-or-map assumptions. That created route fragility and made serialized API output inconsistent.
- The runtime content pipeline was mixing old and new schemas. `PageDefinitionSchema` and `PageV2` were both present, but only one should be authoritative at runtime.
- The plugin runtime lacked a single production host. Manifest-only capabilities, runtime activation, health checks, and dependency boundaries were not consistently enforced from one place.

### High

- Data roots were split between `data/` and `src/data/`. That created migration ambiguity and increased the risk of stale content reads during production deploys.
- Provider boundaries in the Next.js App Router were too loose. Several CMS-related providers behaved like application-singletons rather than a clean server-to-client handoff.
- Registry bootstrapping could re-register components repeatedly when files were evaluated more than once.
- Legacy docs still documented `PageDefinitionSchema`-first flows and database migration paths that no longer matched the current product goal.

### Medium

- Package metadata exported raw source-oriented surfaces instead of package-ready `dist/*` entrypoints.
- Security boundaries around CMS route input, plugin entry paths, and rich CMS payload sanitization were not centralized enough.
- The repo still contains a large `src/boilerplate` surface that is not the canonical production path but can still confuse future contributors.

## What Changed

- Added a canonical core content layer under `src/core/content` with schema contracts for content types, workflow, SEO, localization, media, fields, blocks, and pages.
- Added canonical data-root helpers so the runtime reads from `data/` first and falls back to `src/data/` only for migration compatibility.
- Rebuilt CMS API routes to use `cmsContentRepository`, `componentCatalog`, and `pluginHost` instead of direct registry or singleton access.
- Added framework detection and a Next.js-first adapter registry under `src/adapters`.
- Added a strict plugin host in `src/core/plugins/host.ts` with manifest normalization, compatibility checks, lifecycle control, timeout-wrapped activation, and isolated registry cleanup.
- Added a public package entrypoint at `src/index.ts` and aligned package exports to `dist/*` outputs.
- Consolidated cookie consent and provider wiring so App Router boundaries are more predictable.
- Removed the inline console-art script from the root layout and made language selection explicit from the server layout into client providers.

## Remaining Risks

- `package-lock.json` still needs to be regenerated against the updated `package.json` once dependency installation is available.
- The repository still includes legacy boilerplate modules and stale docs that are no longer the runtime source of truth. They should be pruned or clearly marked deprecated in a follow-up cleanup.
- Full production confidence still depends on running `npm install`, `npm run typecheck`, `npm run lint`, targeted unit tests, and `next build` on Node 20+.

## Recommended Release Gates

- Clean install on Node 20+
- `npm run typecheck`
- `npm run lint`
- `npm run test:unit`
- `npm run build`
- Manual CMS smoke test for pages, blocks, plugins, localization, and service worker registration
