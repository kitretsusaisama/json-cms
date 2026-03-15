# @upflame/install-guardrails

Lightweight install-time checks for `@upflame/json-cms` projects.

## What it validates

- Framework ↔ adapter compatibility (for example, `nextjs` requires `@upflame/adapter-nextjs`)
- Installed plugin compatibility ranges against core and adapter versions
- Missing runtime dependencies required by plugins

## CLI

```bash
npx jsoncms-install-guardrails
```

### Postinstall mode (non-destructive)

```bash
npx jsoncms-install-guardrails --postinstall
```

`--postinstall` reports issues but does not fail installation unless `--strict` is passed.

## CI / non-interactive overrides

- Disable all checks: `JSONCMS_GUARDRAILS=0`
- Fail on errors in postinstall mode: `JSONCMS_GUARDRAILS_STRICT=1`
- Force framework when auto-detection is ambiguous: `JSONCMS_GUARDRAILS_FRAMEWORK=nextjs`

## Example `postinstall` script

```json
{
  "scripts": {
    "postinstall": "jsoncms-install-guardrails --postinstall"
  }
}
```
