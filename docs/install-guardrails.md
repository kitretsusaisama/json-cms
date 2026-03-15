# Install-time guardrails

`@upflame/install-guardrails` is a lightweight bootstrap checker for package installation and CI smoke checks.

## What is validated

1. **Framework + adapter compatibility**
   - Detects framework from project dependencies.
   - Validates required adapter packages are installed.
2. **Plugin manifest compatibility**
   - Reads plugin compatibility from `plugin.json` (`compatibility.adapters`, `compatibility.jsonCms`, `engines["json-cms"]`) and plugin `peerDependencies`.
   - Verifies compatibility against installed `@upflame/json-cms` (or `@upflame/cms-core`) and adapter versions.
3. **Actionable diagnostics**
   - Every mismatch prints clear remediation commands (`npm install ...`).

## Non-destructive postinstall behavior

Guardrails only read local manifests and installed package metadata; no files are written and no package mutations are performed.

Add this script in end-user projects:

```json
{
  "scripts": {
    "postinstall": "jsoncms-install-guardrails --postinstall"
  }
}
```

`--postinstall` is warning-first by default: it reports errors without failing install.

Use strict mode when you want install to fail on incompatibilities:

```bash
jsoncms-install-guardrails --postinstall --strict
```

## Disable / override for CI or non-interactive runs

- Disable all checks:

```bash
JSONCMS_GUARDRAILS=0 npm ci
```

- Force strict failures in postinstall mode:

```bash
JSONCMS_GUARDRAILS_STRICT=1 npm ci
```

- Override framework detection when dependency graphs are atypical:

```bash
JSONCMS_GUARDRAILS_FRAMEWORK=nextjs npm ci
```
