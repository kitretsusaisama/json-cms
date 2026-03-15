# Data Versioning

## Migration Artifacts

Each data version change must include:

- A versioned migration specification (`from`, `to`, transformation rules).
- A deterministic migration script or transformer reference.
- Validation fixtures for pre/post migration samples.
- A migration report artifact with counts, warnings, and failures.

## Lock Semantics

- Data root carries a version lock indicating the currently active schema/data version.
- Writes must be blocked when lock version and runtime expected version differ.
- Lock updates are atomic and must include timestamp and actor metadata.

## Startup Enforcement

On startup, runtime must:

1. Read version lock.
2. Compare against runtime-supported version range.
3. Refuse write-capable startup when migration is required but not completed.
4. Emit clear diagnostics with next remediation command.

## Write-Time Enforcement

Before every mutating operation:

- Verify lock version remains unchanged during request lifecycle.
- Reject stale writers when version drift is detected.
- Log enforcement outcomes for auditability.

## Rollback Protocol

If migration or rollout fails:

1. Enter read-only protection mode.
2. Restore last known-good backup snapshot.
3. Re-apply prior version lock atomically.
4. Validate service health and data integrity checks.
5. Record incident and corrective actions in execution journal.
