/**
 * Plugin SDK — Manifest Validation
 *
 * Validates plugin.json manifests using Zod with clear error messages.
 * The schema mirrors SdkPluginManifest exactly.
 */

import { z } from "zod";
import { ContentTypeSchema } from "@/core/content/schemas";

const ComponentDefSchema = z.object({
  key: z
    .string()
    .regex(/^[A-Z][A-Za-z0-9]+$/, "Component key must be PascalCase (e.g., MyComponent)")
    .max(64, "Component key must be ≤ 64 characters"),
  path: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
  category: z
    .enum(["layout", "content", "media", "commerce", "form", "analytics", "custom"])
    .optional(),
  propsSchema: z.record(z.unknown()).optional(),
  exampleProps: z.record(z.unknown()).optional(),
  iconUrl: z.string().url("iconUrl must be a valid URL").optional(),
});

const RendererDefSchema = z.object({
  schemaType: z.string().min(1),
  componentKey: z.string().min(1),
  priority: z.number().int().min(0).max(1000).optional(),
});

const HookDefSchema = z.object({
  name: z.string().min(1),
  handler: z.string().min(1),
  priority: z.number().int().min(0).max(1000).default(100),
});

const RouteDefSchema = z.object({
  path: z.string().min(1).startsWith("/", "Route path must start with /"),
  component: z.string().min(1),
  layout: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

const ApiDefSchema = z.object({
  path: z.string().min(1),
  methods: z.array(z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"])).min(1),
  handler: z.string().min(1),
  permissions: z.array(z.string()).optional(),
  rateLimit: z
    .object({
      requests: z.number().int().positive(),
      windowMs: z.number().int().positive(),
    })
    .optional(),
});

const PermissionDefSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  resource: z.string().min(1),
  actions: z.array(z.string()).min(1),
});

const ConfigFieldSchema = z.object({
  type: z.enum(["string", "number", "boolean", "object", "array"]),
  label: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  enum: z.array(z.unknown()).optional(),
  secret: z.boolean().optional(),
});

const EnginesSchema = z.object({
  "json-cms": z.string().optional(),
  node: z.string().optional(),
});

const AuthorSchema = z.union([
  z.string().min(1),
  z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    url: z.string().url().optional(),
  }),
]);

export const PluginManifestSchema = z.object({
  name: z
    .string()
    .regex(
      /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/,
      "Plugin name must be a valid npm package name (optionally scoped)"
    )
    .max(214, "Plugin name must be ≤ 214 characters"),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, "Version must be valid semver (e.g., 1.0.0)"),
  description: z.string().min(1, "Description is required").max(500),
  author: AuthorSchema,
  license: z.string().optional(),
  homepage: z.string().url("homepage must be a valid URL").optional(),
  repository: z
    .union([
      z.string(),
      z.object({ type: z.string(), url: z.string() }),
    ])
    .optional(),
  keywords: z.array(z.string()).max(20).optional(),
  cms: z.object({
    components: z.array(ComponentDefSchema).optional(),
    contentTypes: z.array(ContentTypeSchema).optional(),
    renderers: z.array(RendererDefSchema).optional(),
    hooks: z.array(HookDefSchema).optional(),
    routes: z.array(RouteDefSchema).optional(),
    api: z.array(ApiDefSchema).optional(),
    permissions: z.array(PermissionDefSchema).optional(),
    configSchema: z.record(ConfigFieldSchema).optional(),
  }),
  engines: EnginesSchema.optional(),
  peerDependencies: z.record(z.string()).optional(),
  dependencies: z.record(z.string()).optional(),
});

export type ValidatedManifest = z.infer<typeof PluginManifestSchema>;

export interface ManifestValidationResult {
  valid: boolean;
  manifest?: ValidatedManifest;
  errors: string[];
}

/**
 * Validate a plugin manifest object.
 * Returns structured errors with actionable messages.
 */
export function validateManifest(raw: unknown): ManifestValidationResult {
  const result = PluginManifestSchema.safeParse(raw);

  if (result.success) {
    return { valid: true, manifest: result.data, errors: [] };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  return { valid: false, errors };
}

/**
 * Validate a plugin manifest and throw on failure.
 * Useful for programmatic plugin loading.
 */
export function assertValidManifest(raw: unknown): ValidatedManifest {
  const result = validateManifest(raw);
  if (!result.valid || !result.manifest) {
    throw new Error(
      `Invalid plugin manifest:\n${result.errors.map((e) => `  - ${e}`).join("\n")}`
    );
  }
  return result.manifest;
}


