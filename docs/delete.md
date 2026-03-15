# Redundant/Legacy Files (to review and remove)

This list enumerates files that are no longer needed with the production JSON UI system. Review and remove after confirming there are no active references.

- src/types/page.ts
  - Reason: legacy type definitions pre‑V2. Current types live in `src/types/composer.ts` and `src/types/refs.ts`.

- scripts/generate-seo.js
  - Reason: SEO is now embedded via the `SEO` component instance in page JSON (`prepend`). No separate `data/seo/*` JSON required.
  - Action: If no other scripts rely on generated SEO files, remove.

- data/seo/** (all subpaths under `data/seo/`)
  - Reason: With SEO handled by `SEO` component, these JSON files are typically obsolete.
  - Caution: If other parts of the app read these (e.g., legacy routes or tests), migrate or delete accordingly.

- src/components/JsonPageRenderer.tsx
  - Reason: superseded by `src/components/renderer/JsonRendererV2.tsx`.

- Any `*.v2.json` files under `src/data/pages/` or `src/data/overlays/`
  - Reason: filenames are now non‑versioned (e.g., `home.json`).

- References in code to versioned paths or legacy SEO store utilities
  - Examples to search: `seo-store`, `PageDefinitionSchema`, `JsonPageRenderer`, `.v2.json`

Notes:
- Do not delete until you run a full typecheck and search to confirm zero references.
- Consider archiving removed files in a separate branch or directory for rollback.
