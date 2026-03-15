# Plugin Conformance

## Baseline Conformance Checks

Every plugin must pass the following checks:

### Manifest Validation

- Manifest file is present and machine-parseable.
- Required metadata fields (name, id, version, entrypoint, capabilities) are populated.
- Declared runtime and adapter compatibility ranges are valid semver expressions.

### Version Validation

- Plugin version follows semantic versioning.
- Compatibility declarations include minimum supported host version.
- Breaking capability changes require major version increments.

### Capability Validation

- Declared capabilities map to documented host extension points.
- Capability permissions are least-privilege by default.
- Undeclared capability usage is rejected by host loader.

## Official Plugin Certification Criteria

A plugin is officially certified only when it has:

1. Passed manifest/version/capability validation in CI.
2. Passed compatibility tests against currently supported host versions.
3. Included installation, configuration, and rollback documentation.
4. Published support ownership and issue response SLA.
5. Completed security review for declared capabilities.

## Ongoing Compliance

- Certified plugins are revalidated on every host major/minor release.
- Certification can be suspended when compatibility or security regressions are detected.
