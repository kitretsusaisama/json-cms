import type { Metadata } from "next";
import { getSeoWithDefaults } from "@/lib/seo-store";
import { generatePageMetadata } from "@/lib/seo";
import { SeoRecordSchema, type SeoRecord, type SeoType } from "@/types/seo";

function scoreChecks(checks: Array<{ passed: boolean }>): number {
  if (checks.length === 0) {
    return 0;
  }

  const passed = checks.filter((check) => check.passed).length;
  return Math.round((passed / checks.length) * 100);
}

export async function getSeoHealth(pageId: string): Promise<{
  pageId: string;
  score: number;
  checks: Array<{ id: string; passed: boolean; message: string }>;
  warnings: string[];
}> {
  const record = await getSeoWithDefaults("page", pageId);
  const checks = [
    { id: "title", passed: Boolean(record?.title), message: "Title is present" },
    { id: "description", passed: Boolean(record?.description), message: "Description is present" },
    { id: "canonical", passed: Boolean(record?.canonical), message: "Canonical URL is present" },
    {
      id: "structuredData",
      passed: Boolean(record?.structuredData?.length),
      message: "Structured data is present",
    },
    {
      id: "openGraphImage",
      passed: Boolean(record?.openGraph?.images?.length),
      message: "Open Graph image is present",
    },
  ];

  const warnings = checks.filter((check) => !check.passed).map((check) => check.message);

  return {
    pageId,
    score: scoreChecks(checks),
    checks,
    warnings,
  };
}

export async function optimizeSeoContent(pageId: string, content: string): Promise<{
  pageId: string;
  score: number;
  wordCount: number;
  recommendations: string[];
}> {
  const record = await getSeoWithDefaults("page", pageId);
  const wordCount = content.trim().length > 0 ? content.trim().split(/\s+/).length : 0;
  const recommendations: string[] = [];

  if (wordCount < 300) {
    recommendations.push("Expand page copy to at least 300 words.");
  }
  if (!record?.title) {
    recommendations.push("Add an SEO title.");
  }
  if (!record?.description) {
    recommendations.push("Add a meta description.");
  }
  if (!record?.openGraph?.images?.length) {
    recommendations.push("Add an Open Graph image.");
  }

  const score = Math.max(0, 100 - recommendations.length * 20);

  return {
    pageId,
    score,
    wordCount,
    recommendations,
  };
}

export function validateSeoRecord(input: unknown): {
  valid: boolean;
  errors: string[];
  record?: SeoRecord;
} {
  const parsed = SeoRecordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }

  return {
    valid: true,
    errors: [],
    record: parsed.data,
  };
}

export function buildStructuredDataPayload(input: {
  pageId?: string;
  pageData?: Record<string, unknown>;
  seoRecord?: SeoRecord | null;
}): Record<string, unknown>[] {
  const fromPageData = input.pageData?.structuredData;
  if (Array.isArray(fromPageData)) {
    return fromPageData.filter(
      (entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null
    );
  }

  if (input.seoRecord?.structuredData?.length) {
    return input.seoRecord.structuredData as Record<string, unknown>[];
  }

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: input.pageId ?? "page",
    },
  ];
}

export async function generateSeoMetadataPreview(input: {
  pageId?: string;
  pageData?: Record<string, unknown>;
  context?: { lang?: string; seoType?: SeoType };
}): Promise<Metadata | Record<string, unknown>> {
  if (input.pageId) {
    return generatePageMetadata(input.pageId, input.context?.lang);
  }

  const pageData = input.pageData ?? {};
  return {
    title: typeof pageData.title === "string" ? pageData.title : "Untitled page",
    description:
      typeof pageData.description === "string"
        ? pageData.description
        : "Generated SEO preview",
    structuredData: buildStructuredDataPayload({ pageData }),
  };
}
