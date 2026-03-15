import { z } from "zod";

export const SEOPropsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  ogImage: z.string().optional(),
});
export type SEOProps = z.infer<typeof SEOPropsSchema>;

// In this demo, SEO just renders nothing. In your app, wire this into <Head> or Next SEO helpers.
export default function SEO(_props: SEOProps): null {
  return null;
}
