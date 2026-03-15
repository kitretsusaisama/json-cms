# Adapter Package Migration: `@upflame/adapter-nextjs` → `@upflame/adapters/nextjs`

## Status

`@upflame/adapter-nextjs` is deprecated and maintained only for backwards compatibility.

## Recommended Replacement

Use `@upflame/adapters/nextjs` for all new integrations.

## Why

- Unified adapter discovery and capability metadata now live in `@upflame/adapters`.
- Next.js, Astro, and Gatsby adapter scaffolds share build/test templates.
- Future framework adapters will be discoverable through the adapter registry.
