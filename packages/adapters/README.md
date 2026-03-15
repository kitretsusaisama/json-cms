# @upflame/adapters

Adapter registry and framework entrypoints for framework integrations.

## Framework Entry Points

- `@upflame/adapters/nextjs`
- `@upflame/adapters/astro`
- `@upflame/adapters/gatsby`

## Registry

Use `AdapterRegistry` to resolve adapters by framework id/version and required capability set.

```ts
import { adapterRegistry } from "@upflame/adapters";

const adapter = adapterRegistry.resolve({
  framework: "nextjs",
  version: "15.2.0",
  requiredCapabilities: ["edge", "preview"],
});
```

### Version Range Support

`satisfiesVersion()` currently supports:

- exact versions (`1.2.3`)
- `>=` (`>=1.2.3`)
- caret ranges (`^1.2.3`)
- tilde ranges (`~1.2.3`)

Invalid or unsupported semver input returns `false`.

### Capability Matrixes

- `capabilityMatrix()` returns `Record<adapterId, capabilities[]>`.
- `capabilityMatrixByFramework()` returns `Record<framework, capabilities[][]>` and preserves multiple descriptors per framework.

## Shared Build/Test Templates

Scaffold templates for framework adapters live under:

- `templates/build.template.json`
- `templates/test.template.ts`
