# create-json-cms

Scaffolding and integration CLI for UpFlame JSON CMS.

## Quick Start

Create a new CMS app (Next.js, Astro, or Remix):

```bash
npx create-json-cms mysite --framework next --mode marketing
cd mysite
npm run dev
```

Integrate into an existing project:

```bash
npx create-json-cms add --dir .
```

Add a plugin:

```bash
npx create-json-cms add-plugin seo
```

## Commands

- `create-json-cms init [name]`
- `create-json-cms add [--dir <path>]`
- `create-json-cms add-plugin <plugin-name>`

## Deterministic Flags

- `--framework next`
- `--framework astro`
- `--framework remix`
- `--mode <blog|marketing|headless>`
- `--plugins <comma-separated>`
- `--skip-install`
- `--yes`

## Output Contract

Generated projects and integrations align to:

- `cms.config.ts` (canonical)
- `cms/schema/`
- `cms/plugins/`
- `/cms` route for supported frameworks:
  - Next.js: `app/cms/page.tsx` or `pages/cms.tsx`
  - Astro: `src/pages/cms.astro`
  - Remix: `app/routes/cms.tsx`

Legacy config support:

- `jsoncms.config.ts` is still recognized as a fallback with deprecation warning.

## Detection Behavior

Framework selection precedence:

1. Explicit `--framework`
2. Project intelligence multi-signal detection
3. Safe fallback to Next.js for unsupported detections
