# @upflame/json-cms

UpFlame JSON CMS is a Next.js-first content platform package with two supported onboarding paths:

1. Runtime injection into an existing app with `npm install @upflame/json-cms`
2. New project generation with `npx create-json-cms mysite`

Wave 1 focuses on production-hardening for Next.js + pnpm workspace release reliability.

## Install Method 1: Runtime Injection

```bash
npm install @upflame/json-cms
npm run dev
```

What happens in Wave 1:

- Postinstall bootstrap runs safely and idempotently for Next.js projects.
- Canonical config is generated as `cms.config.ts` (legacy `jsoncms.config.ts` still read with warning).
- Default structure is scaffolded when missing:
  - `cms/schema/page.ts`
  - `cms/plugins/index.ts`
  - `app/cms/page.tsx` (or `src/app/cms/page.tsx`)

Opt-out and safety controls:

- `JSONCMS_DISABLE_AUTO_BOOTSTRAP=1` disables bootstrap.
- `CI=true` skips bootstrap unless `JSONCMS_FORCE_AUTO_BOOTSTRAP=1`.
- `JSONCMS_STRICT_POSTINSTALL=1` makes bootstrap failure exit non-zero.

## Install Method 2: Project Generator

```bash
npm init create-json-cms mysite -- --framework next --mode blog --skip-install
cd mysite
npm install
npm run dev
```

Supported deterministic flags:

- `--framework next`
- `--mode <blog|marketing|headless>`
- `--plugins seo,analytics`
- `--skip-install`

Generated project includes:

- `cms.config.ts`
- `cms/schema/page.ts`
- `cms/plugins/index.ts`
- `/cms` route in Next.js App Router

## Workspace And Release

- Canonical workspace manager: `pnpm`
- Workspace file: `pnpm-workspace.yaml`
- Wave 1 release gate:

```bash
npm run ci:wave1
```

This runs:

- publish-manifest checks
- publish-material checks
- typecheck
- Wave 1 build targets
- Wave 1 test targets
- pack dry-run verification

## Publishing Surface (Wave 1)

Critical publishables verified in CI:

- `@upflame/json-cms`
- `create-json-cms`
- `@upflame/adapter-nextjs`
- `@upflame/installer-core`
- `@upflame/cli-utils`

## Documentation

- [Integration Guide](docs/integration-guide.md)
- [Engineering Program Plan](docs/engineering-program-plan.md)
- [Execution Journal](docs/execution-journal.md)
- [Release Publish Checklist](docs/release/package-publish-checklist.md)
- [Publish Materials](docs/release/publish-materials.md)
