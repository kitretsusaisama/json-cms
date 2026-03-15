# Publish Materials (Wave 1)

This document defines the required publish collateral for package and scaffolding releases.

## Critical Publishables

- `@upflame/json-cms`
- `create-json-cms`
- `@upflame/adapter-nextjs`
- `@upflame/installer-core`
- `@upflame/cli-utils`

## Required Artifacts Per Package

- `package.json` with stable `name`, `version`, `description`
- `files` includes `dist` and `README.md`
- `prepack` script present
- built outputs:
  - `dist/esm`
  - `dist/cjs`
  - `dist/types`
- compiled runtime artifacts must not contain unresolved internal alias specifiers like `@/` in executable/module imports

## Scaffolding Package Requirements (`create-json-cms`)

- `bin.create-json-cms` points to built CLI entry
- `files` includes `templates`
- templates include baseline frameworks:
  - Next.js:
  - `app/cms/page.tsx`
  - `cms/schema/page.ts`
  - `cms/plugins/index.ts`
  - Astro:
  - `src/pages/cms.astro`
  - `cms/schema/page.ts`
  - `cms/plugins/index.ts`
  - Remix:
  - `app/routes/cms.tsx`
  - `cms/schema/page.ts`
  - `cms/plugins/index.ts`
- `cms.config.ts` generation path for all supported templates

## Verification Commands

Run before publish:

```bash
npm run check:no-file-deps
npm run check:publish-materials
npm run build:wave1
npm run test:wave1
npm run pack:verify
```

Single command:

```bash
npm run ci:wave1
```

## Notes

- Next.js, Astro, and Remix scaffolding are supported lanes in the current release hardening wave.
- Legacy config filename `jsoncms.config.ts` remains dual-read during migration window.
