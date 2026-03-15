# Scaffolding Package Guide (`create-json-cms`)

This guide defines release and quality requirements for the scaffolding package.

## Package Contract

Package:

- `create-json-cms`

Guaranteed framework lanes:

- Next.js
- Astro
- Remix

## CLI Contract

Primary commands:

- `npx create-json-cms mysite --framework <next|astro|remix> --mode <blog|marketing|headless>`
- `npx create-json-cms add --dir . --framework <next|astro|remix>`
- `npx create-json-cms add-plugin <plugin-name>`

Deterministic automation flags:

- `--framework`
- `--mode`
- `--plugins`
- `--skip-install`
- `--yes`

## Generated Structure Contract

Always generated:

- `cms.config.ts`
- `cms/schema/page.ts`
- `cms/plugins/index.ts`

Framework route targets:

- Next.js: `app/cms/page.tsx` or `pages/cms.tsx`
- Astro: `src/pages/cms.astro`
- Remix: `app/routes/cms.tsx`

## Publish Artifact Requirements

In `package.json`:

- `files` must include `dist`, `templates`, `README.md`
- `bin.create-json-cms` must point to built `dist` entry
- `prepack` must run build

Template minimums:

- `templates/nextjs/...`
- `templates/astro/...`
- `templates/remix/...`

## Verification Commands

Run before publish:

```bash
pnpm --filter create-json-cms test
pnpm run check:publish-materials
pnpm run pack:verify
```

For full release confidence:

```bash
pnpm run ci:wave1
```
