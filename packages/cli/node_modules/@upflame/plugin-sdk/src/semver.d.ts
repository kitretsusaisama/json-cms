/**
 * Plugin SDK — Semver utilities (zero-dependency)
 */
/**
 * Check if `version` satisfies `range`.
 * Supports:
 *  - `^1.2.3` (compatible range)
 *  - `~1.2.3` (patch range)
 *  - `>=1.2.3`
 *  - `>1.2.3`, `<2.0.0`, `<=2.0.0`, `=1.2.3`
 *  - `1.2.3` (exact)
 */
export declare function semverSatisfies(version: string, range: string): boolean;
//# sourceMappingURL=semver.d.ts.map