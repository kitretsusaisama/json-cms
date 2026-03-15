# Publishing Guide (Wave 2)

This guide is the operator manual for releasing UpFlame packages from this workspace.

## Scope

Critical publishables:

- `@upflame/json-cms`
- `create-json-cms`
- `@upflame/adapter-nextjs`
- `@upflame/installer-core`
- `@upflame/cli-utils`

## Preconditions

- Node `>=20`
- `pnpm` workspace install completed
- Auth configured for npm publish (`NPM_TOKEN`) if publishing from CI

## Local Release Flow

1. Install and sync:

```bash
pnpm install --frozen-lockfile
```

2. Run release gates:

```bash
pnpm run ci:wave1
```

3. Validate docs and release collateral:

```bash
pnpm run check:docs
pnpm run check:publish-materials
```

4. Prepare version bumps:

```bash
pnpm run release:version
```

5. Publish:

```bash
pnpm run release:publish
```

## CI Release Flow

Release workflow:

- [release-packages.yml](/C:/Users/Victo/Downloads/json-cms-main%20(1)/json-cms-main/.github/workflows/release-packages.yml)

Required stages:

- `check:no-file-deps`
- `check:publish-materials`
- `build:wave1`
- `test:wave1`
- `pack:verify`

Only publish after all required stages pass.

## Rollback Guidance

- Do not force-publish over an existing version.
- Cut a new patch version with corrective changes.
- Re-run full release gates before republishing.
