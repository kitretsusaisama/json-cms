#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
function parseOptions(argv) {
    const out = {
        postinstall: false,
        errors: [],
    };
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === "--postinstall") {
            out.postinstall = true;
            continue;
        }
        if (token === "--strict") {
            out.strict = true;
            continue;
        }
        if (token.startsWith("--framework=")) {
            const value = token.slice("--framework=".length);
            if (!value)
                out.errors.push("Missing value for --framework.");
            else
                out.framework = value;
            continue;
        }
        if (token === "--framework") {
            const value = argv[i + 1];
            if (!value || value.startsWith("--")) {
                out.errors.push("Missing value for --framework.");
            }
            else {
                out.framework = value;
                i += 1;
            }
            continue;
        }
        if (token.startsWith("--adapter=")) {
            const value = token.slice("--adapter=".length);
            if (!value)
                out.errors.push("Missing value for --adapter.");
            else
                out.adapter = value;
            continue;
        }
        if (token === "--adapter") {
            const value = argv[i + 1];
            if (!value || value.startsWith("--")) {
                out.errors.push("Missing value for --adapter.");
            }
            else {
                out.adapter = value;
                i += 1;
            }
        }
    }
    return out;
}
const parsed = parseOptions(process.argv.slice(2));
if (parsed.errors.length > 0) {
    for (const error of parsed.errors) {
        console.error(`✖ [GUARDRAIL_CLI_ARGS_INVALID] ${error}`);
    }
    process.exit(2);
}
const report = (0, index_1.runInstallGuardrails)({
    postinstall: parsed.postinstall,
    strict: parsed.strict,
    framework: parsed.framework,
    adapter: parsed.adapter,
});
for (const diagnostic of report.diagnostics) {
    const prefix = diagnostic.level === "error" ? "✖" : diagnostic.level === "warning" ? "⚠" : "•";
    console.error(`${prefix} [${diagnostic.code}] ${diagnostic.message}`);
    for (const command of diagnostic.remediation ?? []) {
        console.error(`    ↳ ${command}`);
    }
}
if (report.diagnostics.length === 0) {
    console.log("✓ json-cms install guardrails: all compatibility checks passed.");
}
if (report.shouldFail) {
    process.exit(1);
}
//# sourceMappingURL=cli.js.map