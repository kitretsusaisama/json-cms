# Package Publish Checklist

Use this checklist before every package publish.

Reference:

- `docs/release/publish-materials.md`
- `docs/release/publishing-guide.md`
- `docs/release/scaffolding-package-guide.md`

## Publish Gates

### 1) Exports Validation

- Confirm `package.json` exports map contains every intended public entrypoint.
- Verify CJS/ESM/type paths resolve to built artifacts.
- Ensure no private/internal modules are accidentally exported.

### 2) Artifact Checks

- Run clean build and verify `dist/` contains expected structure.
- Confirm package tarball includes only intended files (`npm pack --dry-run`).
- Validate type declarations are emitted for all exported modules.
- Run `pnpm run check:publish-materials` for publish collateral validation.

### 3) Smoke Fixtures

- Execute fixture install in a clean project.
- Validate runtime boot for at least one supported framework fixture.
- Validate adapter/plugin loading for baseline fixtures.
- Validate `create-json-cms` scaffold output contains `cms.config.ts`, `cms/schema/`, `cms/plugins/`, and `/cms` route.

### 4) Changelog Hygiene

- Ensure release notes summarize user-visible changes.
- Confirm breaking changes are explicitly labeled.
- Link migration guidance for changed contracts or data formats.

## Final Sign-off

Publish only when:

- All gates above pass.
- CI is green on target commit.
- Version/tag aligns with semantic versioning policy.
