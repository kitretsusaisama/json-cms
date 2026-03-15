import { access, mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export interface AutoBootstrapOptions {
  hostDir: string;
  dryRun?: boolean;
}

export interface AutoBootstrapResult {
  framework: "nextjs" | "astro" | "remix" | "unknown";
  packageManager: "pnpm" | "yarn" | "bun" | "npm";
  created: string[];
  skipped: string[];
  warnings: string[];
}

const CMS_APP_ROUTE_FILE = `export default function CmsPage(): JSX.Element {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>UpFlame CMS</h1>
      <p>CMS bootstrap is active. Configure content in <code>cms/</code> and <code>cms.config.ts</code>.</p>
    </main>
  );
}
`;

const CMS_PAGES_ROUTE_FILE = `export default function CmsPage(): JSX.Element {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>UpFlame CMS</h1>
      <p>CMS bootstrap is active. Configure content in <code>cms/</code> and <code>cms.config.ts</code>.</p>
    </main>
  );
}
`;

const CMS_ASTRO_ROUTE_FILE = `---
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>UpFlame CMS</title>
  </head>
  <body>
    <main style="padding: 2rem; font-family: system-ui, sans-serif;">
      <h1>UpFlame CMS</h1>
      <p>CMS bootstrap is active. Configure content in <code>cms/</code> and <code>cms.config.ts</code>.</p>
    </main>
  </body>
</html>
`;

const CMS_REMIX_ROUTE_FILE = `import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [{ title: "UpFlame CMS" }];

export default function CmsRoute(): JSX.Element {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>UpFlame CMS</h1>
      <p>CMS bootstrap is active. Configure content in <code>cms/</code> and <code>cms.config.ts</code>.</p>
    </main>
  );
}
`;

function cmsConfigTemplate(framework: Exclude<AutoBootstrapResult["framework"], "unknown">): string {
  return `export default {
  framework: "${framework}",
  preset: "marketing",
  plugins: [],
  content: {
    types: []
  }
};
`;
}

const CMS_SCHEMA_FILE = `export default {
  name: "page",
  fields: [
    { name: "title", type: "string", required: true },
    { name: "slug", type: "string", required: true },
    { name: "content", type: "richtext" }
  ]
} as const;
`;

const CMS_PLUGINS_FILE = "export const cmsPlugins = [] as const;\n";

interface NextRouteTarget {
  kind: "app" | "pages";
  dir: string;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function detectPackageManager(hostDir: string): Promise<AutoBootstrapResult["packageManager"]> {
  const searchRoots = ancestorChain(hostDir);

  for (const candidate of searchRoots) {
    if (await exists(path.join(candidate, "pnpm-lock.yaml"))) return "pnpm";
  }
  for (const candidate of searchRoots) {
    if (await exists(path.join(candidate, "yarn.lock"))) return "yarn";
  }
  for (const candidate of searchRoots) {
    if (await exists(path.join(candidate, "bun.lockb")) || await exists(path.join(candidate, "bun.lock"))) return "bun";
  }

  return "npm";
}

async function ensureFile(
  targetPath: string,
  content: string,
  result: AutoBootstrapResult,
  hostDir: string,
  dryRun = false
): Promise<void> {
  const relative = path.relative(hostDir, targetPath).replace(/\\/g, "/");
  if (await exists(targetPath)) {
    result.skipped.push(relative);
    return;
  }

  if (!dryRun) {
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, "utf-8");
  }
  result.created.push(relative);
}

function findNextRouteTarget(hostDir: string): NextRouteTarget {
  const appCandidates = [path.join(hostDir, "src", "app"), path.join(hostDir, "app")];
  for (const candidate of appCandidates) {
    if (existsSync(candidate)) {
      return { kind: "app", dir: candidate };
    }
  }

  const pagesCandidates = [path.join(hostDir, "src", "pages"), path.join(hostDir, "pages")];
  for (const candidate of pagesCandidates) {
    if (existsSync(candidate)) {
      return { kind: "pages", dir: candidate };
    }
  }

  // Default to App Router structure when no route directory can be inferred.
  return { kind: "app", dir: path.join(hostDir, "app") };
}

function findAstroPagesDir(hostDir: string): string {
  const candidates = [path.join(hostDir, "src", "pages"), path.join(hostDir, "pages")];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return path.join(hostDir, "src", "pages");
}

function findRemixRoutesDir(hostDir: string): string {
  const candidates = [path.join(hostDir, "app", "routes"), path.join(hostDir, "src", "app", "routes")];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return path.join(hostDir, "app", "routes");
}

function ancestorChain(start: string): string[] {
  const chain: string[] = [];
  let current = path.resolve(start);

  while (true) {
    chain.push(current);
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return chain;
}

function pushUnique(collection: string[], value: string): void {
  if (!collection.includes(value)) {
    collection.push(value);
  }
}

export async function runAutoBootstrap(options: AutoBootstrapOptions): Promise<AutoBootstrapResult> {
  const packageJsonPath = path.join(options.hostDir, "package.json");
  const packageManager = await detectPackageManager(options.hostDir);
  const result: AutoBootstrapResult = {
    framework: "unknown",
    packageManager,
    created: [],
    skipped: [],
    warnings: [],
  };

  if (!await exists(packageJsonPath)) {
    result.warnings.push("No package.json found in host project. Skipping CMS auto-bootstrap.");
    return result;
  }

  const pkg = JSON.parse(await readFile(packageJsonPath, "utf-8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  const allDependencies = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
  };

  const hasNext = Boolean(allDependencies.next);
  const hasAstro = Boolean(allDependencies.astro);
  const hasRemix = Boolean(allDependencies["@remix-run/react"] || allDependencies["@remix-run/node"]);
  if (!hasNext && !hasAstro && !hasRemix) {
    result.warnings.push("No supported framework dependency detected. Current auto-bootstrap supports Next.js, Astro, and Remix.");
    return result;
  }

  result.framework = hasNext ? "nextjs" : hasAstro ? "astro" : "remix";

  const canonicalConfig = path.join(options.hostDir, "cms.config.ts");
  const legacyConfig = path.join(options.hostDir, "jsoncms.config.ts");

  const hasCanonicalConfig = await exists(canonicalConfig);
  const hasLegacyConfig = await exists(legacyConfig);
  if (hasLegacyConfig) {
    result.warnings.push("Found legacy jsoncms.config.ts. Please migrate to cms.config.ts.");
  }

  if (!hasCanonicalConfig && !hasLegacyConfig) {
    await ensureFile(canonicalConfig, cmsConfigTemplate(result.framework), result, options.hostDir, options.dryRun);
  } else if (hasCanonicalConfig) {
    await ensureFile(canonicalConfig, cmsConfigTemplate(result.framework), result, options.hostDir, options.dryRun);
  } else {
    pushUnique(result.skipped, "cms.config.ts");
  }

  await ensureFile(path.join(options.hostDir, "cms", "schema", "page.ts"), CMS_SCHEMA_FILE, result, options.hostDir, options.dryRun);
  await ensureFile(path.join(options.hostDir, "cms", "plugins", "index.ts"), CMS_PLUGINS_FILE, result, options.hostDir, options.dryRun);

  if (result.framework === "nextjs") {
    const routeTarget = findNextRouteTarget(options.hostDir);
    if (!existsSync(routeTarget.dir)) {
      result.warnings.push(
        "No existing Next.js routing directory found (app/, src/app/, pages/, src/pages/). Creating app/cms/page.tsx."
      );
    }

    if (!allDependencies["@upflame/adapter-nextjs"] && !allDependencies["@upflame/adapters"]) {
      result.warnings.push(
        "Could not validate Next adapter dependency. Add @upflame/adapter-nextjs (or @upflame/adapters) for full adapter integration."
      );
    }

    if (routeTarget.kind === "app") {
      await ensureFile(path.join(routeTarget.dir, "cms", "page.tsx"), CMS_APP_ROUTE_FILE, result, options.hostDir, options.dryRun);
    } else {
      await ensureFile(path.join(routeTarget.dir, "cms.tsx"), CMS_PAGES_ROUTE_FILE, result, options.hostDir, options.dryRun);
    }
  } else if (result.framework === "astro") {
    const astroPagesDir = findAstroPagesDir(options.hostDir);
    if (!existsSync(astroPagesDir)) {
      result.warnings.push("No Astro pages directory found (src/pages/ or pages/). Creating src/pages/cms.astro.");
    }

    if (!allDependencies["@upflame/adapters"] && !allDependencies["@upflame/adapter-astro"]) {
      result.warnings.push(
        "Could not validate Astro adapter dependency. Add @upflame/adapters (or @upflame/adapter-astro) for framework adapter coverage."
      );
    }

    await ensureFile(path.join(astroPagesDir, "cms.astro"), CMS_ASTRO_ROUTE_FILE, result, options.hostDir, options.dryRun);
  } else {
    const remixRoutesDir = findRemixRoutesDir(options.hostDir);
    if (!existsSync(remixRoutesDir)) {
      result.warnings.push("No Remix routes directory found (app/routes/). Creating app/routes/cms.tsx.");
    }

    if (!allDependencies["@upflame/adapters"] && !allDependencies["@upflame/adapter-remix"]) {
      result.warnings.push(
        "Could not validate Remix adapter dependency. Add @upflame/adapters (or @upflame/adapter-remix) for framework adapter coverage."
      );
    }

    await ensureFile(path.join(remixRoutesDir, "cms.tsx"), CMS_REMIX_ROUTE_FILE, result, options.hostDir, options.dryRun);
  }

  return result;
}
