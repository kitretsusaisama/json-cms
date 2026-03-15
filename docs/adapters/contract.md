# Adapter Contract

## Adapter Lifecycle Hooks

All official adapters must implement the following lifecycle hooks:

1. `detect(context)`
   - Determines whether the adapter can operate in the target project.
   - Must return a confidence score and rationale.
2. `bootstrap(context)`
   - Initializes adapter-specific runtime settings.
   - Must not perform destructive writes.
3. `validate(config)`
   - Verifies adapter configuration before runtime start.
   - Must emit actionable diagnostics for failures.
4. `start(runtimeContext)`
   - Activates adapter runtime behavior.
   - Must be idempotent when invoked multiple times.
5. `shutdown(signal)`
   - Cleans up resources and flushes pending work.
   - Must complete within configured timeout budget.

## Framework Constraints

- Adapters are framework-scoped and must explicitly declare supported framework and version ranges.
- Adapters must not depend on undocumented framework internals.
- Adapter-side file mutations are restricted to declared generated paths.
- Any framework-specific fallback behavior must be deterministic and covered by tests.

## Compatibility Guarantees

Official adapters provide:

- **Semantic compatibility:** no breaking contract changes outside major versions.
- **Behavioral compatibility:** stable hook ordering and lifecycle semantics across minor/patch releases.
- **Config compatibility:** deprecated fields receive a migration path for at least one minor release.
- **Observability compatibility:** key lifecycle events remain emitted with stable event names.

## Change Management

Contract changes require:

- RFC or equivalent design record.
- Impact analysis for official adapters and ecosystem plugins.
- Updated conformance tests before merge.
