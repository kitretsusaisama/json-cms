import { z } from "zod";
import { Block, ComponentInstance, Constraint, PageV2, Variant } from "@/types/composer";

export const WorkflowStatusSchema = z.enum(["draft", "published", "archived"]);
export const RoleSchema = z.enum(["viewer", "editor", "admin"]);

export const PermissionPolicySchema = z.object({
  resource: z.string().min(1),
  actions: z.array(z.string().min(1)).min(1),
  roles: z.array(RoleSchema).default(["admin"]),
});

export const SeoMetadataSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(320),
  keywords: z.array(z.string().min(1)).default([]),
  canonicalUrl: z.string().url().optional(),
  ogImage: z.string().optional(),
  structuredData: z.record(z.unknown()).optional(),
  noIndex: z.boolean().default(false),
});

export const WorkflowStateSchema = z.object({
  status: WorkflowStatusSchema.default("draft"),
  version: z.number().int().positive().default(1),
  publishedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.string().datetime().optional(),
  updatedBy: z.string().optional(),
});

export const LocalizationBundleSchema = z.object({
  defaultLocale: z.string().min(2).default("en"),
  locales: z.record(z.record(z.string())).default({}),
  fallbackLocale: z.string().min(2).default("en"),
});

export const MediaAssetSchema = z.object({
  id: z.string().min(1),
  src: z.string().min(1),
  alt: z.string().default(""),
  mimeType: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  provider: z.string().default("local"),
  metadata: z.record(z.unknown()).default({}),
});

export const FieldDefinitionSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    "text",
    "rich-text",
    "number",
    "boolean",
    "date",
    "select",
    "relation",
    "media",
    "json",
    "component",
  ]),
  required: z.boolean().default(false),
  repeatable: z.boolean().default(false),
  description: z.string().optional(),
  validation: z.record(z.unknown()).default({}),
  ui: z.record(z.unknown()).default({}),
});

export const ContentTypeSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(FieldDefinitionSchema).min(1),
  layout: z.record(z.unknown()).default({}),
  render: z.record(z.unknown()).default({}),
  seo: SeoMetadataSchema.partial().optional(),
  permissions: z.array(PermissionPolicySchema).default([]),
});

export const ComponentSlotSchema = z.object({
  name: z.string().min(1),
  accepts: z.array(z.string()).default([]),
  items: z.array(z.unknown()).default([]),
});

export const ComponentInputSchema: z.ZodType<Record<string, unknown>> = z.lazy(() =>
  z
    .object({
      id: z.string().min(1).optional(),
      key: z.string().min(1).optional(),
      componentType: z.string().min(1).optional(),
      type: z.string().min(1).optional(),
      props: z.record(z.unknown()).default({}),
      content: z.record(z.unknown()).optional(),
      variant: z.string().optional(),
      variants: z.array(Variant).optional(),
      slots: z.array(ComponentSlotSchema).optional(),
      children: z.array(ComponentInputSchema).optional(),
      conditions: z.array(z.unknown()).optional(),
      weight: z.number().int().min(0).default(1),
      analytics: z.record(z.unknown()).optional(),
    })
    .passthrough()
);

export const CmsBlockSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    tree: z.array(ComponentInputSchema).default([]),
    content: z.record(z.unknown()).optional(),
    constraints: z.array(Constraint).default([]),
    metadata: z.record(z.unknown()).default({}),
    workflow: WorkflowStateSchema.default({}),
  })
  .passthrough();

export const CmsPageSchema = z
  .object({
    id: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    title: z.string().min(1),
    description: z.string().optional(),
    blocks: z.array(z.union([z.string().min(1), CmsBlockSchema])).default([]),
    prepend: z.array(ComponentInputSchema).default([]),
    append: z.array(ComponentInputSchema).default([]),
    constraints: z.array(Constraint).default([]),
    context: z.record(z.unknown()).default({}),
    seo: SeoMetadataSchema.optional(),
    metadata: z.record(z.unknown()).default({}),
    permissions: z.array(PermissionPolicySchema).default([]),
    workflow: WorkflowStateSchema.default({}),
    contentType: z.string().default("page"),
  })
  .passthrough();

export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;
export type PermissionPolicy = z.infer<typeof PermissionPolicySchema>;
export type SeoMetadata = z.infer<typeof SeoMetadataSchema>;
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;
export type LocalizationBundle = z.infer<typeof LocalizationBundleSchema>;
export type MediaAsset = z.infer<typeof MediaAssetSchema>;
export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;
export type ContentTypeDefinition = z.infer<typeof ContentTypeSchema>;
export type ComponentInput = z.infer<typeof ComponentInputSchema>;
export type CmsBlockDocument = z.infer<typeof CmsBlockSchema>;
export type CmsPageDocument = z.infer<typeof CmsPageSchema>;

export function defineField(input: FieldDefinition): FieldDefinition {
  return FieldDefinitionSchema.parse(input);
}

export function defineContentType(input: ContentTypeDefinition): ContentTypeDefinition {
  return ContentTypeSchema.parse(input);
}

export function defineBlock(input: CmsBlockDocument): CmsBlockDocument {
  return CmsBlockSchema.parse(input);
}

export const RuntimeBlockSchema = Block;
export const RuntimePageSchema = PageV2;
export const RuntimeComponentSchema = ComponentInstance;
