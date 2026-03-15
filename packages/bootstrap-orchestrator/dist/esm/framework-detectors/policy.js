const defaultPolicy = {
    confidenceThreshold: 0.8,
    closeScoreDelta: 0.06,
};
export function selectFramework(detections, options = {}) {
    const policy = { ...defaultPolicy, ...options.policy };
    const ranking = [...detections].sort((a, b) => (b.score === a.score ? a.framework.localeCompare(b.framework) : b.score - a.score));
    if (ranking.length === 0) {
        return {
            outcome: "failed",
            ranking,
            reason: "low-confidence",
            message: "No framework candidates were detected. Use --framework to override.",
        };
    }
    if (options.overrideFramework) {
        const match = ranking.find((result) => result.framework === options.overrideFramework);
        if (!match) {
            return {
                outcome: "failed",
                ranking,
                reason: "unknown-override",
                message: `Unknown framework override: ${options.overrideFramework}.`,
            };
        }
        return {
            outcome: "selected",
            framework: match.framework,
            reason: "override",
            ranking,
        };
    }
    const [top, second] = ranking;
    const closeCandidates = ranking.filter((candidate) => top.score - candidate.score <= policy.closeScoreDelta);
    const hasCloseScores = closeCandidates.length > 1 && second !== undefined;
    if (hasCloseScores) {
        if (options.interactive !== false && !options.ci) {
            return {
                outcome: "disambiguate",
                candidates: closeCandidates,
                ranking,
                reason: "close-scores",
            };
        }
        return {
            outcome: "failed",
            ranking,
            reason: "ci-requires-override",
            message: "Framework detection is ambiguous in non-interactive mode. Re-run with --framework <name>.",
        };
    }
    if (top.score >= policy.confidenceThreshold) {
        return {
            outcome: "selected",
            framework: top.framework,
            reason: "auto",
            ranking,
        };
    }
    return {
        outcome: "failed",
        ranking,
        reason: options.ci ? "ci-requires-override" : "low-confidence",
        message: options.ci
            ? "Framework confidence is below threshold in CI. Re-run with --framework <name>."
            : "Framework confidence is below threshold. Re-run interactively or pass --framework.",
    };
}
//# sourceMappingURL=policy.js.map