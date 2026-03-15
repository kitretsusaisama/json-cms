import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const packageDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const constName = process.argv[3] ?? "PACKAGE_VERSION";
const outputFile = process.argv[4]
  ? path.resolve(process.argv[4])
  : path.join(packageDir, "src", "version.ts");

const packageJson = JSON.parse(readFileSync(path.join(packageDir, "package.json"), "utf8"));

writeFileSync(outputFile, `export const ${constName} = ${JSON.stringify(packageJson.version)};\n`);
