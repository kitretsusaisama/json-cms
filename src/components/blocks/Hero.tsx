import React from "react";
import Link from "next/link";
import { z } from "zod";

export const HeroPropsSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  image: z.string().optional(),
  ctaText: z.string().optional(),
  ctaHref: z.string().optional(),
});

export type HeroProps = z.infer<typeof HeroPropsSchema>;

export default function Hero({ title, subtitle, image, ctaText, ctaHref }: HeroProps): JSX.Element {
  return (
    <section className="hero">
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-4xl font-bold">{title}</h1>
        {subtitle && <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">{subtitle}</p>}
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="mx-auto mt-6 max-h-96 rounded" src={image} alt={title} />
        )}
        {ctaText && ctaHref && (
          <Link href={ctaHref || "#"} className="inline-block mt-6 px-6 py-3 rounded bg-blue-600 text-white hover:bg-blue-700">
            {ctaText}
          </Link>
        )}
      </div>
    </section>
  );
}
