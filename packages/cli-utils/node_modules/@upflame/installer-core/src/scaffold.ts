import { join } from "path";
import { applyMutationPlan, createBootstrapSafetyPolicy, type BootstrapSafetyPolicy } from "./policy/bootstrap-safety-policy";

export interface ScaffoldOptions {
  policy?: BootstrapSafetyPolicy;
  applyExplicitlyRequested?: boolean;
  ci?: boolean;
}

export async function scaffoldDataDirectory(rootDir: string, dataDir: string, options: ScaffoldOptions = {}): Promise<string[]> {
  const dataDirPath = join(rootDir, dataDir);
  const dirs = ["pages", "blocks", "settings", "settings/i18n", "settings/overlays", "media", "_schemas"];

  const files: Array<{ path: string; content: unknown }> = [
    {
      path: join(dataDirPath, "pages", "home.json"),
      content: {
        id: "home",
        title: "Home",
        blocks: [],
        prepend: [],
        append: [],
        constraints: [],
        seo: { title: "Home | My Site", description: "Welcome to my @upflame/json-cms powered site" },
      },
    },
    {
      path: join(dataDirPath, "settings", "tokens.json"),
      content: {
        "color.primary": "#0070f3",
        "color.secondary": "#7928ca",
        "font.heading": "Inter",
        "spacing.base": "16px",
      },
    },
    {
      path: join(dataDirPath, "settings", "i18n", "en.json"),
      content: { welcome: "Welcome", "cta.primary": "Get Started" },
    },
  ];

  const policy =
    options.policy ??
    createBootstrapSafetyPolicy({
      rootDir,
      ci: options.ci,
      applyExplicitlyRequested: options.applyExplicitlyRequested ?? false,
    });

  const result = await applyMutationPlan(policy, {
    mutations: [
      ...dirs.map((dir) => ({ kind: "mkdir" as const, path: join(dataDirPath, dir) })),
      ...files.map((file) => ({
        kind: "writeFile" as const,
        path: file.path,
        content: `${JSON.stringify(file.content, null, 2)}\n`,
        overwrite: false,
      })),
    ],
  });

  if (result.status === "blocked") {
    return [];
  }

  return result.auditLog
    .filter((entry) => entry.status === "applied" && entry.kind === "writeFile")
    .map((entry) => entry.path);
}
