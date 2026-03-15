import { z } from "zod";

export const VisibilitySchema = z.object({
  roleIn: z.array(z.string()).optional(),
  featureFlag: z.string().optional(),
  whenEnv: z.array(z.enum(["development", "preview", "production"])).optional(),
});

// Define the schema first with a type assertion
export const ComponentInstanceSchema = z.object({
  key: z.string().min(1),
  type: z.string().min(1),     // must exist in registry
  props: z.record(z.any()).default({}),
  children: z.lazy(() => z.array(z.any()).optional()),
  visible: VisibilitySchema.optional(),
}) as z.ZodType<{
  key: string;
  type: string;
  props: Record<string, unknown>;
  children?: Array<z.infer<typeof ComponentInstanceSchema>>;
  visible?: z.infer<typeof VisibilitySchema>;
}>;

// Then define the type based on the schema
export type ComponentInstance = z.infer<typeof ComponentInstanceSchema>;

export const PageDefinitionSchema = z.object({
  version: z.literal(1),
  seoRef: z.object({ type: z.string(), id: z.string() }).optional(),
  components: z.array(ComponentInstanceSchema),
  guards: z.array(z.string()).optional(),       // e.g., "auth:admin", "flag:beta"
  featureFlags: z.array(z.string()).optional(),
});

export type PageDefinition = z.infer<typeof PageDefinitionSchema>;