import React from "react";
import Link from "next/link";
import { z } from "zod";

export const CTAPropsSchema = z.object({
  label: z.string(),
  href: z.string().optional(),
  variant: z.enum(['primary', 'secondary', 'outline']).default('primary'),
  size: z.enum(['sm', 'md', 'lg']).default('md')
});

export type CTAProps = z.infer<typeof CTAPropsSchema>;

export default function CTA({ label, href, variant, size }: CTAProps): JSX.Element {
  const base = "inline-flex items-center justify-center rounded font-medium transition-colors";
  const variants: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600",
    outline: "border border-gray-300 text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-800",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <Link href={href|| "#"} className={`${base} ${variants[variant]} ${sizes[size]}`}>
      {label}
    </Link>
  );
}
