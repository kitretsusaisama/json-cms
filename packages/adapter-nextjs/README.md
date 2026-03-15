# @upflame/adapter-nextjs

> Deprecated: migrate imports to `@upflame/adapters/nextjs`.

This package is kept as a compatibility layer and re-exports the legacy Next.js adapter surface.

## Migration

1. Replace imports:

```ts
// before
import { CMSProvider } from "@upflame/adapter-nextjs";

// after
import { CMSProvider } from "@upflame/adapters/nextjs";
```

2. Keep using the same exported symbols (`CMSProvider`, `useCMS`, `DebugPanel`, `PreviewBar`, `nextjsAdapterV1`).
3. Remove direct dependency on `@upflame/adapter-nextjs` after migration.

See `../../docs/migration.md` for the broader migration checklist.
