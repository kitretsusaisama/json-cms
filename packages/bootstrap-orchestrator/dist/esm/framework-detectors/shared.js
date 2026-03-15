function normalize(value) {
    return value.trim().toLowerCase();
}
function hasDependency(context, dep) {
    const key = normalize(dep);
    const dependencies = context.packageJson?.dependencies ?? {};
    const devDependencies = context.packageJson?.devDependencies ?? {};
    return key in dependencies || key in devDependencies;
}
function hasConfig(context, config) {
    const configs = new Set((context.configFiles ?? []).map(normalize));
    return configs.has(normalize(config));
}
function hasFolder(context, folder) {
    const folders = new Set((context.folders ?? []).map(normalize));
    return folders.has(normalize(folder));
}
function hasScript(context, script) {
    const scripts = context.packageJson?.scripts ?? {};
    const target = normalize(script);
    return Object.values(scripts).some((command) => normalize(command).includes(target));
}
function hasRuntimeImport(context, runtimeImport) {
    const imports = new Set((context.runtimeImports ?? []).map(normalize));
    return imports.has(normalize(runtimeImport));
}
function matchesSignal(kind, signal, context) {
    return ((kind === "dependency" && hasDependency(context, signal)) ||
        (kind === "config" && hasConfig(context, signal)) ||
        (kind === "folder" && hasFolder(context, signal)) ||
        (kind === "script" && hasScript(context, signal)) ||
        (kind === "runtime-import" && hasRuntimeImport(context, signal)));
}
export function buildDetectionResult(options) {
    const evidence = options.evidenceDefinitions.map((item) => {
        const candidates = item.anyOfSignals ?? (item.signal ? [item.signal] : []);
        const matched = candidates.some((signal) => matchesSignal(item.kind, signal, options.context));
        return {
            kind: item.kind,
            signal: candidates.join(" | "),
            weight: item.weight,
            matched,
        };
    });
    const matchedWeight = evidence.filter((item) => item.matched).reduce((total, item) => total + item.weight, 0);
    const totalWeight = evidence.reduce((total, item) => total + item.weight, 0) || 1;
    const score = Number((matchedWeight / totalWeight).toFixed(4));
    const conflicts = options.conflictDependencies.filter((dependency) => hasDependency(options.context, dependency));
    return {
        framework: options.framework,
        score,
        evidence,
        conflicts,
    };
}
//# sourceMappingURL=shared.js.map