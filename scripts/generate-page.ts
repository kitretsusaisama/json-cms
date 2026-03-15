#!/usr/bin/env node
/*
  Generate a new page route with JSON definition (production JSON UI schema).

  Creates:
  - src/app/<id>/page.tsx
  - src/data/pages/<id>.json
*/

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(q: string): Promise<string> {
  return new Promise((resolve) => rl.question(q, (ans) => resolve(ans.trim())));
}

function toTitleCase(slug: string): string {
  return slug
    .split(/[\-_/]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function loadJsonSafe<T = unknown>(p: string): T | null {
  try {
    const txt = fs.readFileSync(p, "utf8");
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
}

function appendPath(url: string, slug: string): string {
  try {
    const u = new URL(url);
    const basePath = u.pathname.endsWith("/") ? u.pathname.slice(0, -1) : u.pathname;
    u.pathname = `${basePath}/${slug}`;
    return u.toString();
  } catch {
    // not an absolute URL; fallback to simple join
    if (!url) return `/${slug}`;
    const base = url.endsWith("/") ? url.slice(0, -1) : url;
    return `${base}/${slug}`;
  }
}

function ensureDir(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

function writeFileSafe(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, { encoding: "utf8" });
}

function fileExists(p: string): boolean {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

function validateId(id: string): boolean {
  // Allow kebab-case, lowercase letters, numbers; can include "/" for nested routes
  return /^[a-z0-9\-\/]+$/.test(id) && !id.startsWith("/") && !id.endsWith("/");
}

async function main() {
  try {
    let id = (process.argv[2] || "").trim();
    if (!id) {
      id = await ask("Enter page id (kebab-case, e.g. about-us): ");
    }

    while (!validateId(id)) {
      console.log("Invalid id. Use lowercase letters, numbers, hyphens; optional nested paths like blog/my-post.");
      id = await ask("Enter page id: ");
    }

    const projectRoot = process.cwd();
    const routeDir = path.join(projectRoot, "src", "app", id);
    const routeFile = path.join(routeDir, "page.tsx");
    const pageJsonFile = path.join(projectRoot, "src", "data", "pages", `${id}.json`);

    // Load production-ready templates from existing home files if available
    const homePageTplPath = path.join(projectRoot, "src", "data", "pages", "home.json");
    const homePageTpl = loadJsonSafe<any>(homePageTplPath);
    const homeSeoTpl = null;

    const exists = [routeFile, pageJsonFile].some(fileExists);
    if (exists) {
      const ans = (await ask("Some files already exist. Overwrite? (y/N): ")).toLowerCase();
      if (ans !== "y" && ans !== "yes") {
        console.log("Aborted.");
        rl.close();
        return;
      }
    }

    // page.tsx content
    const pageTsx = `import JsonRendererV2 from "@/components/renderer/JsonRendererV2";

export default async function Page() {
  return <JsonRendererV2 slug="${id}" ctx={{ locale: "en" }} />;
}
`;

    // page JSON content (derive from home template when present)
    let pageJson: any;
    if (homePageTpl) {
      const cloned = deepClone<any>(homePageTpl);
      // best-effort adjustments for title
      cloned.title = cloned.title || toTitleCase(id);
      pageJson = cloned;
    } else {
      // Minimal V2 page schema
      pageJson = {
        title: toTitleCase(id),
        blocks: [],
        prepend: [
          { id: "seo", key: "SEO", props: { title: toTitleCase(id), description: `This is the ${id} page` }, weight: 1 }
        ],
        append: [],
        constraints: [],
        ctx: { locale: "en" }
      };
    }

    // Write files
    writeFileSafe(routeFile, pageTsx);
    writeFileSafe(pageJsonFile, JSON.stringify(pageJson, null, 2) + "\n");

    console.log("Created:");
    console.log(" -", path.relative(projectRoot, routeFile));
    console.log(" -", path.relative(projectRoot, pageJsonFile));
    // no SEO JSON in the new flow
  } catch (err) {
    console.error("Failed to generate page:", err);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
