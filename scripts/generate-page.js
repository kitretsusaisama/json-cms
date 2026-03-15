#!/usr/bin/env node
/*
  Generate a new page route with JSON definition and SEO JSON.

  Creates:
  - src/app/<id>/page.tsx
  - data/pages/<id>.json
  - data/seo/page/<id>.json
*/

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(q) {
  return new Promise((resolve) => rl.question(q, (ans) => resolve(ans.trim())));
}

function toTitleCase(slug) {
  return slug
    .split(/[\-_/]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadJsonSafe(p) {
  try {
    const txt = fs.readFileSync(p, "utf8");
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function appendPath(url, slug) {
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

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeFileSafe(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, { encoding: "utf8" });
}

function fileExists(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

function dirExists(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

function validateId(id) {
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
    const pageJsonFile = path.join(projectRoot, "data", "pages", `${id}.json`);
    const seoJsonFile = path.join(projectRoot, "data", "seo", "page", `${id}.json`);

    // Load production-ready templates from existing home files if available
    const homePageTplPath = path.join(projectRoot, "data", "pages", "home.json");
    const homeSeoTplPath = path.join(projectRoot, "data", "seo", "page", "home.json");
    const homePageTpl = loadJsonSafe(homePageTplPath);
    const homeSeoTpl = loadJsonSafe(homeSeoTplPath);

    const exists = [routeFile, pageJsonFile, seoJsonFile].some(fileExists);
    if (exists) {
      const ans = (await ask("Some files already exist. Overwrite? (y/N): ")).toLowerCase();
      if (ans !== "y" && ans !== "yes") {
        console.log("Aborted.");
        rl.close();
        return;
      }
    }

    // page.tsx content
    const pageTsx = `import { Metadata } from "next";
import { getSeoWithDefaults } from "@/lib/seo-store";
import { safeJsonRead } from "@/lib/fs-safe";
import { PageDefinitionSchema } from "@/types/page";
import JsonPageRenderer from "@/components/JsonPageRenderer";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoWithDefaults("page", ${JSON.stringify(id)});
  if (!seo) return { title: "${toTitleCase(id)}", description: "${toTitleCase(id)} page" };
  return {
    title: seo.title,
    description: seo.description,
    robots: seo.robots,
    alternates: seo.alternates,
    openGraph: seo.openGraph ? ({
      type: seo.openGraph.type,
      title: seo.openGraph.title,
      description: seo.openGraph.description,
      url: seo.openGraph.url,
      images: seo.openGraph.images,
    } as any) : undefined,
    twitter: seo.twitter ? ({
      card: seo.twitter.card,
      site: seo.twitter.site,
      creator: seo.twitter.creator,
      title: seo.twitter.title,
      description: seo.twitter.description,
      images: seo.twitter.image ? [seo.twitter.image] : undefined,
    } as any) : undefined,
  };
}

export default async function Page() {
  const pageDef = await safeJsonRead("data/pages/${id}.json", PageDefinitionSchema);
  if (!pageDef) return null;
  return <JsonPageRenderer def={pageDef} />;
}
`;

    // page JSON content (derive from home template when present)
    let pageJson;
    if (homePageTpl) {
      const cloned = deepClone(homePageTpl);
      cloned.seoRef = { type: "page", id };
      // Try to update first Hero component title/subtitle if exists
      const heroIdx = Array.isArray(cloned.components)
        ? cloned.components.findIndex((c) => c && c.type === "Hero")
        : -1;
      if (heroIdx >= 0) {
        cloned.components[heroIdx] = cloned.components[heroIdx] || {};
        cloned.components[heroIdx].props = cloned.components[heroIdx].props || {};
        cloned.components[heroIdx].props.title = toTitleCase(id);
        if (!cloned.components[heroIdx].props.subtitle) {
          cloned.components[heroIdx].props.subtitle = `Learn more on ${toTitleCase(id)}`;
        }
      }
      pageJson = cloned;
    } else {
      pageJson = {
        version: 1,
        seoRef: { type: "page", id },
        components: [
          {
            key: "hero-1",
            type: "Hero",
            props: {
              title: toTitleCase(id),
              subtitle: `This is the ${id} page`,
              image: "https://placehold.co/1200x600",
              ctaText: "Go Home",
              ctaHref: "/"
            }
          }
        ],
        featureFlags: [],
        guards: []
      };
    }

    // seo JSON content (derive from home SEO when present)
    let seoJson;
    if (homeSeoTpl) {
      const cloned = deepClone(homeSeoTpl);
      cloned.id = id;
      cloned.type = "page";
      const derivedTitle = `${toTitleCase(id)} — Albata`;
      const derivedDesc = `Learn more on ${toTitleCase(id)} page`;
      // title/description
      cloned.title = derivedTitle;
      cloned.description = derivedDesc;
      // canonical and alternates
      if (cloned.canonical) cloned.canonical = appendPath(cloned.canonical, id);
      if (cloned.alternates && typeof cloned.alternates === "object") {
        for (const k of Object.keys(cloned.alternates)) {
          cloned.alternates[k] = appendPath(cloned.alternates[k], id);
        }
      }
      // openGraph
      if (cloned.openGraph) {
        if (cloned.openGraph.url) cloned.openGraph.url = appendPath(cloned.openGraph.url, id);
        cloned.openGraph.title = derivedTitle;
        cloned.openGraph.description = derivedDesc;
      }
      // twitter
      if (cloned.twitter) {
        cloned.twitter.title = derivedTitle;
        cloned.twitter.description = derivedDesc;
      }
      cloned.updatedAt = new Date().toISOString();
      seoJson = cloned;
    } else {
      seoJson = {
        id,
        type: "page",
        title: `${toTitleCase(id)} — Albata`,
        description: `Learn more on ${toTitleCase(id)} page`,
        robots: "index,follow",
        alternates: {},
        meta: [],
        openGraph: {
          type: "website",
          url: `https://example.com/${id}`,
          title: `${toTitleCase(id)} — Albata`,
          description: `Learn more on ${toTitleCase(id)} page`,
          images: [ { url: "https://placehold.co/1200x630", width: 1200, height: 630, alt: `${toTitleCase(id)} OG` } ]
        },
        twitter: {
          card: "summary_large_image",
          title: `${toTitleCase(id)} — Albata`,
          description: `Learn more on ${toTitleCase(id)} page`,
          image: "https://placehold.co/1200x630"
        },
        structuredData: [],
        updatedAt: new Date().toISOString()
      };
    }

    // Write files
    writeFileSafe(routeFile, pageTsx);
    writeFileSafe(pageJsonFile, JSON.stringify(pageJson, null, 2) + "\n");
    writeFileSafe(seoJsonFile, JSON.stringify(seoJson, null, 2) + "\n");

    console.log("Created:");
    console.log(" -", path.relative(projectRoot, routeFile));
    console.log(" -", path.relative(projectRoot, pageJsonFile));
    console.log(" -", path.relative(projectRoot, seoJsonFile));
  } catch (err) {
    console.error("Failed to generate page:", err);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
