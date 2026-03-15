import path from "path";
import { runAutoBootstrap } from "./auto-bootstrap";

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function resolvePackageRoot(): string {
  const currentFile = process.argv[1] ? path.resolve(process.argv[1]) : process.cwd();
  return path.resolve(path.dirname(currentFile), "../../..");
}

async function main(): Promise<void> {
  if (isTruthy(process.env.JSONCMS_DISABLE_AUTO_BOOTSTRAP)) {
    return;
  }

  const packageRoot = resolvePackageRoot();
  const hostDir = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();

  // Skip when installing dependencies inside this monorepo/package itself.
  if (hostDir === packageRoot) {
    return;
  }

  const isCi = isTruthy(process.env.CI);
  if (isCi && !isTruthy(process.env.JSONCMS_FORCE_AUTO_BOOTSTRAP)) {
    return;
  }

  try {
    const result = await runAutoBootstrap({ hostDir });

    if (result.framework === "unknown") {
      return;
    }

    if (result.created.length > 0) {
      process.stdout.write(`[@upflame/json-cms] auto-bootstrap created: ${result.created.join(", ")}\n`);
    }

    for (const warning of result.warnings) {
      process.stdout.write(`[@upflame/json-cms] warning: ${warning}\n`);
    }
  } catch (error) {
    const strict = isTruthy(process.env.JSONCMS_STRICT_POSTINSTALL);
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[@upflame/json-cms] postinstall bootstrap failed: ${message}\n`);
    if (strict) {
      process.exit(1);
    }
  }
}

void main();
