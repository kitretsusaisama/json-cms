/**
 * Plugin SDK — Semver utilities (zero-dependency)
 */

/** Parse a semver string into { major, minor, patch } */
function parse(v: string): { major: number; minor: number; patch: number } | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(v.trim().replace(/^[v^~]/, ""));
  if (!match) return null;
  return { major: parseInt(match[1], 10), minor: parseInt(match[2], 10), patch: parseInt(match[3], 10) };
}

function compare(a: string, b: string): -1 | 0 | 1 {
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return 0;
  if (pa.major !== pb.major) return pa.major > pb.major ? 1 : -1;
  if (pa.minor !== pb.minor) return pa.minor > pb.minor ? 1 : -1;
  if (pa.patch !== pb.patch) return pa.patch > pb.patch ? 1 : -1;
  return 0;
}

/**
 * Check if `version` satisfies `range`.
 * Supports:
 *  - `^1.2.3` (compatible range)
 *  - `~1.2.3` (patch range)
 *  - `>=1.2.3`
 *  - `>1.2.3`, `<2.0.0`, `<=2.0.0`, `=1.2.3`
 *  - `1.2.3` (exact)
 */
export function semverSatisfies(version: string, range: string): boolean {
  const v = parse(version);
  if (!v) return false;

  if (range.startsWith("^")) {
    const base = parse(range.slice(1));
    if (!base) return false;
    if (base.major === 0) {
      return (
        v.major === 0 &&
        v.minor === base.minor &&
        compare(version, range.slice(1)) >= 0
      );
    }
    return v.major === base.major && compare(version, range.slice(1)) >= 0;
  }

  if (range.startsWith("~")) {
    const base = parse(range.slice(1));
    if (!base) return false;
    return (
      v.major === base.major &&
      v.minor === base.minor &&
      compare(version, range.slice(1)) >= 0
    );
  }

  if (range.startsWith(">=")) return compare(version, range.slice(2)) >= 0;
  if (range.startsWith(">")) return compare(version, range.slice(1)) > 0;
  if (range.startsWith("<=")) return compare(version, range.slice(2)) <= 0;
  if (range.startsWith("<")) return compare(version, range.slice(1)) < 0;
  if (range.startsWith("=")) return compare(version, range.slice(1)) === 0;

  // Exact match
  return compare(version, range) === 0;
}
