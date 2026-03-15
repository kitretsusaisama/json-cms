# Changesets

This repository uses [Changesets](https://github.com/changesets/changesets) for coordinated workspace versioning and publishing.

## Local release workflow

1. Add a changeset describing package impacts:
   ```bash
   npx changeset
   ```
2. Apply version bumps across the workspace:
   ```bash
   npm run release:version
   ```
3. Review generated changelogs and commit.
4. Publish updated packages:
   ```bash
   npm run release:publish
   ```

## CI automation

The release workflow runs `changesets/action` on `main` and either:

- opens/updates a "Version Packages" PR when pending changesets exist, or
- publishes packages when version updates are already merged.
