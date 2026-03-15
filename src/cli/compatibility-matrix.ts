import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { dirname, join, resolve } from "path";
const MODULE_DIR = process.argv[1] ? dirname(resolve(process.argv[1])) : process.cwd();

export interface CompatibilityMatrix {
  nodeLtsRange: string;
  frameworks: Record<string, string>;
  adapters: Record<string, {
    framework: string;
    frameworkRange: string;
    adapterRange: string;
  }>;
  pluginEngineConstraints: {
    node: string;
    "json-cms": string;
  };
}

export interface CompatibilityIssue {
  code: string;
  message: string;
  remediation: string[];
}

interface Comparator {
  op: ">" | ">=" | "<" | "<=" | "=";
  major: number;
}

const DEFAULT_COMPATIBILITY_MATRIX: CompatibilityMatrix = {
  nodeLtsRange: ">=20 <21 || >=22 <23",
  frameworks: {
    next: ">=14 <16",
    astro: ">=4 <6",
    gatsby: ">=5 <6",
  },
  adapters: {
    "@upflame/adapter-nextjs": {
      framework: "next",
      frameworkRange: ">=14 <16",
      adapterRange: ">=1 <2",
    },
    "@upflame/adapter-astro": {
      framework: "astro",
      frameworkRange: ">=4 <6",
      adapterRange: ">=1 <2",
    },
    "@upflame/adapter-gatsby": {
      framework: "gatsby",
      frameworkRange: ">=5 <6",
      adapterRange: ">=1 <2",
    },
  },
  pluginEngineConstraints: {
    node: ">=20 <21 || >=22 <23",
    "json-cms": ">=1 <2",
  },
};

function majorOf(version: string): number | null {
  const parsed = version.replace(/^[^\d]*/, "").match(/^(\d+)/);
  if (!parsed) return null;
  return Number.parseInt(parsed[1], 10);
}

function parseRangeClause(rangeClause: string): Comparator[] {
  return rangeClause.split(/\s+/).filter(Boolean).map((part) => {
    const match = part.match(/^(>=|<=|>|<|=)?\s*(\d+)/);
    if (!match) {
      throw new Error(`Unsupported range comparator \"${part}\" in \"${rangeClause}\"`);
    }
    return {
      op: (match[1] as Comparator["op"] | undefined) ?? "=",
      major: Number.parseInt(match[2], 10),
    };
  });
}

function satisfiesClause(major: number, clause: string): boolean {
  return parseRangeClause(clause).every((comp) => {
    switch (comp.op) {
      case ">": return major > comp.major;
      case ">=": return major >= comp.major;
      case "<": return major < comp.major;
      case "<=": return major <= comp.major;
      case "=": return major === comp.major;
      default: return false;
    }
  });
}

function satisfiesMajor(version: string | undefined, range: string): boolean {
  if (!version) return false;
  const major = majorOf(version);
  if (major === null) return false;

  const clauses = range.split("||").map((item) => item.trim()).filter(Boolean);
  if (clauses.length === 0) return false;

  return clauses.some((clause) => satisfiesClause(major, clause));
}

function isComparableVersion(version: string | undefined): version is string {
  return typeof version === "string" && majorOf(version) !== null;
}

export async function loadCompatibilityMatrix(cwd = process.cwd()): Promise<CompatibilityMatrix> {
  const candidates = [
    join(cwd, "compatibility", "compat-matrix.json"),
    resolve(MODULE_DIR, "../../compatibility/compat-matrix.json"),
  ];

  const matrixPath = candidates.find((candidate) => existsSync(candidate));
  if (!matrixPath) {
    return DEFAULT_COMPATIBILITY_MATRIX;
  }

  const source = await readFile(matrixPath, "utf-8");
  return JSON.parse(source) as CompatibilityMatrix;
}

export interface CompatibilityCheckInput {
  matrix: CompatibilityMatrix;
  nodeVersion: string;
  framework?: { id: string; version?: string };
  dependencies?: Record<string, string>;
}

export function evaluateCompatibility(input: CompatibilityCheckInput): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];
  const { matrix, framework, dependencies = {}, nodeVersion } = input;

  if (!satisfiesMajor(nodeVersion, matrix.nodeLtsRange)) {
    issues.push({
      code: "COMPAT_NODE_UNSUPPORTED",
      message: `Node ${nodeVersion} is outside supported LTS range ${matrix.nodeLtsRange}.`,
      remediation: [
        `Switch Node to a compatible LTS release (${matrix.nodeLtsRange}).`,
        "If using nvm: nvm install --lts && nvm use --lts",
      ],
    });
  }

  const frameworkKey = framework?.id === "nextjs" ? "next" : framework?.id;
  if (frameworkKey && frameworkKey in matrix.frameworks) {
    const allowedRange = matrix.frameworks[frameworkKey];
    if (isComparableVersion(framework?.version) && !satisfiesMajor(framework.version, allowedRange)) {
      issues.push({
        code: "COMPAT_FRAMEWORK_UNSUPPORTED",
        message: `${frameworkKey}@${framework.version} is outside supported range ${allowedRange}.`,
        remediation: [
          `Install a supported ${frameworkKey} major version (${allowedRange}).`,
          "Then rerun: cms doctor",
        ],
      });
    }
  }

  for (const [adapterName, spec] of Object.entries(matrix.adapters)) {
    const adapterVersion = dependencies[adapterName];
    if (!isComparableVersion(adapterVersion)) continue;

    if (!satisfiesMajor(adapterVersion, spec.adapterRange)) {
      issues.push({
        code: "COMPAT_ADAPTER_VERSION_UNSUPPORTED",
        message: `${adapterName}@${adapterVersion} is outside supported adapter range ${spec.adapterRange}.`,
        remediation: [
          `Install a supported adapter version: npm install ${adapterName}@\"${spec.adapterRange}\"`,
        ],
      });
    }

    const hostVersion = dependencies[spec.framework];
    if (isComparableVersion(hostVersion) && !satisfiesMajor(hostVersion, spec.frameworkRange)) {
      issues.push({
        code: "COMPAT_ADAPTER_FRAMEWORK_MISMATCH",
        message: `${adapterName}@${adapterVersion} requires ${spec.framework} ${spec.frameworkRange}, but ${hostVersion} is installed.`,
        remediation: [
          `Align ${spec.framework} to ${spec.frameworkRange}: npm install ${spec.framework}@\"${spec.frameworkRange}\"`,
          `Or upgrade/downgrade ${adapterName} to a version compatible with ${hostVersion}.`,
        ],
      });
    }
  }

  const pluginNames = Object.keys(dependencies).filter((name) => name.startsWith("@upflame/plugin-"));
  if (pluginNames.length > 0) {
    const coreVersion = dependencies["@upflame/json-cms"] ?? dependencies["@upflame/cms-core"];

    if (!satisfiesMajor(nodeVersion, matrix.pluginEngineConstraints.node)) {
      issues.push({
        code: "COMPAT_PLUGIN_NODE_ENGINE",
        message: `Plugins require Node ${matrix.pluginEngineConstraints.node}, but current runtime is ${nodeVersion}.`,
        remediation: [
          `Use a supported Node LTS release (${matrix.pluginEngineConstraints.node}).`,
        ],
      });
    }

    if (isComparableVersion(coreVersion) && !satisfiesMajor(coreVersion, matrix.pluginEngineConstraints["json-cms"])) {
      issues.push({
        code: "COMPAT_PLUGIN_CORE_ENGINE",
        message: `Plugins require json-cms ${matrix.pluginEngineConstraints["json-cms"]}, but installed core is ${coreVersion}.`,
        remediation: [
          `Install compatible core: npm install @upflame/json-cms@\"${matrix.pluginEngineConstraints["json-cms"]}\"`,
          ...pluginNames.map((plugin) => `Reinstall plugin after core upgrade: npm install ${plugin}@latest`),
        ],
      });
    }
  }

  return issues;
}
