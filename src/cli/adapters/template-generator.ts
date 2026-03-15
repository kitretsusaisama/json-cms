/**
 * @upflame/json-cms — Framework Template Generator
 *
 * Generates framework-specific integration files for each supported
 * framework adapter. Each template is production-ready, typed, and
 * follows the framework's idiomatic patterns.
 */

import type { FrameworkInfo, FrameworkId } from "../detectors/framework-detector";

export interface GeneratedTemplate {
  content: string;
  description: string;
  imports?: string[];
  installNote?: string;
}

// ─── Config template (universal) ────────────────────────────────────────────

function configTemplate(info: FrameworkInfo): string {
  return `/**
 * @upflame/json-cms configuration
 * Auto-generated for ${info.name} — edit as needed
 */
import type { CMSConfig } from "@upflame/json-cms";

const config: CMSConfig = {
  framework: "${info.id}",
  dataDir: "${info.adapter.dataDir}",
  plugins: [],
  features: {
    streaming: ${info.features.streaming},
    serverComponents: ${info.features.serverComponents},
    edgeRuntime: ${info.features.edgeRuntime},
  },
  security: {
    requireAuth: false, // Set true to require JWT for all CMS API calls
    corsOrigins: ["http://localhost:3000"],
  },
  seo: {
    defaultLocale: "en",
    locales: ["en"],
  },
};

export default config;
`;
}

// ─── Next.js App Router ──────────────────────────────────────────────────────

function nextPagesApiTemplate(info: FrameworkInfo): string {
  return `/**
 * CMS Pages API Route — Next.js App Router
 * GET /api/cms/pages/[slug]
 */
import { NextRequest, NextResponse } from "next/server";
import { loadResolvedPage } from "@upflame/json-cms/resolve";
import { planPage } from "@upflame/json-cms/plan";
import { requireAuth } from "@upflame/json-cms/security";

interface RouteParams {
  params: { slug: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = params;

    // Optional: uncomment to require authentication
    // await requireAuth(req);

    const { page, blocks, warnings } = await loadResolvedPage(slug, {
      locale: req.nextUrl.searchParams.get("locale") ?? "en",
    });

    const plan = planPage({ page, ctx: {}, blocks });

    return NextResponse.json({ page, plan, warnings }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.startsWith("Page not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
`;
}

function nextPageRendererTemplate(info: FrameworkInfo): string {
  return `/**
 * CMS Catch-All Page — Next.js App Router
 * Renders JSON-driven pages at any route
 */
import { notFound } from "next/navigation";
import { loadResolvedPage } from "@upflame/json-cms/resolve";
import { planPage } from "@upflame/json-cms/plan";
import { JsonRenderer } from "@upflame/json-cms/renderer";
import { registry } from "@/components/registry";

interface PageProps {
  params: { slug?: string[] };
  searchParams: Record<string, string>;
}

export default async function CMSPage({ params, searchParams }: PageProps) {
  const slug = params.slug?.join("/") ?? "home";

  try {
    const { page, blocks, warnings } = await loadResolvedPage(slug, {
      locale: searchParams.locale ?? "en",
    });

    const plan = planPage({ page, ctx: { slug }, blocks });

    return (
      <JsonRenderer
        page={page}
        plan={plan}
        registry={registry}
        debug={process.env.NODE_ENV === "development"}
      />
    );
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Page not found")) {
      notFound();
    }
    throw err;
  }
}

export async function generateStaticParams() {
  // Return known slugs for static generation
  // const slugs = await getAllPageSlugs();
  return [];
}
`;
}

// ─── Remix ────────────────────────────────────────────────────────────────────

function remixRouteTemplate(info: FrameworkInfo): string {
  return `/**
 * CMS Page Route — Remix
 * Handles all CMS-driven pages via a loader
 */
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { loadResolvedPage } from "@upflame/json-cms/resolve";
import { planPage } from "@upflame/json-cms/plan";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const slug = params.slug ?? "home";
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? "en";

  const { page, blocks, warnings } = await loadResolvedPage(slug, { locale });
  const plan = planPage({ page, ctx: { slug }, blocks });

  return json({ page, plan, warnings });
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: "Not Found" }];
  return [
    { title: data.page.seo?.title ?? data.page.title },
    { name: "description", content: data.page.seo?.description ?? "" },
  ];
};

export default function CMSPage() {
  const { page, plan } = useLoaderData<typeof loader>();

  return (
    <main>
      {/* Render plan.components using your component registry */}
      {plan.components.map((component, index) => (
        <div key={component.id ?? \`component-\${index}\`} data-component={component.key}>
          {/* Mount component via your registry here */}
          <p>{component.key}</p>
        </div>
      ))}
    </main>
  );
}
`;
}

// ─── Nuxt ─────────────────────────────────────────────────────────────────────

function nuxtServerRouteTemplate(): string {
  return `/**
 * CMS Pages API — Nuxt Server Route
 * GET /api/cms/pages/[slug]
 */
import { loadResolvedPage } from "@upflame/json-cms/resolve";
import { planPage } from "@upflame/json-cms/plan";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug") ?? "home";
  const query = getQuery(event);
  const locale = String(query.locale ?? "en");

  try {
    const { page, blocks, warnings } = await loadResolvedPage(slug, { locale });
    const plan = planPage({ page, ctx: { slug }, blocks });

    return { page, plan, warnings };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const statusCode = message.startsWith("Page not found") ? 404 : 500;
    throw createError({ statusCode, statusMessage: message });
  }
});
`;
}

function nuxtPageTemplate(): string {
  return `<script setup lang="ts">
/**
 * CMS Catch-All Page — Nuxt
 */
const route = useRoute();
const slug = computed(() => {
  const s = route.params.slug;
  return Array.isArray(s) ? s.join("/") : s ?? "home";
});

const { data, error } = await useFetch(\`/api/cms/pages/\${slug.value}\`);
if (error.value) throw createError({ statusCode: 404, message: "Page not found" });

useHead({
  title: data.value?.page?.seo?.title ?? data.value?.page?.title,
  meta: [{ name: "description", content: data.value?.page?.seo?.description ?? "" }],
});
</script>

<template>
  <main>
    <!-- Render plan components via your component registry -->
    <component
      v-for="(component, index) in data?.plan?.components"
      :key="component.id ?? \`component-\${index}\`"
      :is="component.key"
      v-bind="component.props"
    />
  </main>
</template>
`;
}

// ─── SvelteKit ────────────────────────────────────────────────────────────────

function sveltekitEndpointTemplate(): string {
  return `/**
 * CMS Pages API — SvelteKit Server Endpoint
 * GET /api/cms/pages/[slug]
 */
import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { loadResolvedPage } from "@upflame/json-cms/resolve";
import { planPage } from "@upflame/json-cms/plan";

export const GET: RequestHandler = async ({ params, url }) => {
  const slug = params.slug ?? "home";
  const locale = url.searchParams.get("locale") ?? "en";

  try {
    const { page, blocks, warnings } = await loadResolvedPage(slug, { locale });
    const plan = planPage({ page, ctx: { slug }, blocks });

    return json({ page, plan, warnings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    throw error(message.startsWith("Page not found") ? 404 : 500, message);
  }
};
`;
}

function sveltekitPageTemplate(): string {
  return `/**
 * CMS Catch-All Page — SvelteKit
 * Load function for CMS-driven pages
 */
import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { loadResolvedPage } from "@upflame/json-cms/resolve";
import { planPage } from "@upflame/json-cms/plan";

export const load: PageServerLoad = async ({ params }) => {
  const slug = params.slug ?? "home";

  try {
    const { page, blocks, warnings } = await loadResolvedPage(slug, {});
    const plan = planPage({ page, ctx: { slug }, blocks });

    return { page, plan, warnings };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    throw error(message.startsWith("Page not found") ? 404 : 500, message);
  }
};
`;
}

// ─── Astro ────────────────────────────────────────────────────────────────────

function astroEndpointTemplate(): string {
  return `/**
 * CMS Pages API — Astro Endpoint
 * GET /api/cms/pages/[slug]
 */
import type { APIRoute } from "astro";
import { loadResolvedPage } from "@upflame/json-cms/resolve";
import { planPage } from "@upflame/json-cms/plan";

export const GET: APIRoute = async ({ params, url }) => {
  const slug = params.slug ?? "home";
  const locale = url.searchParams.get("locale") ?? "en";

  try {
    const { page, blocks, warnings } = await loadResolvedPage(slug, { locale });
    const plan = planPage({ page, ctx: { slug }, blocks });

    return new Response(JSON.stringify({ page, plan, warnings }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.startsWith("Page not found") ? 404 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
};
`;
}

function astroPageTemplate(): string {
  return `---
/**
 * CMS Catch-All Page — Astro
 */
import Layout from "../../layouts/Layout.astro";

const slug = Astro.params.slug ?? "home";

let page = null, plan = null;
try {
  const res = await fetch(\`\${Astro.url.origin}/api/cms/pages/\${slug}\`);
  if (!res.ok) return Astro.redirect("/404");
  ({ page, plan } = await res.json());
} catch {
  return Astro.redirect("/404");
}
---
<Layout title={page?.seo?.title ?? page?.title}>
  <main>
    <!-- Render plan components via your component registry -->
    {plan?.components?.map((component: { key: string; id?: string; props: Record<string, unknown> }) => (
      <div data-component={component.key}>
        <!-- Mount component by key -->
      </div>
    ))}
  </main>
</Layout>
`;
}

// ─── Express ─────────────────────────────────────────────────────────────────

function expressRouterTemplate(): string {
  return `/**
 * CMS Router — Express
 * Mounts CMS API routes under /api/cms
 */
import express from "express";
import { loadResolvedPage } from "@upflame/json-cms/resolve";
import { planPage } from "@upflame/json-cms/plan";

const router = express.Router();

// GET /api/cms/pages/:slug
router.get("/pages/:slug", async (req, res) => {
  const { slug } = req.params;
  const locale = String(req.query.locale ?? "en");

  try {
    const { page, blocks, warnings } = await loadResolvedPage(slug, { locale });
    const plan = planPage({ page, ctx: { slug }, blocks });

    res.json({ page, plan, warnings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.startsWith("Page not found") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;

// In app.ts / server.ts: app.use("/api/cms", cmsRouter);
`;
}

function expressServerTemplate(): string {
  return `/**
 * Express Server with CMS Integration
 * Vite + React/Vue/Svelte projects need a separate Express server
 */
import express from "express";
import { loadResolvedPage } from "@upflame/json-cms/resolve";
import { planPage } from "@upflame/json-cms/plan";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

// CMS Pages API
app.get("/api/cms/pages/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const { page, blocks, warnings } = await loadResolvedPage(slug, {});
    const plan = planPage({ page, ctx: { slug }, blocks });
    res.json({ page, plan, warnings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(message.startsWith("Page not found") ? 404 : 500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(\`CMS API running at http://localhost:\${PORT}\`);
});
`;
}

// ─── Fastify ─────────────────────────────────────────────────────────────────

function fastifyPluginTemplate(): string {
  return `/**
 * CMS Fastify Plugin
 * Register this plugin to add CMS routes to your Fastify app
 */
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { loadResolvedPage } from "@upflame/json-cms/resolve";
import { planPage } from "@upflame/json-cms/plan";

const cmsPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { slug: string }; Querystring: { locale?: string } }>(
    "/api/cms/pages/:slug",
    async (request, reply) => {
      const { slug } = request.params;
      const locale = request.query.locale ?? "en";

      try {
        const { page, blocks, warnings } = await loadResolvedPage(slug, { locale });
        const plan = planPage({ page, ctx: { slug }, blocks });
        return { page, plan, warnings };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const statusCode = message.startsWith("Page not found") ? 404 : 500;
        reply.code(statusCode);
        return { error: message };
      }
    }
  );
};

export default fp(cmsPlugin, {
  fastify: "4 || 5",
  name: "@upflame/json-cms",
});

// In app.ts: await fastify.register(cmsPlugin);
`;
}

// ─── Angular ─────────────────────────────────────────────────────────────────

function angularServiceTemplate(): string {
  return `/**
 * CMS Service — Angular
 * Injectable service for fetching CMS page data
 */
import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { catchError } from "rxjs/operators";

export interface CMSPageResponse {
  page: { id: string; title: string; seo?: { title?: string; description?: string } };
  plan: { components: Array<{ id: string; key: string; props: Record<string, unknown> }> };
  warnings: string[];
}

@Injectable({ providedIn: "root" })
export class CmsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "/api/cms";

  getPage(slug: string, locale = "en"): Observable<CMSPageResponse> {
    return this.http.get<CMSPageResponse>(
      \`\${this.baseUrl}/pages/\${slug}?locale=\${locale}\`
    );
  }
}
`;
}

function angularComponentTemplate(): string {
  return `/**
 * CMS Page Component — Angular
 * Renders JSON-CMS-driven pages
 */
import { Component, OnInit, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { AsyncPipe, NgFor, NgIf } from "@angular/common";
import { CmsService, CMSPageResponse } from "../cms.service";
import { Observable } from "rxjs";
import { switchMap } from "rxjs/operators";

@Component({
  selector: "app-cms-page",
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf],
  template: \`
    <main *ngIf="pageData$ | async as data">
      <div
        *ngFor="let component of data.plan.components; trackBy: trackById"
        [attr.data-component]="component.key"
      >
        <!-- Mount component from your registry by component.key -->
        <p>{{ component.key }}</p>
      </div>
    </main>
  \`,
})
export class CmsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cmsService = inject(CmsService);

  pageData$!: Observable<CMSPageResponse>;

  ngOnInit(): void {
    this.pageData$ = this.route.paramMap.pipe(
      switchMap((params) => {
        const slug = params.get("slug") ?? "home";
        return this.cmsService.getPage(slug);
      })
    );
  }

  trackById(_: number, item: { id: string }) {
    return item.id;
  }
}
`;
}

// ─── Gatsby ───────────────────────────────────────────────────────────────────

function gatsbyNodeTemplate(): string {
  return `/**
 * Gatsby Node API — CMS Page Generation
 * Creates pages for all CMS page slugs at build time
 */
const path = require("path");

exports.createPages = async ({ actions }) => {
  const { createPage } = actions;

  // Fetch all page slugs from your CMS data directory
  // const slugs = await getAllPageSlugs();
  const slugs = ["home", "about", "contact"]; // Replace with actual slugs

  slugs.forEach((slug) => {
    createPage({
      path: \`/\${slug === "home" ? "" : slug}\`,
      component: path.resolve("src/templates/cms-page.jsx"),
      context: { slug },
    });
  });
};
`;
}

// ─── Qwik ─────────────────────────────────────────────────────────────────────

function qwikServerHandlerTemplate(): string {
  return `/**
 * CMS Server Handler — Qwik City
 * GET /api/cms/pages/[slug]
 */
import type { RequestHandler } from "@builder.io/qwik-city";
import { loadResolvedPage } from "@upflame/json-cms/resolve";
import { planPage } from "@upflame/json-cms/plan";

export const onGet: RequestHandler = async ({ params, url, json }) => {
  const slug = params.slug ?? "home";
  const locale = url.searchParams.get("locale") ?? "en";

  try {
    const { page, blocks, warnings } = await loadResolvedPage(slug, { locale });
    const plan = planPage({ page, ctx: { slug }, blocks });

    json(200, { page, plan, warnings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    json(message.startsWith("Page not found") ? 404 : 500, { error: message });
  }
};
`;
}

// ─── Template Registry ────────────────────────────────────────────────────────

function nextPagesRouterApiTemplate(): string {
  return `/**
 * CMS Pages API Route - Next.js Pages Router
 * GET /api/cms/pages/[slug]
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { loadResolvedPage } from "@upflame/json-cms/resolve";
import { planPage } from "@upflame/json-cms/plan";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawSlug = req.query.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug ?? "home";
  const locale = Array.isArray(req.query.locale) ? req.query.locale[0] : req.query.locale ?? "en";

  try {
    const { page, blocks, warnings } = await loadResolvedPage(String(slug), {
      locale: String(locale),
    });
    const plan = planPage({ page, ctx: { slug }, blocks });

    return res.status(200).json({ page, plan, warnings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(message.startsWith("Page not found") ? 404 : 500).json({ error: message });
  }
}
`;
}

function nextPagesRouterPageTemplate(): string {
  return `/**
 * CMS Catch-All Page - Next.js Pages Router
 * Renders JSON-driven pages via getServerSideProps
 */
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { loadResolvedPage } from "@upflame/json-cms/resolve";
import { planPage } from "@upflame/json-cms/plan";
import { JsonRenderer } from "@upflame/json-cms/renderer";
import { registry } from "@/components/registry";

type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function CMSPage({ page, plan }: PageProps) {
  return (
    <JsonRenderer
      page={page}
      plan={plan}
      registry={registry}
      debug={process.env.NODE_ENV === "development"}
    />
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params, query }) => {
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam.join("/") : slugParam ?? "home";
  const locale = Array.isArray(query.locale) ? query.locale[0] : query.locale ?? "en";

  try {
    const { page, blocks } = await loadResolvedPage(String(slug), {
      locale: String(locale),
    });
    const plan = planPage({ page, ctx: { slug }, blocks });

    return {
      props: { page, plan },
    };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Page not found")) {
      return { notFound: true };
    }
    throw err;
  }
};
`;
}

export function generateTemplate(templateName: string, info: FrameworkInfo): GeneratedTemplate {
  const generators: Record<string, () => GeneratedTemplate> = {
    config: () => ({
      content: configTemplate(info),
      description: "CMS configuration file",
    }),
    "next-pages-api": () => ({
      content: nextPagesApiTemplate(info),
      description: "Next.js App Router — CMS pages API handler",
    }),
    "next-page-renderer": () => ({
      content: nextPageRendererTemplate(info),
      description: "Next.js App Router — CMS catch-all page renderer",
    }),
    "next-pages-router-api": () => ({
      content: nextPagesRouterApiTemplate(),
      description: "Next.js Pages Router - CMS pages API handler",
    }),
    "next-pages-router-page": () => ({
      content: nextPagesRouterPageTemplate(),
      description: "Next.js Pages Router - CMS catch-all page renderer",
    }),
    "remix-route": () => ({
      content: remixRouteTemplate(info),
      description: "Remix route with loader for CMS pages",
    }),
    "nuxt-server-route": () => ({
      content: nuxtServerRouteTemplate(),
      description: "Nuxt server route for CMS API",
    }),
    "nuxt-page": () => ({
      content: nuxtPageTemplate(),
      description: "Nuxt catch-all page component",
    }),
    "sveltekit-endpoint": () => ({
      content: sveltekitEndpointTemplate(),
      description: "SvelteKit server endpoint for CMS API",
    }),
    "sveltekit-page": () => ({
      content: sveltekitPageTemplate(),
      description: "SvelteKit page load function for CMS",
    }),
    "astro-endpoint": () => ({
      content: astroEndpointTemplate(),
      description: "Astro API endpoint for CMS pages",
    }),
    "astro-page": () => ({
      content: astroPageTemplate(),
      description: "Astro catch-all page",
    }),
    "express-router": () => ({
      content: expressRouterTemplate(),
      description: "Express router with CMS endpoints",
      installNote: "npm install express",
    }),
    "express-server": () => ({
      content: expressServerTemplate(),
      description: "Express server with CMS API",
      installNote: "npm install express && npm install -D @types/express",
    }),
    "fastify-plugin": () => ({
      content: fastifyPluginTemplate(),
      description: "Fastify plugin for CMS routes",
      installNote: "npm install fastify-plugin",
    }),
    "angular-service": () => ({
      content: angularServiceTemplate(),
      description: "Angular injectable CMS service",
    }),
    "angular-component": () => ({
      content: angularComponentTemplate(),
      description: "Angular CMS page component",
    }),
    "gatsby-node": () => ({
      content: gatsbyNodeTemplate(),
      description: "Gatsby node API for CMS page creation",
    }),
    "qwik-server-handler": () => ({
      content: qwikServerHandlerTemplate(),
      description: "Qwik City server handler for CMS API",
    }),
  };

  const gen = generators[templateName];
  if (!gen) {
    return {
      content: `// Template "${templateName}" not yet implemented for ${info.name}.\n// Please check the @upflame/json-cms documentation.\n`,
      description: `Placeholder for ${templateName}`,
    };
  }

  return gen();
}

/**
 * Get all setup files content for a detected framework.
 */
export function getSetupFilesForFramework(info: FrameworkInfo): Array<{
  path: string;
  content: string;
  description: string;
  installNote?: string;
}> {
  return info.adapter.setupFiles.map((setupFile) => {
    const template = generateTemplate(setupFile.template, info);
    return {
      path: setupFile.path,
      content: template.content,
      description: setupFile.description,
      installNote: template.installNote,
    };
  });
}
