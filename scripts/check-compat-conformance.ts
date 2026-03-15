import { readFile } from "fs/promises";
import { evaluateCompatibility, loadCompatibilityMatrix } from "../src/cli/compatibility-matrix";

async function main(): Promise<void> {
  const matrix = await loadCompatibilityMatrix(process.cwd());
  const pkg = JSON.parse(await readFile("package.json", "utf-8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const dependencies = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const frameworkVersion = dependencies.next;
  const issues = evaluateCompatibility({
    matrix,
    nodeVersion: process.version,
    framework: frameworkVersion ? { id: "nextjs", version: frameworkVersion } : undefined,
    dependencies,
  });

  if (issues.length > 0) {
    console.error("Compatibility conformance failed:");
    for (const issue of issues) {
      console.error(` - [${issue.code}] ${issue.message}`);
      console.error(`   Remediation: ${issue.remediation.join(" ")}`);
    }
    process.exit(1);
  }

  console.log("Compatibility conformance passed.");
}

main().catch((error) => {
  console.error(`Compatibility conformance errored: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
