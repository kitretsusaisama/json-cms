# @upflame/cli

CLI parsing and command-contract surface for installer and marketplace tooling.

## Ownership

- **Primary owner:** Developer Experience team.
- **Change review required from:** Runtime and Core maintainers when command contracts influence boot/runtime behavior.

## Public API boundary

This package currently exposes a minimal stable command parsing surface through `src/index.ts`:

- `parseCliCommand(argv, context)`
- `CliCommandContext` and `CliCommandResult` types

### Out of scope

- Framework runtime lifecycle code (belongs in `@upflame/runtime`).
- Content/schema/component contracts (belong in `@upflame/cms-core`).
- App-local validation commands that are still implemented in the root repository CLI.
