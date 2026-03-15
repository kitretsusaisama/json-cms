import { z } from "zod";

export const ComponentKey = z.enum(["Hero", "ProductGrid", "CTA", "RichText", "FAQ", "Newsletter"]);

export const ComponentInstance = z.object({
  key: z.string().optional(),
  type: ComponentKey,
  props: z.record(z.any()).default({}),
});

export const PageSchema = z.object({
  version: z.number().optional(),
  seoRef: z.object({ type: z.string(), id: z.string() }).optional(),
  components: z.array(ComponentInstance),
}).passthrough();

export type ComponentInstanceSpec = z.infer<typeof ComponentInstance>;
export type PageSpec = z.infer<typeof PageSchema>;
