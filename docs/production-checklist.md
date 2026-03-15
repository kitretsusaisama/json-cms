# Production Checklist

Date: March 9, 2026

## Build and Runtime

- Use Node 20 or newer.
- Run a clean dependency install after regenerating the lockfile.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run test:unit`.
- Run `npm run build`.

## CMS Data

- Confirm `data/` contains the canonical pages, blocks, settings, and SEO data.
- Confirm no required production content remains only under `src/data/`.
- Review page and block workflow states before publishing.

## Plugin Safety

- Verify each installed plugin declares compatibility for the active framework.
- Verify plugin entrypoints stay within the plugin root.
- Test plugin activation, deactivation, reinstall, and health endpoints.
- Confirm plugin activation failures clean up registered components and hooks.

## Next.js App Router

- Verify the root layout remains server-safe.
- Verify client-only logic stays behind client component boundaries.
- Verify language selection and cookie consent hydrate without warnings.
- Verify service worker registration is client-gated.

## Security

- Review CMS API token handling for production.
- Replace development bearer tokens with a real secret or session-backed auth layer.
- Confirm CMS input sanitization on rich payloads.
- Review plugin install paths and allowed plugin sources.

## Release Decision

Do not ship until the install, typecheck, lint, unit test, and Next.js build steps all pass on the production target environment.
