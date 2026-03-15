# @upflame/plugin-sdk

Plugin authoring SDK for the Upflame CMS ecosystem.

## Scope

This package contains the stable plugin authoring surface:

- `definePlugin`
- manifest validation
- plugin types
- semver and version helpers
- package-safe runtime utilities used by tests and local tooling

It intentionally does not expose core-owned sandbox wiring. That logic now lives with the CMS runtime.

## Usage

```ts
import { definePlugin } from "@upflame/plugin-sdk";

export default definePlugin({
  manifest: {
    name: "@acme/seo",
    version: "1.0.0",
    description: "SEO helpers",
    author: "Acme",
    cms: {}
  },
  lifecycle: {
    async onActivate(ctx) {
      ctx.logger.info("SEO plugin ready");
    }
  }
});
```
